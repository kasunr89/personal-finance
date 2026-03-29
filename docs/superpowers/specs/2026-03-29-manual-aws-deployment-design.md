# Manual AWS Lambda Deployment — Design Spec

## Goal

Replace the Serverless Framework with shell scripts using the AWS CLI to deploy a Fastify Lambda function. The purpose is learning how AWS Lambda, API Gateway, and IAM work at the resource level.

## Prerequisites

- AWS CLI installed and configured (`aws configure`)
- AWS account with appropriate permissions
- Node.js and npm installed (already in place)

## Region

`eu-north-1` (Stockholm) — closest to Estonia.

## Project Changes

### Remove

- `serverless.yml`
- `serverless` and `serverless-esbuild` from devDependencies

### Add

| File | Purpose |
|------|---------|
| `scripts/build.sh` | Bundle TypeScript with esbuild, zip the output |
| `scripts/deploy.sh` | Create or update all AWS resources via CLI |
| `scripts/teardown.sh` | Delete all AWS resources in reverse order |

### Update

**`package.json` scripts:**

- `build` → `./scripts/build.sh`
- `deploy` → `./scripts/deploy.sh`
- `teardown` → `./scripts/teardown.sh`

### No Changes

- `src/lambda.ts` — Lambda handler stays the same
- `src/app.ts` — Fastify app builder stays the same
- `src/server.ts` — Local dev server stays the same
- `@fastify/aws-lambda` dependency — still used
- `npm run dev` — still works for local development

## Scripts

### `scripts/build.sh`

1. Run esbuild to bundle `src/lambda.ts` → `dist/lambda.js` (CommonJS, Node 20 target, bundled, platform node)
2. Zip `dist/lambda.js` → `dist/lambda.zip`

### `scripts/deploy.sh`

Idempotent — detects whether resources exist and creates or updates accordingly.

**Step 1:** Run `build.sh`

**Step 2:** Create IAM execution role

- Role name: `personal-finance-lambda-role`
- Trust policy: allows `lambda.amazonaws.com` to assume the role
- Attach managed policy: `arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole` (AWS managed, no account ID needed)

**Step 3:** Create Lambda function

- Function name: `personal-finance-api`
- Runtime: `nodejs20.x`
- Architecture: `arm64`
- Memory: 512 MB
- Timeout: 30 seconds
- Handler: `lambda.handler`
- Code: `dist/lambda.zip`

**Step 4:** Create HTTP API Gateway

- API name: `personal-finance-api`
- Protocol: HTTP

**Step 5:** Create Lambda integration

- Integration type: `AWS_PROXY`
- Payload format version: `2.0`

**Step 6:** Create catch-all route

- Route key: `$default`
- Target: the integration from step 5

**Step 7:** Create default stage

- Stage name: `$default`
- Auto-deploy: enabled

**Step 8:** Add Lambda invoke permission

- Allow API Gateway to invoke the Lambda function

**Step 9:** Create budget alarm

- Budget: $1/month
- Alert: email notification to `kasunrc123@gmail.com` when actual cost exceeds 80% of budget
- Uses `aws budgets create-budget`

**Step 10:** Print the API Gateway URL

- Format: `https://{api-id}.execute-api.eu-north-1.amazonaws.com`

### `scripts/teardown.sh`

Deletes resources in reverse order:

1. Delete budget
2. Delete API Gateway (routes, integration, and stage are deleted with it)
3. Remove Lambda invoke permission
4. Delete Lambda function
5. Detach IAM managed policy
6. Delete IAM role

Each step checks if the resource exists before attempting deletion, so the script is safe to re-run.

## Resource Naming

All resources use the prefix `personal-finance` for easy identification:

- IAM Role: `personal-finance-lambda-role`
- Lambda: `personal-finance-api`
- API Gateway: `personal-finance-api`
- Budget: `personal-finance-budget`

## Cost

All services used fall within the AWS Free Tier for low usage:

| Service | Free Tier (monthly) |
|---------|---------------------|
| Lambda | 1M requests + 400,000 GB-seconds |
| API Gateway | 1M HTTP API calls |
| CloudWatch Logs | 5GB ingestion |

Budget alarm at $1/month with email alert provides a safety net.
