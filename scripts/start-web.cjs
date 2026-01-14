#!/usr/bin/env node
/**
 * Wrapper script to set up CUDA/ONNX environment for the web server
 * This script sets environment variables before requiring the Next.js server
 */

// Set up ONNX Runtime library path BEFORE any imports
const ONNX_LIB_PATH = '/home/quinn/nightreign-query/node_modules/.pnpm/onnxruntime-node@1.21.0/node_modules/onnxruntime-node/bin/napi-v3/linux/x64'
const CUDA_LIB_PATH = '/usr/local/cuda/lib64'
const SYSTEM_LIB_PATH = '/usr/lib/x86_64-linux-gnu'

process.env.LD_LIBRARY_PATH = [
  ONNX_LIB_PATH,
  CUDA_LIB_PATH,
  SYSTEM_LIB_PATH,
  process.env.LD_LIBRARY_PATH || ''
].filter(Boolean).join(':')

process.env.CUDA_PATH = '/usr/local/cuda'
process.env.EMBEDDING_DEVICE = 'cuda'

// Log configuration
console.log('[start-web] CUDA environment configured:')
console.log(`  LD_LIBRARY_PATH: ${process.env.LD_LIBRARY_PATH}`)
console.log(`  CUDA_PATH: ${process.env.CUDA_PATH}`)
console.log(`  EMBEDDING_DEVICE: ${process.env.EMBEDDING_DEVICE}`)

// Start the Next.js server
require('../apps/web/.next/standalone/apps/web/server.js')
