#!/bin/bash
set -euo pipefail

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
"$(dirname "$0")/build.sh"

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

POLICY_OUTPUT=$(aws lambda get-policy \
  --function-name "$FUNCTION_NAME" \
  --region "$REGION" \
  --query "Policy" --output text 2>/dev/null || echo "")

if ! echo "$POLICY_OUTPUT" | grep -q "apigateway-invoke"; then
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
