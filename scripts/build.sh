#!/bin/bash
set -e

echo "==> Building Lambda bundle..."

npx esbuild src/infrastructure/lambda.ts \
  --bundle \
  --platform=node \
  --target=node20 \
  --format=cjs \
  --outfile=dist/lambda.js

echo "==> Zipping..."

mkdir -p dist
cd dist && zip -j lambda.zip lambda.js && cd ..

echo "==> Build complete: dist/lambda.zip"
