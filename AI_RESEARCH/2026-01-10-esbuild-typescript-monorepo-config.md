# Research: esbuild Configuration for TypeScript Monorepos with Path Aliases

Date: 2026-01-10

## Summary

This research covers comprehensive guidance on configuring esbuild for TypeScript monorepos with path aliases, including automatic path resolution, recommended plugins, extension handling, and best practices for pnpm workspaces.

## Key Findings

### 1. Automatic Path Resolution with esbuild

**Critical Limitation**: esbuild's path resolution for TypeScript aliases (`compilerOptions.paths`) **only works when bundling is enabled** (`--bundle` flag).

When building without bundling, esbuild will not transform path aliases. This is a fundamental limitation of esbuild's design - path resolution only occurs during the bundling phase.

**How It Works**:
- esbuild automatically discovers and reads `tsconfig.json` files from the closest parent directory
- During bundling, esbuild's path resolution algorithm considers the `compilerOptions` settings
- It transforms imports like `@utils/helper` to relative paths based on your configuration

**Example tsconfig.json Configuration**:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@components/*": ["src/components/*"],
      "@utils/*": ["src/utils/*"],
      "@storage/*": ["src/storage/*"],
      "@/*": ["src/*"]
    }
  }
}
```

### 2. Plugin-Based Solutions

When bundling is not an option or you need additional control, several plugins provide path alias resolution:

#### A. @esbuild-plugins/tsconfig-paths (Recommended)

**Installation**:
```bash
npm install --save-dev @esbuild-plugins/tsconfig-paths
```

**Usage**:
```javascript
import { build } from 'esbuild';
import tsconfigPathsPlugin from '@esbuild-plugins/tsconfig-paths';

await build({
  entryPoints: ['src/index.ts'],
  bundle: false,
  format: 'esm',
  plugins: [
    tsconfigPathsPlugin({
      cwd: process.cwd(),
      tsconfig: 'tsconfig.json'
    })
  ],
  outfile: 'dist/index.js'
});
```

#### B. esbuild-plugin-tsconfig-paths

**Installation**:
```bash
npm install --save-dev esbuild-plugin-tsconfig-paths
```

**Basic Usage**:
```javascript
import { tsconfigPathsPlugin } from 'esbuild-plugin-tsconfig-paths';
import esbuild from 'esbuild';

esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  plugins: [
    tsconfigPathsPlugin({
      cwd: process.cwd(),
      tsconfig: 'tsconfig.json',
      filter: /.*/ // Which files will be transformed
    })
  ],
  outfile: 'dist/index.js'
});
```

**Configuration Options**:
- `filter` (RegExp): Selects which files to apply the transformation to (default: `/.*/)
- `tsconfig` (string): Name of the tsconfig file (default: `tsconfig.json`)
- `cwd` (string): Directory containing the tsconfig file (default: `process.cwd()`)

**How It Works**: Converts aliases like `@/utils/util` to relative paths like `../utils/util` during the onLoad phase

#### C. @awalgawe/esbuild-typescript-paths-plugin

Similar to the above options, this plugin also intercepts import statements and resolves aliases defined in `tsconfig.json`.

### 3. File Extension Handling

#### The Problem

When transpiling TypeScript to JavaScript without bundling:
- Node.js ESM (when using `"type": "module"`) does **not** resolve extensions for import statements
- You cannot `import './file'` and expect it to find `./file.js`
- TypeScript emits `import` statements without extensions, which Node.js cannot resolve

#### Solution: resolveExtensions Configuration

esbuild provides the `resolveExtensions` option to control which file extensions are checked during module resolution.

**Default Extension Order**:
```
.tsx, .ts, .jsx, .js, .css, .json
```

**Custom Configuration**:
```javascript
await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  resolveExtensions: ['.ts', '.tsx', '.js', '.jsx'],
  outfile: 'dist/index.js'
});
```

**CLI Usage**:
```bash
esbuild app.js --bundle --resolve-extensions=.ts,.js
```

#### Important Notes
- esbuild **deliberately excludes** `.mjs` and `.cjs` from implicit resolution since Node's resolver doesn't treat these as implicit extensions
- When building without bundling, you need to manually add `.js` extensions to imports in your source code or use a plugin

#### Plugin Solution: esbuild-plugin-file-path-extensions

For projects that need automatic extension injection:
```bash
npm install --save-dev esbuild-plugin-file-path-extensions
```

This plugin automatically appends appropriate extensions (`.js` for CJS, `.mjs` for ESM) to imports when not bundling.

### 4. pnpm Monorepo Best Practices

#### Workspace Configuration

Use the `workspace:*` protocol when referencing internal packages in `package.json`:

```json
{
  "dependencies": {
    "@myapp/utils": "workspace:*",
    "@myapp/storage": "workspace:*"
  }
}
```

#### Dependency Management
- **Hoist common devDependencies** to the workspace root to avoid duplication
- **Pin critical versions** explicitly
- **Use peer dependencies** for shared libraries like React to prevent version conflicts
- pnpm's strict node_modules prevents "phantom dependencies" - only explicitly declared dependencies are accessible

#### Build Orchestration

Recommended pattern for monorepos:
```bash
# 1. Pre-build types
bob-esbuild tsc

# 2. Run prepack scripts in all packages
pnpm -r prepack
```

#### esbuild Integration

Key advantages when using esbuild with pnpm:
- esbuild **automatically resolves all local references** when TypeScript project references are configured
- For Yarn users specifically: use `@yarnpkg/esbuild-plugin-pnp` to resolve dependencies from Yarn's PnP cache
- pnpm workspaces work seamlessly with esbuild's default resolution without additional plugins

#### Shared Configuration Pattern

Move esbuild configuration to workspace root to avoid duplication:
```
root/
├── esbuild.config.js (shared config)
├── esbuild.css.plugin.js (shared plugin)
└── packages/
    ├── components/
    ├── hooks/
    └── utils/
```

Packages reference shared config via relative paths.

### 5. Advanced Configuration Examples

#### Complete Monorepo esbuild Configuration

```javascript
import esbuild from 'esbuild';
import tsconfigPathsPlugin from '@esbuild-plugins/tsconfig-paths';

const sharedConfig = {
  platform: 'node',
  target: ['node16'],
  format: 'esm',
  sourcemap: true,
  splitting: true,
  logLevel: 'info'
};

export default async (options = {}) => {
  const config = {
    ...sharedConfig,
    entryPoints: ['src/index.ts'],
    outdir: 'dist',
    plugins: [
      tsconfigPathsPlugin({
        cwd: process.cwd(),
        tsconfig: 'tsconfig.json'
      })
    ],
    ...options
  };

  if (process.env.WATCH) {
    const context = await esbuild.context(config);
    await context.watch();
  } else {
    await esbuild.build(config);
  }
};
```

#### TypeScript + Path Aliases + No Bundling

For projects that need to output individual files (not bundled):

```javascript
import esbuild from 'esbuild';
import tsconfigPathsPlugin from '@esbuild-plugins/tsconfig-paths';

await esbuild.build({
  entryPoints: ['src/**/*.ts', '!src/**/*.test.ts'],
  outdir: 'dist',
  bundle: false,
  format: 'esm',
  resolveExtensions: ['.ts', '.tsx', '.js', '.jsx'],
  plugins: [
    tsconfigPathsPlugin({
      cwd: process.cwd()
    })
  ]
});
```

#### Custom Plugin for .js Extension Injection

When you need to maintain TypeScript source without extensions but output JavaScript with extensions:

```javascript
import esbuild from 'esbuild';

const extensionPlugin = {
  name: 'add-js-extension',
  setup(build) {
    build.onResolve({ filter: /^@/ }, args => {
      // This handles our path aliases
      // The alias resolution happens, but we may need to add extensions
      return;
    });

    build.onLoad({ filter: /\.js$/ }, async args => {
      const contents = await fs.promises.readFile(args.path, 'utf8');

      // Add .js extensions to imports that don't have them
      const modified = contents.replace(
        /from\s+['"]([^'"]+)(?<!\.js|\.mjs|\.cjs)(['"]);/g,
        "from '$1.js'$2;"
      );

      return { contents: modified, loader: 'js' };
    });
  }
};
```

## Plugin Comparison

| Plugin | Purpose | Bundling Required | Best For |
|--------|---------|------------------|----------|
| `@esbuild-plugins/tsconfig-paths` | Resolve path aliases | No (works with both) | Standard monorepos, non-bundled builds |
| `esbuild-plugin-tsconfig-paths` | Resolve path aliases | No (works with both) | Similar to above, alternative option |
| `esbuild-plugin-file-path-extensions` | Add file extensions | No | Projects needing explicit .js extensions |
| `esbuild-plugin-tsc` | Compile with tsc | Either | Projects needing tsc compatibility |
| `@yarnpkg/esbuild-plugin-pnp` | Yarn PnP resolution | Either | Yarn-based monorepos only |

## Key Takeaways

1. **Bundling enables automatic path resolution** - If you can bundle your code, esbuild handles path aliases automatically by reading tsconfig.json

2. **Use a plugin for non-bundled builds** - Use `@esbuild-plugins/tsconfig-paths` or `esbuild-plugin-tsconfig-paths` when you cannot or don't want to bundle

3. **Extension handling is critical** - Use `resolveExtensions` config option or extension-adding plugins to ensure Node.js can import files without explicit extensions

4. **pnpm monorepos work well with esbuild** - Use workspace:* protocol, hoist dependencies, and leverage esbuild's automatic local reference resolution

5. **Plugin performance matters** - Plugins add overhead; use narrow filters and avoid calling JavaScript from esbuild's hot paths

6. **Configuration reuse in monorepos** - Move esbuild config to root and reference from packages to maintain consistency

## Gaps Identified

- Official esbuild documentation doesn't provide detailed monorepo examples
- No built-in solution in esbuild for extension rewriting without bundling or plugins
- Limited discussion of performance implications of plugins in large monorepos

## Recommendations for Next Steps

For implementation in your nightreign-query monorepo:
1. **Architecture Review** - The system-architecture-reviewer agent can evaluate whether bundling or non-bundled approach suits your needs
2. **Implementation** - Once architecture is decided, the nextjs-expert agent (if applicable) or a build-system expert can implement the chosen solution
3. **Testing** - The unit-test-maintainer agent can create tests to verify path resolution works correctly
4. **TypeScript Configuration** - The typescript-expert agent can ensure tsconfig.json is properly structured for monorepo use

## Sources Consulted

- [esbuild Official API Documentation](https://esbuild.github.io/api/)
- [esbuild Plugins Documentation](https://esbuild.github.io/plugins/)
- [esbuild Content Types](https://esbuild.github.io/content-types/)
- [esbuild Getting Started Guide](https://esbuild.github.io/getting-started/)
- [@esbuild-plugins/tsconfig-paths npm package](https://www.npmjs.com/package/@esbuild-plugins/tsconfig-paths)
- [esbuild-plugin-tsconfig-paths GitHub](https://github.com/wjfei/esbuild-plugin-tsconfig-paths)
- [esbuild-plugin-file-path-extensions npm package](https://www.npmjs.com/package/esbuild-plugin-file-path-extensions)
- [Mastering esbuild TypeScript Paths](https://www.xjavascript.com/blog/esbuild-typescript-paths/)
- [Introducing esbuild To Your Monorepo](https://dev.to/mbarzeev/introducing-esbuild-to-your-monorepo-1fa6)
- [esbuild GitHub Issues - Path Alias Discussions](https://github.com/evanw/esbuild/issues/)
- [Complete Monorepo Guide: pnpm + Workspace + Changesets](https://jsdev.space/complete-monorepo-guide/)
