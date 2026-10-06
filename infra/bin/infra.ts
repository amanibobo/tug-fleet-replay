#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { TugReplayStack } from '../lib/tug-replay-stack';

const app = new cdk.App();

// Environment-agnostic on purpose: `cdk synth` must work with no AWS credentials.
// The region and account are resolved at deploy time from the CLI's credentials.
new TugReplayStack(app, 'TugReplayStack', {
  description: 'Tug fleet replay backend: IoT Core -> Lambda -> DynamoDB -> WebSocket, HTTP API, S3 + CloudFront',
  tags: { project: 'tug-replay' },
});
