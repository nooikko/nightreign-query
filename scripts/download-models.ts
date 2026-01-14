#!/usr/bin/env npx tsx
/**
 * Download Embedding Models Script
 *
 * Pre-downloads HuggingFace models to the cache directory before production deployment.
 * This ensures models are available when allowRemoteModels=false in production.
 *
 * Usage:
 *   npx tsx scripts/download-models.ts
 *   pnpm download:models
 */

import { pipeline } from '@huggingface/transformers'
import { env } from '@huggingface/transformers'
import path from 'node:path'

const MODEL_NAME = 'BAAI/bge-large-en-v1.5'

// Set cache directory relative to project root for consistent location
const CACHE_DIR = path.join(process.cwd(), '.cache', 'models')

async function downloadModels() {
  console.log('=== Downloading Embedding Models ===')
  console.log(`Model: ${MODEL_NAME}`)
  console.log(`Cache directory: ${CACHE_DIR}`)
  console.log('')

  // Configure transformers to download models
  env.allowRemoteModels = true
  env.allowLocalModels = true
  env.cacheDir = CACHE_DIR

  console.log('Downloading model (this may take a few minutes on first run)...')
  const startTime = Date.now()

  try {
    // Load the pipeline - this downloads and caches the model
    const extractor = await pipeline('feature-extraction', MODEL_NAME, {
      dtype: 'fp32',
      device: 'cpu',
    })

    // Test with a sample embedding
    const testOutput = await extractor('test query', {
      pooling: 'mean',
      normalize: true,
    })

    const embedding = testOutput.tolist()[0]
    const downloadTime = Date.now() - startTime

    console.log('')
    console.log('=== Download Complete ===')
    console.log(`Time: ${downloadTime}ms`)
    console.log(`Embedding dimensions: ${embedding.length}`)
    console.log(`Cache location: ${CACHE_DIR}`)
    console.log('')
    console.log('Models are now cached for production use.')
  } catch (error) {
    console.error('Failed to download models:', error)
    process.exit(1)
  }
}

downloadModels()
