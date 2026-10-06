import * as path from 'node:path';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as iot from 'aws-cdk-lib/aws-iot';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';

/** Dataset metadata served in the fleet snapshot (contract section 2). Mirrors config.yaml. */
export interface TugReplayStackProps extends cdk.StackProps {
  readonly replaySpeedup?: number;
  readonly datasetStart?: string;
  readonly datasetEnd?: string;
  readonly datasetSource?: string;
  /** Days a tug_history row is kept before DynamoDB TTL removes it. */
  readonly historyTtlDays?: number;
}

const LAMBDAS_DIR = path.join(__dirname, '..', 'lambdas');

export class TugReplayStack extends cdk.Stack {
  public readonly liveTable: dynamodb.Table;
  public readonly connectionsTable: dynamodb.Table;
  public readonly historyTable: dynamodb.Table;
  public readonly historyBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly webSocketApi: apigwv2.WebSocketApi;
  public readonly httpApi: apigwv2.HttpApi;

  constructor(scope: Construct, id: string, props: TugReplayStackProps = {}) {
    super(scope, id, props);

    const speedup = props.replaySpeedup ?? 120;
    const datasetStart = props.datasetStart ?? '2024-12-02';
    const datasetEnd = props.datasetEnd ?? '2024-12-08';
    const datasetSource = props.datasetSource ?? 'NOAA AIS';
    const historyTtlDays = props.historyTtlDays ?? 14;

    // ------------------------------------------------------------------ DynamoDB
    this.liveTable = new dynamodb.Table(this, 'TugLive', {
      tableName: 'tug_live',
      partitionKey: { name: 'tug_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.connectionsTable = new dynamodb.Table(this, 'TugConnections', {
      tableName: 'tug_connections',
      partitionKey: { name: 'connection_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'expires_at',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.historyTable = new dynamodb.Table(this, 'TugHistory', {
      tableName: 'tug_history',
      partitionKey: { name: 'tug_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 't', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'expires_at',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ------------------------------------------------------------------ S3 + CloudFront
    // Holds tugdays/{tug_id}/{date}.json, summary.json, fleet.json, recordings/{tug_id}/{date}.rrd
    // and (optionally) the static dashboard export under /. Private bucket; CloudFront reads via OAC.
    this.historyBucket = new s3.Bucket(this, 'History', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag', 'Content-Length', 'Content-Range', 'Accept-Ranges'],
          maxAge: 3600,
        },
      ],
    });

    // CORS for the dashboard (fetch) and the Rerun web viewer (range requests on .rrd files).
    const corsPolicy = new cloudfront.ResponseHeadersPolicy(this, 'CorsHeaders', {
      comment: 'tug-replay: allow GET/HEAD with Range from any origin',
      corsBehavior: {
        accessControlAllowOrigins: ['*'],
        accessControlAllowMethods: ['GET', 'HEAD', 'OPTIONS'],
        accessControlAllowHeaders: ['*'],
        accessControlExposeHeaders: ['ETag', 'Content-Length', 'Content-Range', 'Accept-Ranges'],
        accessControlAllowCredentials: false,
        accessControlMaxAge: cdk.Duration.hours(1),
        originOverride: true,
      },
    });

    // Static-export friendly routing: /tugs/ -> /tugs/index.html, /tugs -> /tugs.html
    const rewrite = new cloudfront.Function(this, 'IndexRewrite', {
      comment: 'tug-replay: map directory and extensionless URIs to Next.js static export files',
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var req = event.request;
  var uri = req.uri;
  if (uri.endsWith('/')) {
    req.uri = uri + 'index.html';
  } else if (!uri.split('/').pop().includes('.')) {
    req.uri = uri + '.html';
  }
  return req;
}`),
    });

    this.distribution = new cloudfront.Distribution(this, 'Cdn', {
      comment: 'tug-replay: history files, Rerun recordings and the static dashboard',
      defaultRootObject: 'index.html',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.historyBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
        responseHeadersPolicy: corsPolicy,
        functionAssociations: [
          { function: rewrite, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST },
        ],
      },
    });

    // ------------------------------------------------------------------ Lambdas
    // One asset for all handlers so `common/` is importable as a package; each function
    // points at its own module. Handlers are tiny, so the shared asset is a few KB.
    const code = lambda.Code.fromAsset(LAMBDAS_DIR, {
      exclude: ['tests', 'tests/**', '**/__pycache__', '**/*.pyc', '.pytest_cache'],
    });

    const sharedEnv: Record<string, string> = {
      LIVE_TABLE: this.liveTable.tableName,
      CONNECTIONS_TABLE: this.connectionsTable.tableName,
      HISTORY_TABLE: this.historyTable.tableName,
      REPLAY_SPEEDUP: String(speedup),
      DATASET_START: datasetStart,
      DATASET_END: datasetEnd,
      DATASET_SOURCE: datasetSource,
      HISTORY_TTL_DAYS: String(historyTtlDays),
    };

    const makeFn = (name: string, module: string, extra: Partial<lambda.FunctionProps> = {}) =>
      new lambda.Function(this, name, {
        runtime: lambda.Runtime.PYTHON_3_12,
        architecture: lambda.Architecture.ARM_64,
        handler: `${module}.handler.handler`,
        code,
        memorySize: 256,
        timeout: cdk.Duration.seconds(10),
        logGroup: new logs.LogGroup(this, `${name}Logs`, {
          retention: logs.RetentionDays.ONE_WEEK,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
        description: `tug-replay ${module}`,
        ...extra,
        environment: { ...sharedEnv, ...(extra.environment ?? {}) },
      });

    const ingestFn = makeFn('IngestFn', 'ingest');
    const wsConnectFn = makeFn('WsConnectFn', 'ws_connect');
    const wsDisconnectFn = makeFn('WsDisconnectFn', 'ws_disconnect');
    const wsDefaultFn = makeFn('WsDefaultFn', 'ws_default');
    const apiFn = makeFn('ApiFn', 'api', {
      environment: {
        HISTORY_BUCKET: this.historyBucket.bucketName,
        CDN_DOMAIN: this.distribution.distributionDomainName,
      },
    });

    // ------------------------------------------------------------------ WebSocket API
    this.webSocketApi = new apigwv2.WebSocketApi(this, 'WsApi', {
      apiName: 'tug-replay-ws',
      description: 'Pushes tug telemetry to the dashboard',
      connectRouteOptions: {
        integration: new integrations.WebSocketLambdaIntegration('ConnectIntegration', wsConnectFn),
      },
      disconnectRouteOptions: {
        integration: new integrations.WebSocketLambdaIntegration('DisconnectIntegration', wsDisconnectFn),
      },
      defaultRouteOptions: {
        integration: new integrations.WebSocketLambdaIntegration('DefaultIntegration', wsDefaultFn),
      },
    });

    const wsStage = new apigwv2.WebSocketStage(this, 'WsStage', {
      webSocketApi: this.webSocketApi,
      stageName: 'prod',
      autoDeploy: true,
      throttle: { rateLimit: 500, burstLimit: 1000 },
    });

    // Broadcasters need the management endpoint (https://.../prod) and ManageConnections.
    for (const fn of [ingestFn, wsConnectFn, wsDefaultFn]) {
      fn.addEnvironment('WS_ENDPOINT', wsStage.callbackUrl);
      wsStage.grantManagementApiAccess(fn);
    }

    // ------------------------------------------------------------------ IAM (table-specific)
    this.liveTable.grantWriteData(ingestFn);
    this.historyTable.grantWriteData(ingestFn);
    this.connectionsTable.grantReadWriteData(ingestFn); // scan + delete stale connections

    this.connectionsTable.grantWriteData(wsConnectFn);
    this.connectionsTable.grantWriteData(wsDisconnectFn);

    this.liveTable.grantReadData(wsDefaultFn);
    this.connectionsTable.grantWriteData(wsDefaultFn); // delete on GoneException

    this.liveTable.grantReadData(apiFn);
    this.historyBucket.grantRead(apiFn, 'summary.json');
    this.historyBucket.grantRead(apiFn, 'tugdays/*');

    // $connect cannot post to its own connection before it returns, so it asks ws_default
    // (asynchronously) to push the snapshot once the socket is open.
    wsDefaultFn.grantInvoke(wsConnectFn);
    wsConnectFn.addEnvironment('SNAPSHOT_FUNCTION', wsDefaultFn.functionName);

    // ------------------------------------------------------------------ IoT Core rule
    const topicRule = new iot.CfnTopicRule(this, 'TelemetryRule', {
      ruleName: 'tug_replay_telemetry',
      topicRulePayload: {
        description: 'Relay tug telemetry to the ingest Lambda',
        awsIotSqlVersion: '2016-03-23',
        sql: "SELECT *, topic(2) AS _topic_tug_id FROM 'tugs/+/telemetry'",
        ruleDisabled: false,
        actions: [{ lambda: { functionArn: ingestFn.functionArn } }],
      },
    });

    ingestFn.addPermission('IotInvoke', {
      principal: new iam.ServicePrincipal('iot.amazonaws.com'),
      action: 'lambda:InvokeFunction',
      sourceArn: topicRule.attrArn,
      sourceAccount: this.account,
    });

    // ------------------------------------------------------------------ HTTP API
    this.httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      apiName: 'tug-replay-http',
      description: 'Fleet snapshot, tug-day files and the battery sweep summary',
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [apigwv2.CorsHttpMethod.GET, apigwv2.CorsHttpMethod.HEAD, apigwv2.CorsHttpMethod.OPTIONS],
        allowHeaders: ['Content-Type', 'Range'],
        exposeHeaders: ['Content-Length', 'Content-Range', 'Accept-Ranges', 'ETag'],
        maxAge: cdk.Duration.hours(1),
      },
    });

    const apiIntegration = new integrations.HttpLambdaIntegration('ApiIntegration', apiFn);
    for (const route of ['/fleet', '/tugs/{tug_id}/days/{date}', '/summary']) {
      this.httpApi.addRoutes({
        path: route,
        methods: [apigwv2.HttpMethod.GET],
        integration: apiIntegration,
      });
    }

    // ------------------------------------------------------------------ Outputs
    new cdk.CfnOutput(this, 'WebSocketUrl', {
      value: wsStage.url,
      description: 'NEXT_PUBLIC_WS_URL for the dashboard',
    });
    new cdk.CfnOutput(this, 'HttpApiUrl', {
      value: this.httpApi.apiEndpoint,
      description: 'NEXT_PUBLIC_API_URL for the dashboard (no trailing slash)',
    });
    new cdk.CfnOutput(this, 'CdnDomain', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront domain serving history files, recordings and the static dashboard',
    });
    new cdk.CfnOutput(this, 'CdnUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'NEXT_PUBLIC_CDN_URL for the dashboard',
    });
    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      description: 'Pass to scripts/publish_static.py --distribution for cache invalidation',
    });
    new cdk.CfnOutput(this, 'BucketName', {
      value: this.historyBucket.bucketName,
      description: 'Pass to scripts/publish_static.py --bucket',
    });
    new cdk.CfnOutput(this, 'IotEndpointCommand', {
      value: `aws iot describe-endpoint --endpoint-type iot:Data-ATS --region ${this.region} --query endpointAddress --output text`,
      description: 'Run this to get the MQTT endpoint for the replayer (IoT endpoints are per account, not per stack)',
    });
    new cdk.CfnOutput(this, 'IotTopicRule', {
      value: topicRule.ref,
      description: 'IoT rule relaying tugs/+/telemetry to the ingest Lambda',
    });
  }
}
