/**
 * GPU Configuration for Embedding Generation
 *
 * Configures ONNX Runtime backend for CPU or CUDA GPU execution.
 * GPU acceleration provides ~5-10x speedup for embedding generation.
 */

import { env } from '@huggingface/transformers'

/** Supported device types for embedding generation */
export type DeviceType = 'cpu' | 'cuda'

/** GPU configuration options */
export interface GpuConfig {
  /** Device to use for inference */
  device: DeviceType
  /** Whether GPU was explicitly requested */
  gpuRequested: boolean
  /** Whether GPU is available (CUDA detected) */
  gpuAvailable: boolean
}

/** Cached configuration */
let cachedConfig: GpuConfig | null = null

/**
 * Check if cuDNN 9 is available (required by ONNX Runtime 1.21+)
 *
 * ONNX Runtime 1.21+ requires cuDNN 9.x specifically.
 * cuDNN 8.x is NOT compatible with ONNX Runtime built for cuDNN 9.x.
 */
function checkCudnnAvailable(): boolean {
  const ldLibraryPath = process.env.LD_LIBRARY_PATH || ''

  // Check for cuDNN 9 in library path
  // Common locations: /usr/lib/x86_64-linux-gnu, /usr/local/cuda/lib64
  const hasCudnn = ldLibraryPath.includes('x86_64-linux-gnu') || ldLibraryPath.includes('cudnn')

  return hasCudnn
}

/**
 * Check if CUDA GPU is likely available
 *
 * This is a heuristic check - actual availability depends on:
 * - NVIDIA GPU present
 * - CUDA toolkit installed
 * - Compatible CUDA version (12.x for ONNX Runtime 1.21+)
 * - cuDNN 9.x installed (required by ONNX Runtime 1.21+)
 */
function checkCudaAvailable(): boolean {
  // Check for common CUDA environment variables
  const cudaPath = process.env.CUDA_PATH || process.env.CUDA_HOME
  const ldLibraryPath = process.env.LD_LIBRARY_PATH || ''

  // Look for CUDA in library path (Linux)
  const hasCudaInPath = ldLibraryPath.includes('cuda')

  // Check if running on Linux (CUDA GPU support in Node.js is Linux-only)
  const isLinux = process.platform === 'linux'

  // Check for cuDNN 9 (required by ONNX Runtime 1.21+)
  const hasCudnn = checkCudnnAvailable()

  if (isLinux && (cudaPath || hasCudaInPath) && !hasCudnn) {
    console.warn('[GPU Config] CUDA detected but cuDNN 9 not found in LD_LIBRARY_PATH')
    console.warn('[GPU Config] ONNX Runtime 1.21+ requires cuDNN 9.x for GPU acceleration')
    console.warn('[GPU Config] Add cuDNN lib directory to LD_LIBRARY_PATH (e.g., /usr/lib/x86_64-linux-gnu)')
    return false
  }

  return isLinux && (!!cudaPath || hasCudaInPath) && hasCudnn
}

/**
 * Get the GPU configuration
 *
 * Configuration is determined by:
 * 1. EMBEDDING_DEVICE env var ('cpu' | 'cuda') - explicit override
 * 2. USE_GPU env var ('true' | 'false') - enable/disable GPU
 * 3. Auto-detection of CUDA availability
 *
 * @returns GPU configuration object
 */
export function getGpuConfig(): GpuConfig {
  if (cachedConfig) {
    return cachedConfig
  }

  const deviceEnv = process.env.EMBEDDING_DEVICE?.toLowerCase()
  const useGpuEnv = process.env.USE_GPU?.toLowerCase()

  // Check GPU availability
  const gpuAvailable = checkCudaAvailable()

  // Determine if GPU was requested
  let gpuRequested = false
  let device: DeviceType = 'cpu'

  if (deviceEnv === 'cuda') {
    gpuRequested = true
    device = gpuAvailable ? 'cuda' : 'cpu'
  } else if (deviceEnv === 'cpu') {
    gpuRequested = false
    device = 'cpu'
  } else if (useGpuEnv === 'true') {
    gpuRequested = true
    device = gpuAvailable ? 'cuda' : 'cpu'
  } else if (useGpuEnv === 'false') {
    gpuRequested = false
    device = 'cpu'
  } else {
    // Auto-detect: use GPU if available
    gpuRequested = gpuAvailable
    device = gpuAvailable ? 'cuda' : 'cpu'
  }

  cachedConfig = {
    device,
    gpuRequested,
    gpuAvailable,
  }

  return cachedConfig
}

/**
 * Configure the Transformers.js environment for optimal performance
 *
 * Call this once at application startup before loading any models.
 */
export function configureTransformersEnv(): void {
  const config = getGpuConfig()

  // Disable remote model downloads in production (use cached models)
  if (process.env.NODE_ENV === 'production') {
    env.allowLocalModels = true
    env.allowRemoteModels = false
  }

  // Log configuration
  console.log(`[GPU Config] Device: ${config.device}`)
  if (config.gpuRequested && !config.gpuAvailable) {
    console.warn(
      '[GPU Config] GPU requested but CUDA not detected - falling back to CPU',
    )
    console.warn(
      '[GPU Config] Ensure CUDA toolkit is installed and CUDA_PATH is set',
    )
  }
}

/**
 * Get pipeline options for embedding model initialization
 *
 * @returns Options object for pipeline() function
 */
export function getPipelineOptions(): {
  dtype: 'fp32' | 'fp16'
  device: DeviceType
} {
  const config = getGpuConfig()

  return {
    // Use fp32 for both CPU and GPU
    // Note: fp16 requires a separate model download (fp16 variant)
    // and can cause numerical instability with some models
    dtype: 'fp32',
    device: config.device,
  }
}

/**
 * Reset the cached configuration
 *
 * Useful for testing or when environment variables change.
 */
export function resetGpuConfig(): void {
  cachedConfig = null
}

/**
 * Log GPU configuration status
 */
export function logGpuStatus(): void {
  const config = getGpuConfig()

  console.log('=== GPU Configuration ===')
  console.log(`  Device: ${config.device}`)
  console.log(`  GPU Requested: ${config.gpuRequested}`)
  console.log(`  GPU Available: ${config.gpuAvailable}`)
  console.log(`  Platform: ${process.platform}`)
  console.log(`  CUDA_PATH: ${process.env.CUDA_PATH || '(not set)'}`)
  console.log('========================')
}
