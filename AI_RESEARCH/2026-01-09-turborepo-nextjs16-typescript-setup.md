# Research: Turborepo Setup with Next.js 16 and TypeScript Backend

Date: 2026-01-09

## Summary

This research covers current best practices (2025-2026) for setting up a Turborepo monorepo containing a Next.js 16 frontend and a TypeScript backend application. The research includes folder structure, shared packages, Biome configuration, Prisma setup with SQLite, and modern build tooling recommendations.

## Prior Research

No prior AI_RESEARCH files were found. This is the first comprehensive research document for this project.

## Current Findings

### 1. Turborepo Current State (2025-2026)

**Latest Version:** Turborepo 2.7 (released December 19, 2025)

**Key Features in Turborepo 2.7:**
- Devtools for visualizing Package Graph and Task Graph (`turbo devtools`)
- Composable configuration allowing Package Configurations to extend from other configurations
- Yarn 4 catalogs support (Yarn 4.10.0+)
- Enhanced environment variable safety with Biome 2.3.10+ integration

**Core Capabilities:**
- Incremental builds (never rebuild the same code twice)
- Remote caching (share build artifacts across your team)
- Parallel execution (run tasks across multiple packages simultaneously)
- Task pipelines (define dependencies between tasks)

**Upgrade Command:**
```bash
npx @turbo/codemod migrate
```

**Create New Project:**
```bash
npx create-turbo@latest
```

### 2. Next.js Version Status (2025-2026)

**Current Version:** Next.js 16.1 (released December 18, 2025)

**Next.js 16 is the current LTS version** - released October 21, 2025. Next.js 16 is NOT in beta - it is stable and production-ready.

**Major Features in Next.js 16:**

1. **Turbopack as Default Bundler** (Stable)
   - Up to 10x-14x faster development startup times with file system caching
   - 5-10x faster Fast Refresh
   - 2-5x faster builds

2. **Cache Components** (New Programming Model)
   - Uses Partial Pre-Rendering (PPR) and `use cache`
   - Opt-in caching (no more implicit caching)
   - All dynamic code executed at request time by default

3. **proxy.ts replaces middleware.ts**
   - Makes app's network boundary explicit
   - Runs on Node.js runtime

4. **React 19.2 Support**
   - View Transitions
   - useEffectEvent
   - Activity components

5. **React Compiler Support** (Stable)
   - Automatic memoization
   - Zero manual code changes needed
   - Reduces unnecessary re-renders

6. **Next.js DevTools MCP**
   - Model Context Protocol integration
   - AI-assisted debugging with contextual insight

**Next.js 16.1 Additional Features:**
- Turbopack File System Caching (stable, on by default)
- New experimental Bundle Analyzer for Turbopack
- New `next upgrade` command
- 20MB smaller install size

### 3. Recommended Folder Structure for Turborepo

**Official Recommendation:** Split packages into `apps/` for applications and `packages/` for libraries and tooling.

```
nightreign-query/
├── apps/
│   ├── web/                    # Next.js 16 frontend
│   │   ├── app/               # App Router structure
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── search/
│   │   ├── components/
│   │   ├── public/
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   ├── tsconfig.json
│   │   └── .env.local
│   └── api/                    # TypeScript backend (Node.js)
│       ├── src/
│       │   ├── index.ts
│       │   ├── routes/
│       │   └── services/
│       ├── package.json
│       ├── tsconfig.json
│       └── .env
├── packages/
│   ├── database/              # Prisma + SQLite
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── client.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── generated/
│   │   │   └── prisma/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── types/                 # Shared TypeScript types
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── typescript-config/     # Shared tsconfig files
│       ├── base.json
│       ├── nextjs.json
│       ├── node.json
│       └── package.json
├── turbo.json
├── biome.json
├── package.json
├── pnpm-workspace.yaml        # or package.json workspaces
└── .gitignore
```

**Key Structure Rules:**
- Each directory with a `package.json` in apps/ or packages/ is considered a package
- Use namespace prefix for internal packages (e.g., `@repo/db`, `@repo/types`)
- Application packages should be "end nodes" - not installed into other packages
- Library packages support applications but aren't independently deployable
- **No nested packages** - Turborepo doesn't support `apps/**` or `packages/**` patterns
- If grouping packages, use `packages/*` and `packages/group/*` without creating `packages/group/package.json`

### 4. Next.js 16 App Router Best Practices

**Server Components vs Client Components:**

- **Default Behavior:** All components are Server Components by default
- **Server Components:** Run on server, no JavaScript in client bundle, better for SEO and initial load
- **Client Components:** Use when you need state, event handlers, browser APIs, or lifecycle hooks

**The 'use client' Directive:**
- Only add to files whose components you want to render directly within Server Components
- Creates a client-server boundary
- Components exported from 'use client' files serve as entry points to the client
- No need to add to every file - children components are automatically client components

**Search UI Pattern for Next.js 16:**

For a search interface:
- **Layout/Container:** Server Component (static elements, logo, nav)
- **Search Input/Form:** Client Component (needs `onChange`, `onSubmit`)
- **Search Results:** Server Component (data fetching, can be streamed)
- **Result Interactions:** Client Component (like buttons, filters)

**Composition Pattern:**
```tsx
// app/layout.tsx (Server Component)
export default function Layout({ children }) {
  return (
    <div>
      <Logo /> {/* Server Component */}
      <SearchBar /> {/* Client Component */}
      {children}
    </div>
  )
}

// components/SearchBar.tsx (Client Component)
'use client'
export function SearchBar() {
  const [query, setQuery] = useState('')
  return <input onChange={(e) => setQuery(e.target.value)} />
}
```

**Response Streaming for Fast Perceived Performance:**

Next.js 16 streaming features:
- **Suspense Boundaries:** Wrap slow-loading parts with `<Suspense>` to stream HTML progressively
- **Selective Re-rendering:** Only changed parts of layout tree re-fetch during navigation
- **Intelligent Prefetching:** Routes prefetched based on visibility and intent
- **Layout Optimization:** Layouts (like headers) fetched and rendered once, persist across navigation
- **Streaming with Suspense:** Improves perceived performance significantly

**Key Performance Insight:**
> "A well-designed loading state can make a 2-second wait feel quicker than 1 second spent staring at a blank screen."

**Best Practices for 2025:**
- Keep components server by default
- Make client components small and event-driven
- Use `revalidate` and `cache: 'force-cache'` intentionally
- For dashboards, opt into `no-store` only where needed
- Validate input with Zod
- Return typed payloads, not strings

### 5. TypeScript Backend App Structure in Turborepo

**TypeScript Configuration:**

Each package should have its own `tsconfig.json` instead of referencing root config. This makes Turborepo caching more effective.

**Shared TypeScript Config Package Structure:**

```
packages/typescript-config/
├── base.json              # Extended by all packages
├── nextjs.json           # For Next.js apps
├── node.json             # For Node.js/backend apps
└── package.json
```

**base.json Recommended Compiler Options:**
```json
{
  "compilerOptions": {
    "esModuleInterop": true,
    "skipLibCheck": true,
    "target": "ES2022",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true
  }
}
```

**Backend App tsconfig.json:**
```json
{
  "extends": "@repo/typescript-config/node.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Package.json exports pattern:**
```json
{
  "exports": {
    "./base": "./base.json",
    "./nextjs": "./nextjs.json",
    "./node": "./node.json"
  }
}
```

### 6. Build Tooling for TypeScript Backend (2025)

**Comparison of Build Tools:**

| Tool | Best For | Key Feature | Use Case |
|------|----------|-------------|----------|
| **esbuild** | Build speed, bundling | Written in Go, blazing fast | Production builds, large codebases |
| **tsx** | Development/execution | Drop-in ts-node replacement with esbuild speed | Development, running scripts |
| **tsup** | Library bundling | Zero-config, dual ESM/CJS output | Building packages for npm |
| **tsdown** | Library bundling (NEW) | Faster than tsup, better type generation | Modern alternative to tsup |

**Recommendations for Backend App:**

1. **For Development (Running/Watching):**
   - **tsx** - Fastest execution, built-in watch mode, clean REPL
   ```bash
   tsx watch src/index.ts
   ```

2. **For Production Build:**
   - **esbuild** - Fastest bundling, minimal configuration
   - Handles TypeScript compilation and bundling
   ```bash
   esbuild src/index.ts --bundle --platform=node --outfile=dist/index.js
   ```

3. **For Package Libraries (in packages/):**
   - **tsdown** (new, recommended) - or **tsup** (established)
   - Zero-config, dual ESM/CJS output
   ```bash
   tsup src/index.ts --format esm,cjs --dts
   ```

**Backend App package.json Scripts:**
```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "esbuild src/index.ts --bundle --platform=node --outfile=dist/index.js --minify",
    "start": "node dist/index.js",
    "check-types": "tsc --noEmit"
  },
  "devDependencies": {
    "tsx": "^4.x",
    "esbuild": "^0.24.x",
    "typescript": "^5.7.x",
    "@repo/typescript-config": "*"
  }
}
```

**Native Node.js TypeScript Note:**
Starting from Node.js v22.6.0, there's experimental native TypeScript support with type stripping. However, for production use in 2025-2026, the tooling above is still recommended.

### 7. Shared Packages Best Practices

**What Should Be Shared:**

1. **@repo/types** - Shared TypeScript types
   - API request/response types
   - Domain models
   - Shared enums and constants
   - Zod schemas for validation

2. **@repo/database** - Database client and schema
   - Prisma schema
   - Generated Prisma client
   - Database utilities
   - Seed scripts

3. **@repo/typescript-config** - Shared tsconfig files
   - base.json
   - nextjs.json
   - node.json

4. **@repo/ui** (optional if building UI components)
   - Shared React components
   - Design system primitives

**Package Naming Convention:**
Use namespace prefix `@repo/` to avoid conflicts with npm registry packages.

**Best Practices:**
- Each package should have a single "purpose"
- Avoid putting shared code in Application Packages
- Use `workspace:*` protocol for internal package dependencies
- Internal packages export via `exports` field in package.json
- Avoid crossing package boundaries with `../` - always import via package name

**Types Package Structure:**
```
packages/types/
├── src/
│   ├── index.ts           # Main exports
│   ├── api.ts            # API types
│   ├── models.ts         # Domain models
│   └── schemas.ts        # Zod schemas
├── package.json
└── tsconfig.json
```

**Types package.json:**
```json
{
  "name": "@repo/types",
  "version": "0.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

### 8. Biome Setup for Turborepo

**Latest Integration:** Biome 2.3.10+ has built-in Turborepo domain support

**Key Features:**
- Finds environment variables that can cause unexpected cache hits
- Automatically activates Turborepo domain when detecting dependencies
- Extraordinarily fast (Turborepo recommends using as Root Task)
- Monorepo support since Biome v2

**Configuration Approach:**

**Option 1: Root Task (Recommended by Turborepo)**
Single `biome.json` at root, run via root task. Less configuration, but cache misses on Biome upgrades.

**Option 2: Package Tasks**
Separate Biome scripts in each package. Higher cache hit ratios, more configuration.

**Root biome.json Configuration:**
```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "ignoreUnknown": false,
    "ignore": [
      "node_modules",
      "dist",
      ".next",
      "generated"
    ]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "asNeeded"
    }
  },
  "organizeImports": {
    "enabled": true
  }
}
```

**Nested Configuration (for specific packages):**
```json
{
  "root": false,
  "extends": "//",  // Microsyntax to extend root config (Biome v2)
  "formatter": {
    "indentWidth": 4  // Override for this package
  }
}
```

**turbo.json Integration:**
```json
{
  "tasks": {
    "lint": {
      "dependsOn": ["^lint"],
      "inputs": ["src/**/*.{ts,tsx}", "biome.json"]
    },
    "format": {
      "dependsOn": ["^format"],
      "outputs": ["src/**/*.{ts,tsx}"]
    }
  }
}
```

**Root package.json Scripts:**
```json
{
  "scripts": {
    "lint": "biome lint .",
    "format": "biome format --write .",
    "check": "biome check --write ."
  }
}
```

**Installation:**
```bash
pnpm add -D -w @biomejs/biome
```

### 9. Prisma with SQLite in Turborepo

**Official Structure:** Create `packages/database` with Prisma schema and generated client

**Complete Setup:**

**packages/database/package.json:**
```json
{
  "name": "@repo/database",
  "version": "0.0.0",
  "scripts": {
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev --skip-generate",
    "db:deploy": "prisma migrate deploy",
    "db:push": "prisma db push",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^6.6.0"
  },
  "devDependencies": {
    "prisma": "^6.6.0"
  },
  "exports": {
    ".": "./src/index.ts",
    "./client": "./src/client.ts"
  }
}
```

**packages/database/prisma/schema.prisma:**
```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../generated/prisma"  // Custom output path
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id    String @id @default(cuid())
  name  String
  email String @unique
}
```

**packages/database/src/client.ts:**
```typescript
import { PrismaClient } from '../generated/prisma'

declare global {
  // Prevent multiple instances in development
  var prisma: PrismaClient | undefined
}

export const db =
  global.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') global.prisma = db
```

**packages/database/src/index.ts:**
```typescript
export * from '../generated/prisma'
export { db } from './client'
```

**packages/database/.env:**
```
DATABASE_URL="file:./dev.db"
```

**packages/database/tsconfig.json:**
```json
{
  "extends": "@repo/typescript-config/node.json",
  "include": ["src/**/*", "prisma/**/*"],
  "exclude": ["node_modules", "generated"]
}
```

**Critical turbo.json Configuration:**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalEnv": ["DATABASE_URL"],
  "tasks": {
    "build": {
      "dependsOn": ["^build", "^db:generate"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "dependsOn": ["^db:generate"],
      "cache": false,
      "persistent": true
    },
    "db:generate": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    },
    "db:push": {
      "cache": false
    }
  }
}
```

**Using in Apps:**

**apps/web/package.json and apps/api/package.json:**
```json
{
  "dependencies": {
    "@repo/database": "*"
  }
}
```

**Usage in code:**
```typescript
import { db, User } from '@repo/database'

const users = await db.user.findMany()
```

**.gitignore:**
```
# Prisma
**/prisma/dev.db
**/prisma/dev.db-journal
**/generated/
```

**Key Setup Points:**
1. Custom output path (`../generated/prisma`) ensures compatibility across package managers
2. `db:generate` must run before `dev` and `build` (configured in turbo.json)
3. `DATABASE_URL` in `globalEnv` for correct task hashing
4. Singleton PrismaClient pattern prevents multiple instances
5. Export both client instance and types from src/index.ts
6. Never cache Prisma generation tasks

### 10. Complete Root Configuration Files

**package.json (Root):**
```json
{
  "name": "nightreign-query",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "biome lint .",
    "format": "biome format --write .",
    "check": "biome check --write .",
    "db:generate": "turbo run db:generate",
    "db:migrate": "turbo run db:migrate",
    "db:studio": "turbo run db:studio"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.4",
    "turbo": "^2.7.0",
    "typescript": "^5.7.2"
  },
  "packageManager": "pnpm@9.15.4",
  "engines": {
    "node": ">=20.0.0"
  }
}
```

**pnpm-workspace.yaml:**
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**turbo.json (Complete):**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "globalEnv": ["DATABASE_URL", "NODE_ENV"],
  "tasks": {
    "build": {
      "dependsOn": ["^build", "^db:generate"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"],
      "env": ["DATABASE_URL"]
    },
    "dev": {
      "dependsOn": ["^db:generate"],
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "check-types": {
      "dependsOn": ["^check-types"]
    },
    "db:generate": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    },
    "db:push": {
      "cache": false
    },
    "db:studio": {
      "cache": false,
      "persistent": true
    }
  }
}
```

**.gitignore:**
```
# Dependencies
node_modules
.pnp
.pnp.js

# Testing
coverage

# Next.js
.next/
out/
build
dist/

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env
.env*.local

# Vercel
.vercel

# Typescript
*.tsbuildinfo

# Turbo
.turbo

# Prisma
**/prisma/dev.db
**/prisma/dev.db-journal
**/generated/

# Biome
.biome/
```

### 11. Key Dependencies Summary

**Root Dependencies:**
```json
{
  "devDependencies": {
    "@biomejs/biome": "^1.9.4",
    "turbo": "^2.7.0",
    "typescript": "^5.7.2"
  }
}
```

**Next.js App (apps/web):**
```json
{
  "dependencies": {
    "next": "^16.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@repo/database": "*",
    "@repo/types": "*"
  },
  "devDependencies": {
    "@types/node": "^22.10.5",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@repo/typescript-config": "*",
    "typescript": "^5.7.2"
  }
}
```

**Backend App (apps/api):**
```json
{
  "dependencies": {
    "@repo/database": "*",
    "@repo/types": "*"
  },
  "devDependencies": {
    "@types/node": "^22.10.5",
    "@repo/typescript-config": "*",
    "esbuild": "^0.24.2",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2"
  }
}
```

**Database Package (packages/database):**
```json
{
  "dependencies": {
    "@prisma/client": "^6.6.0"
  },
  "devDependencies": {
    "@repo/typescript-config": "*",
    "prisma": "^6.6.0",
    "typescript": "^5.7.2"
  }
}
```

**Types Package (packages/types):**
```json
{
  "dependencies": {
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@repo/typescript-config": "*",
    "typescript": "^5.7.2"
  }
}
```

**TypeScript Config Package (packages/typescript-config):**
```json
{
  "devDependencies": {
    "typescript": "^5.7.2"
  }
}
```

## Key Takeaways

### Version Status
- **Turborepo 2.7** is current (December 2025)
- **Next.js 16.1** is current and stable LTS (NOT beta)
- **Turbopack** is now default and stable in Next.js 16
- **React 19.2** is included with Next.js 16
- **Biome 2.3.10+** has Turborepo integration

### Critical Setup Requirements
1. **Each package needs own package.json** - Turborepo uses these to define package boundaries
2. **Each package needs own tsconfig.json** - Better caching
3. **db:generate must run before dev/build** - Configure in turbo.json dependencies
4. **DATABASE_URL in globalEnv** - Ensures correct task hashing
5. **Custom Prisma output path** - Required for monorepo compatibility
6. **Use namespace prefix** - `@repo/*` for all internal packages
7. **Never use ../` to cross packages** - Always import via package name

### Build Tool Recommendations
- **Development:** tsx (fast execution, watch mode)
- **Production Build:** esbuild (fastest bundling)
- **Package Libraries:** tsdown or tsup (zero-config)

### Next.js 16 Performance Strategy
- Server Components by default
- Small, focused Client Components
- Suspense boundaries for streaming
- Intelligent prefetching (viewport-based)
- React Compiler for automatic optimization

### Biome Configuration
- Use as Root Task (Turborepo recommendation)
- Single biome.json at root
- Nested configs can extend with `"extends": "//"`
- Set `"root": false` in nested configs

### Prisma Best Practices
- Dedicated `packages/database` package
- Custom output directory for generated client
- Singleton PrismaClient with global check
- Export both client and types
- Never cache generation/migration tasks

### Gotchas and Warnings
1. **No nested packages** - `apps/**` pattern not supported
2. **Prisma output conflicts** - Use custom output path
3. **Multiple Prisma clients** - Will overwrite each other (requires advanced setup)
4. **Biome version upgrades** - Cause cache misses if using root task
5. **Missing db:generate** - Will cause type errors in dev/build
6. **proxy.ts vs middleware.ts** - Next.js 16 changed this pattern
7. **Caching opt-in** - Next.js 16 uses opt-in caching, not implicit

## Sources

### Turborepo Documentation
- [Turborepo 2.7 Release](https://turborepo.com/blog/turbo-2-7)
- [Turborepo Releases](https://github.com/vercel/turborepo/releases)
- [Turborepo Introduction](https://turborepo.com/docs)
- [Structuring a Repository](https://turborepo.com/docs/crafting-your-repository/structuring-a-repository)
- [Package Types](https://turborepo.com/docs/core-concepts/package-types)
- [Internal Packages](https://turborepo.com/docs/core-concepts/internal-packages)
- [Creating Internal Package](https://turborepo.com/docs/crafting-your-repository/creating-an-internal-package)
- [TypeScript Guide](https://turborepo.com/docs/guides/tools/typescript)
- [Biome Guide](https://turborepo.com/docs/guides/tools/biome)
- [Prisma Guide](https://turborepo.com/docs/guides/tools/prisma)

### Next.js Documentation
- [Next.js 16 Release](https://nextjs.org/blog/next-16)
- [Next.js 16.1 Release](https://nextjs.org/blog/next-16-1)
- [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [use client Directive](https://nextjs.org/docs/app/api-reference/directives/use-client)
- [Upgrading to Version 16](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [React Foundations: Server and Client Components](https://nextjs.org/learn/react-foundations/server-and-client-components)

### Prisma Documentation
- [Prisma with Turborepo](https://www.prisma.io/docs/guides/turborepo)
- [Using Prisma ORM with Turborepo](https://www.prisma.io/docs/guides/using-prisma-orm-with-turborepo)
- [Initialize Turborepo with Prisma](https://www.prisma.io/docs/ai/prompts/turborepo)

### Biome Documentation
- [Biome Big Projects Guide](https://biomejs.dev/guides/big-projects/)

### Community Resources
- [Complete Guide to Turborepo (DEV)](https://dev.to/araldhafeeri/complete-guide-to-turborepo-from-zero-to-production-3ehb)
- [Turborepo Monorepo Guide (Medium)](https://medium.com/@reactjsbd/the-complete-guide-to-setting-up-a-turborepo-monorepo-for-e-commerce-projects-51943d9deb48)
- [TypeScript Backend Turborepo Setup (Medium)](https://medium.com/@reactjsbd/next-js-16-revolutionary-performance-gains-and-developer-experience-enhancements-919b2a0407e4)
- [Next.js 16 Performance Guide (Medium)](https://medium.com/@mernstackdevbykevin/next-js-16-lightning-speed-performance-smarter-caching-that-finally-make-sense-5c7120ff47d8)
- [Streaming with Next.js App Router (Medium)](https://medium.com/better-dev-nextjs-react/streaming-the-web-building-faster-smarter-interfaces-with-next-js-app-router-92c73725d0e0)
- [tsx vs ts-node Comparison (Better Stack)](https://betterstack.com/community/guides/scaling-nodejs/tsx-vs-ts-node/)
- [TypeScript Build Tools Comparison (Better Stack)](https://betterstack.com/community/guides/scaling-nodejs/ts-node-alternatives/)
- [tsup Guide (LogRocket)](https://blog.logrocket.com/tsup/)

## Recommendations for Next Steps

Based on this research, the following implementation approach is recommended:

1. **Initial Setup:**
   - Use the `system-architecture-reviewer` agent to validate the proposed folder structure
   - Use the `nextjs-expert` agent to set up the Next.js 16 app with proper App Router structure
   - Use the `typescript-expert` agent to create the TypeScript backend app and shared packages

2. **Database Configuration:**
   - Follow the Prisma setup exactly as documented above
   - Ensure turbo.json task dependencies are configured correctly

3. **Development Workflow:**
   - Use Biome for linting/formatting (faster than ESLint/Prettier)
   - Configure pre-commit hooks if needed
   - Use `turbo devtools` to visualize dependency graph

4. **Testing Strategy:**
   - Use the `unit-test-maintainer` agent to create test infrastructure
   - Consider Vitest for unit tests (faster than Jest)

5. **Performance Monitoring:**
   - Leverage Next.js 16's built-in analytics
   - Monitor Turbopack build times
   - Use React DevTools Profiler for component optimization

## Additional Resources

- [Turborepo Examples](https://github.com/vercel/turborepo/tree/main/examples)
- [Next.js Conf 2025 Recordings](https://nextjs.org/conf)
- [React 19 Documentation](https://react.dev)
- [Biome vs ESLint/Prettier Comparison](https://biomejs.dev/internals/philosophy/)
- [TypeScript 5.7 Release Notes](https://devblogs.microsoft.com/typescript/)
