#!/bin/bash
set -e

echo "==> Building Enable Banking sync Lambda bundle..."

npx esbuild src/infrastructure/lambda-enablebanking-sync.ts \
  --bundle \
  --platform=node \
  --target=node20 \
  --format=cjs \
  --outfile=dist/lambda-enablebanking-sync.js

echo "==> Zipping..."

mkdir -p dist
cp a6f0a3de-981d-44d4-a522-a6b3fb146254.pem dist/
cd dist && zip -j lambda-enablebanking-sync.zip lambda-enablebanking-sync.js a6f0a3de-981d-44d4-a522-a6b3fb146254.pem && cd ..

echo "==> Build complete: dist/lambda-enablebanking-sync.zip"
