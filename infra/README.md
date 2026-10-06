# infra: cloud backend for the tug fleet replay

One CDK stack (`TugReplayStack`) that turns MQTT telemetry from the Python replayer into a live
WebSocket feed for the dashboard, keeps a short history, and serves the precomputed tug-day files
and Rerun recordings over CloudFront. Everything is serverless and on-demand; an idle stack costs
roughly nothing.

```
replayer (pipeline, awsiotsdk)                          dashboard (Next.js)
   | MQTT  tugs/{tug_id}/telemetry                          ^   wss://  {"type":"telemetry"|"snapshot"}
   v                                                        |
IoT Core topic rule  tugs/+/telemetry  ---> Lambda ingest --+--> API Gateway WebSocket ($connect/$disconnect/$default)
                                               |                   ^ snapshot on connect (ws_connect -> ws_default)
                                               v
                       DynamoDB tug_live (pk tug_id)       tug_connections (pk connection_id, TTL)
                                tug_history (pk tug_id, sk t, TTL 14 d)
                                               ^
API Gateway HTTP API ---> Lambda api ----------+   GET /fleet | /tugs/{tug_id}/days/{date} | /summary
                                               |
                                               v
S3 history bucket  <--- CloudFront (OAC, CORS, Range)   tugdays/{tug_id}/{date}.json  summary.json  fleet.json
                                                         recordings/{tug_id}/{date}.rrd  (+ the static dashboard at /)
```

Message and API shapes are defined in [`docs/CONTRACT.md`](../docs/CONTRACT.md). Latency from MQTT
publish to browser is typically 200 to 600 ms (IoT rule, one Lambda, one `post_to_connection`), well
inside the 2 s budget.

## Layout

```
infra/
  bin/infra.ts                 CDK app (environment-agnostic, no lookups)
  lib/tug-replay-stack.ts      the stack
  lambdas/
    common/                    config, boto3 client factories, DynamoDB (de)serialisation,
                               table wrappers, snapshot builder, WebSocket broadcaster
    ingest/handler.py          IoT rule target: write tug_live + tug_history, broadcast
    ws_connect/handler.py      $connect: register connection, request snapshot push
    ws_disconnect/handler.py   $disconnect: remove connection
    ws_default/handler.py      $default: {"action":"snapshot"|"ping"}; also pushes the post-connect snapshot
    api/handler.py             HTTP API routes
    tests/                     pytest with fake boto3 clients (no network, no moto)
  scripts/publish_static.py    sync data/processed/site/ to S3 + CloudFront invalidation
  scripts/iot_provision.sh     IoT thing + certificate + policy for the replayer -> infra/.certs/
  test/                        Jest assertions on the synthesized template
```

All five Lambdas share one small asset (the `lambdas/` directory, tests excluded) so `common/` is a
normal package import; each function's handler is `<module>.handler.handler`. Runtime is Python
3.12 on arm64 with only boto3 (bundled in the runtime).

## Prerequisites

- Node 22, Python 3.12+ with [`uv`](https://docs.astral.sh/uv/), AWS CLI v2.
- An AWS account with credentials in your shell (`aws sts get-caller-identity` works).
- CDK bootstrap, once per account/region: `npx cdk bootstrap` (from `infra/`).

No global installs: `aws-cdk` is a devDependency, run it with `npx cdk ...` or the npm scripts.

## Deploy

```bash
cd infra
npm ci
npm run deploy          # cdk deploy --require-approval never --outputs-file outputs.json
```

Takes 4 to 6 minutes the first time (CloudFront). `outputs.json` then holds:

| Output | Use |
| --- | --- |
| `WebSocketUrl` | `wss://.../prod`, dashboard `NEXT_PUBLIC_WS_URL` |
| `HttpApiUrl` | `https://...amazonaws.com`, dashboard `NEXT_PUBLIC_API_URL` |
| `CdnUrl` / `CdnDomain` | `https://d....cloudfront.net`, dashboard `NEXT_PUBLIC_CDN_URL`; also serves the static dashboard |
| `BucketName`, `DistributionId` | read automatically by `scripts/publish_static.py` |
| `IotEndpointCommand` | the CLI command that prints your account's MQTT endpoint (IoT endpoints are per account, not per stack) |
| `IotTopicRule` | name of the rule relaying `tugs/+/telemetry` |

### Dashboard environment

Paste into `dashboard/.env.local` (or Vercel project settings):

```
NEXT_PUBLIC_DATA_MODE=ws
NEXT_PUBLIC_WS_URL=<WebSocketUrl>
NEXT_PUBLIC_API_URL=<HttpApiUrl>
NEXT_PUBLIC_CDN_URL=<CdnUrl>
```

`NEXT_PUBLIC_CDN_URL` is the base for `recording_url` and the tug-day files
(`${NEXT_PUBLIC_CDN_URL}/tugdays/{tug_id}/{date}.json`, `${NEXT_PUBLIC_CDN_URL}/recordings/{tug_id}/{date}.rrd`).
The Rerun web viewer can load the `.rrd` URL directly: CloudFront answers with
`Access-Control-Allow-Origin: *`, exposes `Content-Range`/`Accept-Ranges`, and passes `Range` requests to S3.

### Replayer credentials (IoT)

```bash
infra/scripts/iot_provision.sh          # creates thing tug-replayer, cert, policy; writes infra/.certs/
source infra/.certs/replayer.env        # TUG_IOT_ENDPOINT, TUG_IOT_CLIENT_ID, TUG_IOT_CERT, TUG_IOT_KEY, TUG_IOT_CA
```

The policy allows exactly `iot:Connect` as client id `tug-replayer*` and `iot:Publish` to
`tugs/*/telemetry`. `infra/.certs/` is gitignored; re-running the script reuses the files.
Connect with `awsiotsdk` (`mqtt_connection_builder.mtls_from_path`) on port 8883 and publish one
JSON message (contract section 1) per tug per tick with QoS 0.

The IoT rule adds `_topic_tug_id` (from the topic) to the payload; `ingest` uses it when `tug_id`
is missing and rejects messages whose `tug_id` does not match the topic.

### Static data

After the pipeline has written `data/processed/site/` (`fleet.json`, `summary.json`, `tugdays/`,
`recordings/`):

```bash
uv run --with boto3 python infra/scripts/publish_static.py            # reads bucket + distribution from infra/outputs.json
uv run --with boto3 python infra/scripts/publish_static.py --delete   # also remove tug-days/recordings that disappeared locally
```

`.json` is uploaded as `application/json` (max-age 60), `.rrd` as `application/octet-stream`
(max-age 3600). Unchanged files (MD5 = ETag) are skipped; only changed paths are invalidated.

## APIs

WebSocket (`WebSocketUrl`):

| Direction | Message |
| --- | --- |
| server -> client on connect | `{"type":"snapshot","data":<fleet snapshot>}` (contract section 2) |
| server -> client per telemetry | `{"type":"telemetry","data":<telemetry>}` |
| client -> server | `{"action":"snapshot"}` to re-request the snapshot; `{"action":"ping"}` -> `{"type":"pong"}` |

HTTP (`HttpApiUrl`, CORS `*`):

| Route | Returns |
| --- | --- |
| `GET /fleet` | fleet snapshot from `tug_live` |
| `GET /tugs/{tug_id}/days/{date}` | `302` to `https://<CdnDomain>/tugdays/{tug_id}/{date}.json`, `404` if the file is not published |
| `GET /summary` | `summary.json` as published |
| `GET /summary?battery_kwh=5200` | `{dataset, default_battery_kwh, requested_battery_kwh, battery_kwh, row, assumptions}` with the nearest sweep row |

## Tests and synth (no AWS credentials needed)

```bash
cd infra && npm test                                                  # Jest: aws-cdk-lib/assertions on the template
cd infra && npx cdk synth --quiet                                     # environment-agnostic stack, no lookups
uv run --with pytest --with boto3 pytest infra/lambdas/tests          # from the repo root
```

CI (`.github/workflows/ci.yml`) runs the pipeline tests, the dashboard lint/build and all of the
above on every push and pull request. `deploy.yml` is a manual workflow that assumes an OIDC role
(`AWS_DEPLOY_ROLE_ARN` secret), deploys the stack, publishes the static data and uploads the
dashboard's static export to the same bucket. Hosting the dashboard on Vercel instead is simpler:
import `dashboard/`, set the four `NEXT_PUBLIC_*` variables, and run `deploy.yml` with
`deploy_dashboard` unchecked.

## IAM

Each Lambda has its own role with only what it uses:

| Lambda | DynamoDB | Other |
| --- | --- | --- |
| ingest | write `tug_live`, write `tug_history`, read+write `tug_connections` | `execute-api:ManageConnections` on the WS stage |
| ws_connect | write `tug_connections` | `lambda:InvokeFunction` on ws_default, ManageConnections |
| ws_disconnect | write `tug_connections` | |
| ws_default | read `tug_live`, write `tug_connections` | ManageConnections |
| api | read `tug_live` | `s3:GetObject` on `summary.json` and `tugdays/*` |

The bucket blocks all public access; CloudFront reads through an Origin Access Control and the
bucket policy also denies non-TLS requests. IoT Core may invoke `ingest` only from the one topic rule.

## Costs

Everything is pay-per-request with no idle charge: on-demand DynamoDB, Lambda, API Gateway v2,
IoT Core, S3, CloudFront (its always-free tier covers 1 TB and 10 M requests a month). An idle
stack costs well under $1/month (S3 storage for ~100 recordings, a few MB of CloudWatch logs).

The variable cost is per telemetry message. List prices (us-west-2, late 2026, rounded) per
**one million messages**:

| Component | $/M messages |
| --- | --- |
| IoT Core messaging + rule + action | 1.30 |
| Lambda `ingest` (256 MB arm64, ~100 ms) | 0.55 (the first 1 M requests/month are free) |
| DynamoDB: 2 writes (`tug_live`, `tug_history`) | 1.25 |
| WebSocket messages, per connected viewer | 1.00 |
| **Total with one viewer** | **about 4.1** |

Volume is what you choose in `config.yaml`: 12 tugs at `tick_s: 1` is 12 msg/s, about 1 M
messages a day. Scenarios:

| Replay schedule | Messages/month | Estimate |
| --- | --- | --- |
| On demand, ~1 h/day during demos | 1.3 M | **about $5** |
| 24/7, `tick_s: 30` (one message per tug per hour of replay time) | 1.0 M | **about $4** |
| 24/7 at `tick_s: 1` (12 msg/s) | 31 M | about $130 (not a $5 setup) |

So "under $5/month" holds for a demo that is replayed when someone is watching, or around the
clock at a coarse tick; a continuous 1 Hz replay of the whole fleet is a ~$130/month decision.
Two cheap levers if you need more: disable `tug_history` writes (halves DynamoDB cost; set
`HISTORY_TTL_DAYS` low or drop the `HistoryStore.append` call) and batch one WebSocket message per
tick instead of per tug. Connection scans are cached for 5 s per container so they do not scale
with message volume. `tug_history` rows expire after 14 days via TTL (free).

Watch the bill with a budget: `aws budgets create-budget` with a $10 monthly limit, or AWS Budgets
in the console.

## Teardown

```bash
cd infra && npx cdk destroy
```

Removes everything including the bucket contents (`autoDeleteObjects`) and the DynamoDB tables.
The IoT thing, certificate and policy created by `iot_provision.sh` are outside the stack; delete
them with:

```bash
aws iot detach-thing-principal --thing-name tug-replayer --principal "$(cat infra/.certs/certificate.arn)"
aws iot detach-policy --policy-name tug-replayer-publish --target "$(cat infra/.certs/certificate.arn)"
aws iot update-certificate --certificate-id "$(basename "$(cat infra/.certs/certificate.arn)")" --new-status INACTIVE
aws iot delete-certificate --certificate-id "$(basename "$(cat infra/.certs/certificate.arn)")"
aws iot delete-policy --policy-name tug-replayer-publish
aws iot delete-thing --thing-name tug-replayer
rm -rf infra/.certs
```
