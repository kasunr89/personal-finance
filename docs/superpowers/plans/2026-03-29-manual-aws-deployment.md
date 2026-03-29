# Manual AWS Lambda Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Serverless Framework with shell scripts using AWS CLI to deploy a Fastify Lambda + HTTP API Gateway to eu-north-1.

**Architecture:** Three shell scripts — `build.sh` bundles TypeScript with esbuild, `deploy.sh` creates/updates all AWS resources idempotently, `teardown.sh` deletes everything in reverse order. No frameworks or IaC tools; every resource is created with explicit `aws` CLI calls.

**Tech Stack:** AWS CLI, bash, esbuild (already installed), Node.js 20, AWS Lambda, API Gateway v2 (HTTP), IAM, AWS Budgets.

---

## File Map

| Action | File |
|--------|------|
| Delete | `serverless.yml` |
| Modify | `package.json` |
| Create | `scripts/build.sh` |
| Create | `scripts/deploy.sh` |
| Create | `scripts/teardown.sh` |

---

### Task 1: Remove Serverless Framework

**Files:**
- Delete: `serverless.yml`
- Modify: `package.json`

- [ ] **Step 1: Delete serverless.yml**

```bash
rm serverless.yml
```

- [ ] **Step 2: Update package.json**

Replace the `scripts` block and remove `serverless` and `serverless-esbuild` from `devDependencies`. The full updated file:

```json
{
  "name": "personal-finance",
  "version": "1.0.0",
  "main": "dist/app.js",
  "scripts": {
    "build": "./scripts/build.sh",
    "deploy": "./scripts/deploy.sh",
    "teardown": "./scripts/teardown.sh",
    "dev": "npx tsx watch src/server.ts"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "description": "",
  "dependencies": {
    "@fastify/aws-lambda": "^6.4.0",
    "fastify": "^5.8.4"
  },
  "devDependencies": {
    "@types/aws-lambda": "^8.10.161",
    "@types/node": "^25.5.0",
    "esbuild": "^0.27.4",
    "typescript": "^6.0.2"
  }
}
```

- [ ] **Step 3: Install to update lockfile**

```bash
npm install
```

Expected: No errors. `package-lock.json` updated without `serverless` or `serverless-esbuild` entries.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git rm serverless.yml
git commit -m "chore: remove serverless framework"
```

---

### Task 2: Create build.sh

**Files:**
- Create: `scripts/build.sh`

- [ ] **Step 1: Create scripts directory and build.sh**

```bash
mkdir -p scripts
```

Create `scripts/build.sh`:

```bash
#!/bin/bash
set -e

echo "==> Building Lambda bundle..."

npx esbuild src/lambda.ts \
  --bundle \
  --platform=node \
  --target=node20 \
  --format=cjs \
  --outfile=dist/lambda.js

echo "==> Zipping..."

mkdir -p dist
cd dist && zip -j lambda.zip lambda.js && cd ..

echo "==> Build complete: dist/lambda.zip"
```

- [ ] **Step 2: Make executable**

```bash
chmod +x scripts/build.sh
```

- [ ] **Step 3: Run it to verify**

```bash
./scripts/build.sh
```

Expected output:
```
==> Building Lambda bundle...
  dist/lambda.js  ...kb

==> Zipping...
  adding: lambda.js (deflated ...)

==> Build complete: dist/lambda.zip
```

Verify the zip exists:

```bash
ls -lh dist/lambda.zip
```

Expected: file exists, size is a few hundred KB.

- [ ] **Step 4: Commit**

```bash
git add scripts/build.sh
git commit -m "feat: add build.sh to bundle Lambda with esbuild"
```

---

### Task 3: Create deploy.sh

**Files:**
- Create: `scripts/deploy.sh`

- [ ] **Step 1: Create scripts/deploy.sh**

```bash
#!/bin/bash
set -e

REGION="eu-north-1"
ROLE_NAME="personal-finance-lambda-role"
FUNCTION_NAME="personal-finance-api"
API_NAME="personal-finance-api"
BUDGET_NAME="personal-finance-budget"
ALERT_EMAIL="kasunrc123@gmail.com"

echo "==> Getting AWS account ID..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "    Account: $ACCOUNT_ID"

# ── Step 1: Build ────────────────────────────────────────────────────────────
echo ""
echo "==> Building..."
./scripts/build.sh

# ── Step 2: IAM Role ─────────────────────────────────────────────────────────
echo ""
echo "==> IAM Role..."

ROLE_EXISTS=$(aws iam get-role --role-name "$ROLE_NAME" --query "Role.RoleName" --output text 2>/dev/null || echo "")

if [ -z "$ROLE_EXISTS" ]; then
  echo "    Creating role $ROLE_NAME..."
  aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document '{
      "Version": "2012-10-17",
      "Statement": [{
        "Effect": "Allow",
        "Principal": {"Service": "lambda.amazonaws.com"},
        "Action": "sts:AssumeRole"
      }]
    }' > /dev/null

  aws iam attach-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

  echo "    Waiting 15s for IAM role to propagate..."
  sleep 15
else
  echo "    Role already exists, skipping."
fi

ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"

# ── Step 3: Lambda Function ───────────────────────────────────────────────────
echo ""
echo "==> Lambda function..."

FUNCTION_EXISTS=$(aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" --query "Configuration.FunctionName" --output text 2>/dev/null || echo "")

if [ -z "$FUNCTION_EXISTS" ]; then
  echo "    Creating function $FUNCTION_NAME..."
  aws lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --runtime nodejs20.x \
    --architectures arm64 \
    --role "$ROLE_ARN" \
    --handler lambda.handler \
    --zip-file fileb://dist/lambda.zip \
    --memory-size 512 \
    --timeout 30 \
    --region "$REGION" > /dev/null
  echo "    Waiting for function to be active..."
  aws lambda wait function-active --function-name "$FUNCTION_NAME" --region "$REGION"
else
  echo "    Updating function code..."
  aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file fileb://dist/lambda.zip \
    --region "$REGION" > /dev/null
  aws lambda wait function-updated --function-name "$FUNCTION_NAME" --region "$REGION"
fi

# ── Step 4: HTTP API Gateway ──────────────────────────────────────────────────
echo ""
echo "==> API Gateway..."

API_ID=$(aws apigatewayv2 get-apis --region "$REGION" \
  --query "Items[?Name=='$API_NAME'].ApiId" --output text)

if [ -z "$API_ID" ]; then
  echo "    Creating HTTP API $API_NAME..."
  API_ID=$(aws apigatewayv2 create-api \
    --name "$API_NAME" \
    --protocol-type HTTP \
    --region "$REGION" \
    --query ApiId --output text)
  echo "    API ID: $API_ID"
else
  echo "    API already exists: $API_ID"
fi

# ── Step 5: Lambda Integration ────────────────────────────────────────────────
echo ""
echo "==> Lambda integration..."

INTEGRATION_ID=$(aws apigatewayv2 get-integrations \
  --api-id "$API_ID" \
  --region "$REGION" \
  --query "Items[?IntegrationUri && contains(IntegrationUri, '$FUNCTION_NAME')].IntegrationId" \
  --output text)

if [ -z "$INTEGRATION_ID" ]; then
  echo "    Creating integration..."
  LAMBDA_ARN="arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${FUNCTION_NAME}/invocations"
  INTEGRATION_ID=$(aws apigatewayv2 create-integration \
    --api-id "$API_ID" \
    --integration-type AWS_PROXY \
    --integration-uri "$LAMBDA_ARN" \
    --payload-format-version 2.0 \
    --region "$REGION" \
    --query IntegrationId --output text)
  echo "    Integration ID: $INTEGRATION_ID"
else
  echo "    Integration already exists: $INTEGRATION_ID"
fi

# ── Step 6: Default Route ─────────────────────────────────────────────────────
echo ""
echo "==> Default route..."

ROUTE_EXISTS=$(aws apigatewayv2 get-routes \
  --api-id "$API_ID" \
  --region "$REGION" \
  --query "Items[?RouteKey=='\$default'].RouteId" \
  --output text)

if [ -z "$ROUTE_EXISTS" ]; then
  echo "    Creating \$default route..."
  aws apigatewayv2 create-route \
    --api-id "$API_ID" \
    --route-key '$default' \
    --target "integrations/$INTEGRATION_ID" \
    --region "$REGION" > /dev/null
else
  echo "    Route already exists."
fi

# ── Step 7: Default Stage ─────────────────────────────────────────────────────
echo ""
echo "==> Default stage..."

STAGE_EXISTS=$(aws apigatewayv2 get-stages \
  --api-id "$API_ID" \
  --region "$REGION" \
  --query "Items[?StageName=='\$default'].StageName" \
  --output text)

if [ -z "$STAGE_EXISTS" ]; then
  echo "    Creating \$default stage..."
  aws apigatewayv2 create-stage \
    --api-id "$API_ID" \
    --stage-name '$default' \
    --auto-deploy \
    --region "$REGION" > /dev/null
else
  echo "    Stage already exists."
fi

# ── Step 8: Lambda Invoke Permission ─────────────────────────────────────────
echo ""
echo "==> Lambda invoke permission..."

PERMISSION_EXISTS=$(aws lambda get-policy \
  --function-name "$FUNCTION_NAME" \
  --region "$REGION" \
  --query "Policy" --output text 2>/dev/null | grep -c "apigateway-invoke" || true)

if [ "$PERMISSION_EXISTS" -eq 0 ]; then
  echo "    Adding invoke permission..."
  aws lambda add-permission \
    --function-name "$FUNCTION_NAME" \
    --statement-id apigateway-invoke \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*" \
    --region "$REGION" > /dev/null
else
  echo "    Permission already exists."
fi

# ── Step 9: Budget Alarm ──────────────────────────────────────────────────────
echo ""
echo "==> Budget alarm..."

BUDGET_EXISTS=$(aws budgets describe-budget \
  --account-id "$ACCOUNT_ID" \
  --budget-name "$BUDGET_NAME" \
  --query "Budget.BudgetName" --output text 2>/dev/null || echo "")

if [ -z "$BUDGET_EXISTS" ]; then
  echo "    Creating \$1/month budget with email alert to $ALERT_EMAIL..."
  aws budgets create-budget \
    --account-id "$ACCOUNT_ID" \
    --budget "{
      \"BudgetName\": \"$BUDGET_NAME\",
      \"BudgetLimit\": {\"Amount\": \"1\", \"Unit\": \"USD\"},
      \"TimeUnit\": \"MONTHLY\",
      \"BudgetType\": \"COST\"
    }" \
    --notifications-with-subscribers "[{
      \"Notification\": {
        \"NotificationType\": \"ACTUAL\",
        \"ComparisonOperator\": \"GREATER_THAN\",
        \"Threshold\": 80,
        \"ThresholdType\": \"PERCENTAGE\"
      },
      \"Subscribers\": [{
        \"SubscriptionType\": \"EMAIL\",
        \"Address\": \"$ALERT_EMAIL\"
      }]
    }]"
else
  echo "    Budget already exists."
fi

# ── Step 10: Print URL ────────────────────────────────────────────────────────
echo ""
echo "=========================================="
echo "  Deployed!"
echo "  URL: https://${API_ID}.execute-api.${REGION}.amazonaws.com"
echo "  Health check: https://${API_ID}.execute-api.${REGION}.amazonaws.com/health"
echo "=========================================="
```

- [ ] **Step 2: Make executable**

```bash
chmod +x scripts/deploy.sh
```

- [ ] **Step 3: Commit**

```bash
git add scripts/deploy.sh
git commit -m "feat: add deploy.sh to create Lambda and API Gateway via AWS CLI"
```

---

### Task 4: Create teardown.sh

**Files:**
- Create: `scripts/teardown.sh`

- [ ] **Step 1: Create scripts/teardown.sh**

```bash
#!/bin/bash
set -e

REGION="eu-north-1"
ROLE_NAME="personal-finance-lambda-role"
FUNCTION_NAME="personal-finance-api"
API_NAME="personal-finance-api"
BUDGET_NAME="personal-finance-budget"

echo "==> Getting AWS account ID..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# ── Step 1: Delete Budget ─────────────────────────────────────────────────────
echo ""
echo "==> Deleting budget..."

BUDGET_EXISTS=$(aws budgets describe-budget \
  --account-id "$ACCOUNT_ID" \
  --budget-name "$BUDGET_NAME" \
  --query "Budget.BudgetName" --output text 2>/dev/null || echo "")

if [ -n "$BUDGET_EXISTS" ]; then
  aws budgets delete-budget \
    --account-id "$ACCOUNT_ID" \
    --budget-name "$BUDGET_NAME"
  echo "    Deleted budget $BUDGET_NAME."
else
  echo "    Budget not found, skipping."
fi

# ── Step 2: Delete API Gateway ────────────────────────────────────────────────
echo ""
echo "==> Deleting API Gateway..."

API_ID=$(aws apigatewayv2 get-apis --region "$REGION" \
  --query "Items[?Name=='$API_NAME'].ApiId" --output text)

if [ -n "$API_ID" ]; then
  aws apigatewayv2 delete-api --api-id "$API_ID" --region "$REGION"
  echo "    Deleted API $API_ID (routes, integrations, and stages removed with it)."
else
  echo "    API Gateway not found, skipping."
fi

# ── Step 3: Remove Lambda Permission ─────────────────────────────────────────
echo ""
echo "==> Removing Lambda invoke permission..."

PERMISSION_EXISTS=$(aws lambda get-policy \
  --function-name "$FUNCTION_NAME" \
  --region "$REGION" \
  --query "Policy" --output text 2>/dev/null | grep -c "apigateway-invoke" || true)

if [ "$PERMISSION_EXISTS" -gt 0 ]; then
  aws lambda remove-permission \
    --function-name "$FUNCTION_NAME" \
    --statement-id apigateway-invoke \
    --region "$REGION"
  echo "    Removed permission."
else
  echo "    Permission not found, skipping."
fi

# ── Step 4: Delete Lambda ─────────────────────────────────────────────────────
echo ""
echo "==> Deleting Lambda function..."

FUNCTION_EXISTS=$(aws lambda get-function \
  --function-name "$FUNCTION_NAME" \
  --region "$REGION" \
  --query "Configuration.FunctionName" --output text 2>/dev/null || echo "")

if [ -n "$FUNCTION_EXISTS" ]; then
  aws lambda delete-function --function-name "$FUNCTION_NAME" --region "$REGION"
  echo "    Deleted function $FUNCTION_NAME."
else
  echo "    Function not found, skipping."
fi

# ── Step 5 & 6: Detach Policy and Delete IAM Role ────────────────────────────
echo ""
echo "==> Deleting IAM role..."

ROLE_EXISTS=$(aws iam get-role \
  --role-name "$ROLE_NAME" \
  --query "Role.RoleName" --output text 2>/dev/null || echo "")

if [ -n "$ROLE_EXISTS" ]; then
  aws iam detach-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
  aws iam delete-role --role-name "$ROLE_NAME"
  echo "    Deleted role $ROLE_NAME."
else
  echo "    Role not found, skipping."
fi

echo ""
echo "=========================================="
echo "  Teardown complete."
echo "  All personal-finance AWS resources deleted."
echo "=========================================="
```

- [ ] **Step 2: Make executable**

```bash
chmod +x scripts/teardown.sh
```

- [ ] **Step 3: Commit**

```bash
git add scripts/teardown.sh
git commit -m "feat: add teardown.sh to delete all AWS resources"
```

---

### Task 5: Install AWS CLI and deploy

> **Note:** This task requires you to have an AWS account. If you don't have one, create one at https://aws.amazon.com before continuing.

- [ ] **Step 1: Install AWS CLI (macOS)**

```bash
brew install awscli
```

Verify:

```bash
aws --version
```

Expected: `aws-cli/2.x.x ...`

- [ ] **Step 2: Create an IAM user for CLI access**

1. Log in to the AWS Console at https://console.aws.amazon.com
2. Go to **IAM → Users → Create user**
3. Username: `personal-finance-cli`
4. Attach permissions: **AdministratorAccess** (for learning; you can restrict later)
5. Go to **Security credentials → Create access key**
6. Select **CLI** as the use case
7. Save the **Access Key ID** and **Secret Access Key**

- [ ] **Step 3: Configure AWS CLI**

```bash
aws configure
```

Enter when prompted:
```
AWS Access Key ID: <your access key>
AWS Secret Access Key: <your secret key>
Default region name: eu-north-1
Default output format: json
```

- [ ] **Step 4: Verify credentials**

```bash
aws sts get-caller-identity
```

Expected output (values will differ):
```json
{
    "UserId": "AIDAXXXXXXXXXXXXXXXXX",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/personal-finance-cli"
}
```

- [ ] **Step 5: Run deploy**

```bash
npm run deploy
```

Expected: script runs through all steps with no errors, prints a URL at the end like:
```
==========================================
  Deployed!
  URL: https://abc123.execute-api.eu-north-1.amazonaws.com
  Health check: https://abc123.execute-api.eu-north-1.amazonaws.com/health
==========================================
```

- [ ] **Step 6: Test the health endpoint**

```bash
curl https://<your-api-id>.execute-api.eu-north-1.amazonaws.com/health
```

Expected:
```json
{"status":"ok"}
```

- [ ] **Step 7: Verify resources in AWS Console**

Check these in the AWS Console (region: eu-north-1):
- **Lambda** → Functions → `personal-finance-api` exists
- **API Gateway** → APIs → `personal-finance-api` exists
- **IAM** → Roles → `personal-finance-lambda-role` exists
- **Billing** → Budgets → `personal-finance-budget` exists with $1 limit

- [ ] **Step 8: Run deploy again to verify idempotency**

```bash
npm run deploy
```

Expected: All steps print "already exists" or "updating function code" — no errors, same URL printed.

- [ ] **Step 9: Final commit**

```bash
git add -A
git commit -m "feat: complete manual AWS deployment setup"
```

---

## When to use teardown.sh

Run `npm run teardown` only when you're **done with the project** and want to remove all AWS resources to avoid any future charges. Do not run it after every code change — `deploy` handles updates.
