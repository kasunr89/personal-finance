#!/bin/bash
set -euo pipefail

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

POLICY_OUTPUT=$(aws lambda get-policy \
  --function-name "$FUNCTION_NAME" \
  --region "$REGION" \
  --query "Policy" --output text 2>/dev/null || echo "")

if echo "$POLICY_OUTPUT" | grep -q "apigateway-invoke"; then
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
