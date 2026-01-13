/**
 * esbuild Configuration for Scraper App
 *
 * Bundles the TypeScript source code with:
 * - TypeScript path alias resolution
 * - ESM output format for Node.js
 * - Source maps for debugging
 */

import * as esbuild from 'esbuild'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Read tsconfig to get path aliases
const tsconfigPath = resolve(__dirname, 'tsconfig.json')
const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'))
const { paths = {}, baseUrl = '.' } = tsconfig.compilerOptions || {}

/**
 * Plugin to resolve TypeScript path aliases
 *
 * Converts imports like `@utils/logger` to `./src/utils/logger`
 */
function tsconfigPathsPlugin(): esbuild.Plugin {
  return {
    name: 'tsconfig-paths',
    setup(build) {
      // Build a map of alias patterns to their replacements
      const aliasMap: Array<{ pattern: RegExp; replacement: string }> = []

      for (const [alias, targetPaths] of Object.entries(paths)) {
        if (!Array.isArray(targetPaths) || targetPaths.length === 0) continue

        const target = targetPaths[0] as string
        // Convert `@utils/*` to regex pattern
        const pattern = new RegExp(
          `^${alias.replace('/*', '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(/.*)?$`,
        )
        // Get the base path without the wildcard
        const basePath = target.replace('/*', '').replace('*', '')

        aliasMap.push({ pattern, replacement: basePath })
      }

      build.onResolve({ filter: /^@/ }, async (args) => {
        for (const { pattern, replacement } of aliasMap) {
          const match = args.path.match(pattern)
          if (match) {
            // Construct the resolved path
            const suffix = match[1] || ''
            const resolvedPath = resolve(__dirname, baseUrl, replacement + suffix)

            // Let esbuild resolve the actual file
            const result = await build.resolve(resolvedPath, {
              kind: args.kind,
              resolveDir: args.resolveDir,
            })

            return result
          }
        }

        // Not a path alias, let esbuild handle it
        return null
      })
    },
  }
}

const isWatch = process.argv.includes('--watch')

const buildOptions: esbuild.BuildOptions = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outdir: 'dist',
  sourcemap: true,
  // Packages with native binaries can't be bundled
  external: [
    'playwright',
    '@prisma/client',
    '@huggingface/transformers', // Uses onnxruntime-node (native)
    'onnxruntime-node',
    'sharp',
  ],
  // Resolve .ts files without needing extensions in imports
  resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  plugins: [tsconfigPathsPlugin()],
  // Add banner to make ESM work with __dirname if needed
  banner: {
    js: `
import { createRequire as _createRequire } from 'module';
import { fileURLToPath as _fileURLToPath } from 'url';
import { dirname as _dirname } from 'path';

const require = _createRequire(import.meta.url);
const __filename = _fileURLToPath(import.meta.url);
const __dirname = _dirname(__filename);
`.trim(),
  },
}

async function build() {
  if (isWatch) {
    const ctx = await esbuild.context(buildOptions)
    await ctx.watch()
    console.log('Watching for changes...')
  } else {
    const startTime = Date.now()
    const result = await esbuild.build(buildOptions)

    if (result.errors.length > 0) {
      console.error('Build failed:', result.errors)
      process.exit(1)
    }

    const duration = Date.now() - startTime
    console.log(`Build completed in ${duration}ms`)
  }
}

build().catch((error) => {
  console.error('Build error:', error)
  process.exit(1)
})
