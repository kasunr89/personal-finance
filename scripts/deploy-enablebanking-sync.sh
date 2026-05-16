#!/bin/bash
set -euo pipefail

REGION="eu-north-1"
FUNCTION_NAME="personal-finance-enablebanking-sync"
SCHEDULER_ROLE_NAME="personal-finance-scheduler-role"
SCHEDULER_NAME="personal-finance-enablebanking-sync"
ROLE_NAME="personal-finance-lambda-role"

echo "==> Getting AWS account ID..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "    Account: $ACCOUNT_ID"

ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"
LAMBDA_ARN="arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${FUNCTION_NAME}"

# ── Step 1: Build ────────────────────────────────────────────────────────────
echo ""
echo "==> Building..."
"$(dirname "$0")/build-enablebanking-sync.sh"

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

# ── Step 3: Lambda Function ───────────────────────────────────────────────────
echo ""
echo "==> Lambda function..."

FUNCTION_EXISTS=$(aws lambda get-function \
  --function-name "$FUNCTION_NAME" \
  --region "$REGION" \
  --query "Configuration.FunctionName" \
  --output text 2>/dev/null || echo "")

if [ -z "$FUNCTION_EXISTS" ]; then
  echo "    Creating function $FUNCTION_NAME..."
  aws lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --runtime nodejs20.x \
    --architectures arm64 \
    --role "$ROLE_ARN" \
    --handler lambda-enablebanking-sync.handler \
    --zip-file fileb://dist/lambda-enablebanking-sync.zip \
    --memory-size 512 \
    --timeout 60 \
    --region "$REGION" > /dev/null
  echo "    Waiting for function to be active..."
  aws lambda wait function-active --function-name "$FUNCTION_NAME" --region "$REGION"
else
  echo "    Updating function code..."
  aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file fileb://dist/lambda-enablebanking-sync.zip \
    --region "$REGION" > /dev/null
  aws lambda wait function-updated --function-name "$FUNCTION_NAME" --region "$REGION"
fi

# ── Step 4: Scheduler IAM Role ───────────────────────────────────────────────
echo ""
echo "==> Scheduler IAM role..."

SCHEDULER_ROLE_EXISTS=$(aws iam get-role \
  --role-name "$SCHEDULER_ROLE_NAME" \
  --query "Role.RoleName" \
  --output text 2>/dev/null || echo "")

if [ -z "$SCHEDULER_ROLE_EXISTS" ]; then
  echo "    Creating scheduler role $SCHEDULER_ROLE_NAME..."
  aws iam create-role \
    --role-name "$SCHEDULER_ROLE_NAME" \
    --assume-role-policy-document '{
      "Version": "2012-10-17",
      "Statement": [{
        "Effect": "Allow",
        "Principal": {"Service": "scheduler.amazonaws.com"},
        "Action": "sts:AssumeRole"
      }]
    }' > /dev/null

  aws iam put-role-policy \
    --role-name "$SCHEDULER_ROLE_NAME" \
    --policy-name "invoke-sync-lambda" \
    --policy-document "{
      \"Version\": \"2012-10-17\",
      \"Statement\": [{
        \"Effect\": \"Allow\",
        \"Action\": \"lambda:InvokeFunction\",
        \"Resource\": \"$LAMBDA_ARN\"
      }]
    }"

  echo "    Waiting 15s for IAM role to propagate..."
  sleep 15
else
  echo "    Scheduler role already exists, skipping."
fi

SCHEDULER_ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${SCHEDULER_ROLE_NAME}"

# ── Step 5: EventBridge Scheduler ────────────────────────────────────────────
echo ""
echo "==> EventBridge Scheduler..."

SCHEDULE_EXISTS=$(aws scheduler get-schedule \
  --name "$SCHEDULER_NAME" \
  --region "$REGION" \
  --query "Name" \
  --output text 2>/dev/null || echo "")

if [ -z "$SCHEDULE_EXISTS" ]; then
  echo "    Creating schedule $SCHEDULER_NAME..."
  aws scheduler create-schedule \
    --name "$SCHEDULER_NAME" \
    --schedule-expression "cron(0 8,20 * * ? *)" \
    --schedule-expression-timezone "UTC" \
    --flexible-time-window '{"Mode": "OFF"}' \
    --target "{
      \"Arn\": \"$LAMBDA_ARN\",
      \"RoleArn\": \"$SCHEDULER_ROLE_ARN\"
    }" \
    --region "$REGION" > /dev/null
  echo "    Schedule created: cron(0 8,20 * * ? *) UTC"
else
  echo "    Schedule already exists, skipping."
fi

echo ""
echo "=========================================="
echo "  Deployed!"
echo "  Function: $FUNCTION_NAME"
echo "  Schedule: 8:00 and 20:00 UTC daily"
echo ""
echo "  ACTION REQUIRED: set environment variables"
echo "  on $FUNCTION_NAME via the AWS console or:"
echo ""
echo "  aws lambda update-function-configuration \\"
echo "    --function-name $FUNCTION_NAME \\"
echo "    --region $REGION \\"
echo "    --environment 'Variables={DATABASE_URL=...,ENABLEBANKING_APP_ID=...,ENABLEBANKING_SESSION_ID=...,ENABLEBANKING_PRIVATE_KEY_PATH=a6f0a3de-981d-44d4-a522-a6b3fb146254.pem}'"
echo "=========================================="
