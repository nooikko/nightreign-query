#!/bin/bash
# Wrapper script to set up CUDA/ONNX environment for the web server

# ONNX Runtime library path
export LD_LIBRARY_PATH="/home/quinn/nightreign-query/node_modules/.pnpm/onnxruntime-node@1.21.0/node_modules/onnxruntime-node/bin/napi-v3/linux/x64:/usr/local/cuda/lib64:/usr/lib/x86_64-linux-gnu:${LD_LIBRARY_PATH:-}"

# CUDA configuration
export CUDA_PATH="/usr/local/cuda"
export EMBEDDING_DEVICE="cuda"

# Execute the Next.js server
exec node apps/web/.next/standalone/apps/web/server.js
