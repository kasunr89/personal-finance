#!/bin/bash
set -euo pipefail

REGION="eu-north-1"
FUNCTION_NAME="personal-finance-enablebanking-sync"
SCHEDULER_NAME="personal-finance-enablebanking-sync"
SCHEDULER_ROLE_NAME="personal-finance-scheduler-role"

echo "==> Getting AWS account ID..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# ── Step 1: Delete EventBridge Schedule ──────────────────────────────────────
echo ""
echo "==> Deleting EventBridge schedule..."

SCHEDULE_EXISTS=$(aws scheduler get-schedule \
  --name "$SCHEDULER_NAME" \
  --region "$REGION" \
  --query "Name" \
  --output text 2>/dev/null || echo "")

if [ -n "$SCHEDULE_EXISTS" ]; then
  aws scheduler delete-schedule --name "$SCHEDULER_NAME" --region "$REGION"
  echo "    Deleted schedule $SCHEDULER_NAME."
else
  echo "    Schedule not found, skipping."
fi

# ── Step 2: Delete Lambda Function ───────────────────────────────────────────
echo ""
echo "==> Deleting Lambda function..."

FUNCTION_EXISTS=$(aws lambda get-function \
  --function-name "$FUNCTION_NAME" \
  --region "$REGION" \
  --query "Configuration.FunctionName" \
  --output text 2>/dev/null || echo "")

if [ -n "$FUNCTION_EXISTS" ]; then
  aws lambda delete-function --function-name "$FUNCTION_NAME" --region "$REGION"
  echo "    Deleted function $FUNCTION_NAME."
else
  echo "    Function not found, skipping."
fi

# ── Step 3: Delete Scheduler IAM Role ────────────────────────────────────────
echo ""
echo "==> Deleting scheduler IAM role..."

ROLE_EXISTS=$(aws iam get-role \
  --role-name "$SCHEDULER_ROLE_NAME" \
  --query "Role.RoleName" \
  --output text 2>/dev/null || echo "")

if [ -n "$ROLE_EXISTS" ]; then
  aws iam delete-role-policy \
    --role-name "$SCHEDULER_ROLE_NAME" \
    --policy-name "invoke-sync-lambda" 2>/dev/null || true
  aws iam delete-role --role-name "$SCHEDULER_ROLE_NAME"
  echo "    Deleted role $SCHEDULER_ROLE_NAME."
else
  echo "    Role not found, skipping."
fi

echo ""
echo "=========================================="
echo "  Teardown complete."
echo "  personal-finance-enablebanking-sync removed."
echo "  (personal-finance-api and its resources untouched)"
echo "=========================================="
