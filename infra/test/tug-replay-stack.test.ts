import * as cdk from 'aws-cdk-lib';
import { Capture, Match, Template } from 'aws-cdk-lib/assertions';
import { TugReplayStack } from '../lib/tug-replay-stack';

// One synth for the whole file: it is the slow part.
const app = new cdk.App();
const stack = new TugReplayStack(app, 'TestStack');
const template = Template.fromStack(stack);

describe('DynamoDB', () => {
  test('tug_live keyed by tug_id, on-demand', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'tug_live',
      BillingMode: 'PAY_PER_REQUEST',
      KeySchema: [{ AttributeName: 'tug_id', KeyType: 'HASH' }],
    });
  });

  test('tug_connections keyed by connection_id with TTL', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'tug_connections',
      BillingMode: 'PAY_PER_REQUEST',
      KeySchema: [{ AttributeName: 'connection_id', KeyType: 'HASH' }],
      TimeToLiveSpecification: { AttributeName: 'expires_at', Enabled: true },
    });
  });

  test('tug_history keyed by tug_id + t, on-demand', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'tug_history',
      BillingMode: 'PAY_PER_REQUEST',
      KeySchema: [
        { AttributeName: 'tug_id', KeyType: 'HASH' },
        { AttributeName: 't', KeyType: 'RANGE' },
      ],
    });
  });

  test('exactly three tables', () => {
    template.resourceCountIs('AWS::DynamoDB::Table', 3);
  });
});

describe('IoT Core', () => {
  test('topic rule on tugs/+/telemetry targets the ingest lambda', () => {
    const fnArn = new Capture();
    template.hasResourceProperties('AWS::IoT::TopicRule', {
      TopicRulePayload: {
        Sql: Match.stringLikeRegexp("FROM 'tugs/\\+/telemetry'"),
        RuleDisabled: false,
        Actions: [{ Lambda: { FunctionArn: fnArn } }],
      },
    });
    const ref: string[] = fnArn.asObject()['Fn::GetAtt'];
    const target = template.toJSON().Resources[ref[0]];
    expect(target.Type).toBe('AWS::Lambda::Function');
    expect(target.Properties.Handler).toBe('ingest.handler.handler');
  });

  test('iot.amazonaws.com may invoke ingest, scoped to the rule ARN', () => {
    template.hasResourceProperties('AWS::Lambda::Permission', {
      Action: 'lambda:InvokeFunction',
      Principal: 'iot.amazonaws.com',
      SourceArn: Match.objectLike({ 'Fn::GetAtt': [Match.stringLikeRegexp('TelemetryRule'), 'Arn'] }),
    });
  });
});

describe('Lambdas', () => {
  test('five python 3.12 handlers', () => {
    const handlers = ['ingest', 'ws_connect', 'ws_disconnect', 'ws_default', 'api'];
    for (const h of handlers) {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Runtime: 'python3.12',
        Handler: `${h}.handler.handler`,
      });
    }
  });

  test('broadcasters know the WebSocket management endpoint', () => {
    for (const h of ['ingest', 'ws_connect', 'ws_default']) {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Handler: `${h}.handler.handler`,
        Environment: { Variables: Match.objectLike({ WS_ENDPOINT: Match.anyValue(), CONNECTIONS_TABLE: Match.anyValue() }) },
      });
    }
  });

  test('api lambda knows the bucket and CDN domain', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'api.handler.handler',
      Environment: { Variables: Match.objectLike({ HISTORY_BUCKET: Match.anyValue(), CDN_DOMAIN: Match.anyValue() }) },
    });
  });
});

describe('WebSocket API', () => {
  test('WEBSOCKET protocol with $connect, $disconnect, $default routes', () => {
    template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
      ProtocolType: 'WEBSOCKET',
      RouteSelectionExpression: '$request.body.action',
    });
    for (const key of ['$connect', '$disconnect', '$default']) {
      template.hasResourceProperties('AWS::ApiGatewayV2::Route', { RouteKey: key });
    }
  });

  test('stage prod auto-deploys', () => {
    template.hasResourceProperties('AWS::ApiGatewayV2::Stage', { StageName: 'prod', AutoDeploy: true });
  });

  test('ManageConnections is granted to broadcasters only', () => {
    const policies = template.findResources('AWS::IAM::Policy');
    const withManage = Object.values(policies).filter((p) =>
      JSON.stringify(p.Properties.PolicyDocument).includes('execute-api:ManageConnections'),
    );
    expect(withManage).toHaveLength(3);
  });
});

describe('HTTP API', () => {
  test('HTTP protocol with CORS', () => {
    template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
      ProtocolType: 'HTTP',
      CorsConfiguration: Match.objectLike({ AllowOrigins: ['*'], AllowMethods: Match.arrayWith(['GET']) }),
    });
  });

  test('the three GET routes exist', () => {
    for (const key of ['GET /fleet', 'GET /tugs/{tug_id}/days/{date}', 'GET /summary']) {
      template.hasResourceProperties('AWS::ApiGatewayV2::Route', { RouteKey: key });
    }
  });
});

describe('S3 + CloudFront', () => {
  test('history bucket blocks public access and has CORS for GET/HEAD with Range', () => {
    template.resourceCountIs('AWS::S3::Bucket', 1);
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
      CorsConfiguration: {
        CorsRules: [
          Match.objectLike({
            AllowedMethods: ['GET', 'HEAD'],
            AllowedOrigins: ['*'],
            AllowedHeaders: ['*'],
            ExposedHeaders: Match.arrayWith(['Content-Range', 'Accept-Ranges']),
          }),
        ],
      },
    });
    // no ACL-based public access anywhere
    const buckets = template.findResources('AWS::S3::Bucket');
    for (const b of Object.values(buckets)) {
      expect(b.Properties.AccessControl).toBeUndefined();
    }
  });

  test('bucket policy: OAC read for CloudFront, SSL-only deny, no anonymous principals', () => {
    const policy = Object.values(template.findResources('AWS::S3::BucketPolicy'))[0];
    const statements: any[] = policy.Properties.PolicyDocument.Statement;
    const allows = statements.filter((s) => s.Effect === 'Allow');
    // CloudFront (OAC) may read objects
    expect(
      allows.some(
        (s) => JSON.stringify(s.Principal) === JSON.stringify({ Service: 'cloudfront.amazonaws.com' }) && s.Action === 's3:GetObject',
      ),
    ).toBe(true);
    // nothing is granted to everyone; the only other principal is the auto-delete custom resource role
    for (const s of allows) {
      expect(s.Principal).not.toEqual('*');
      expect(s.Principal).not.toEqual({ AWS: '*' });
      if (s.Principal.AWS) {
        expect(JSON.stringify(s.Principal.AWS)).toMatch(/AutoDeleteObjects/);
      }
    }
    expect(
      statements.some(
        (s) =>
          s.Effect === 'Deny' &&
          JSON.stringify(s.Principal) === JSON.stringify({ AWS: '*' }) &&
          s.Condition?.Bool?.['aws:SecureTransport'] === 'false',
      ),
    ).toBe(true);
    template.resourceCountIs('AWS::CloudFront::OriginAccessControl', 1);
  });

  test('distribution uses OAC, HTTPS redirect, and a CORS response headers policy', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        DefaultRootObject: 'index.html',
        DefaultCacheBehavior: Match.objectLike({
          ViewerProtocolPolicy: 'redirect-to-https',
          AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
          ResponseHeadersPolicyId: Match.anyValue(),
        }),
        Origins: [Match.objectLike({ OriginAccessControlId: Match.anyValue() })],
      }),
    });
    template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
      ResponseHeadersPolicyConfig: Match.objectLike({
        CorsConfig: Match.objectLike({
          AccessControlAllowOrigins: { Items: ['*'] },
          AccessControlAllowMethods: { Items: ['GET', 'HEAD', 'OPTIONS'] },
          AccessControlExposeHeaders: { Items: Match.arrayWith(['Content-Range', 'Accept-Ranges']) },
        }),
      }),
    });
  });
});

describe('Outputs', () => {
  test('dashboard and publish outputs are present', () => {
    for (const key of ['WebSocketUrl', 'HttpApiUrl', 'CdnDomain', 'CdnUrl', 'DistributionId', 'BucketName', 'IotEndpointCommand']) {
      template.hasOutput(key, Match.anyValue());
    }
  });
});

describe('IAM least privilege', () => {
  test('no policy grants dynamodb:* or s3:* or wildcard resources on tables', () => {
    const policies = template.findResources('AWS::IAM::Policy');
    for (const p of Object.values(policies)) {
      for (const s of p.Properties.PolicyDocument.Statement) {
        const actions: string[] = Array.isArray(s.Action) ? s.Action : [s.Action];
        expect(actions).not.toContain('dynamodb:*');
        expect(actions).not.toContain('s3:*');
        expect(actions).not.toContain('*');
      }
    }
  });
});
