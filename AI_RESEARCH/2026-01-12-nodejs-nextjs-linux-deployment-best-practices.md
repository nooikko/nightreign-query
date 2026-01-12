# Research: Node.js/Next.js Production Deployment on Linux with GPU Support

Date: 2026-01-12

## Summary

Comprehensive research on deploying Node.js/Next.js applications on Linux servers with GPU support (RTX 3070), focusing on process management alternatives to Docker and screen, CI/CD best practices for pnpm monorepos with Turborepo, and deployment strategies.

## Prior Research

Consulted existing research:
- `/AI_RESEARCH/2026-01-09-turborepo-nextjs16-typescript-setup.md` - Monorepo configuration
- Project uses: Turborepo 2.7, Next.js 16.1, pnpm 9.15.4, Node.js >=20.0.0

## Current Findings

### 1. Process Management: PM2 vs systemd vs screen

#### PM2 (Recommended for Node.js)

**Official Description:**
> "PM2 is an advanced production process manager for Node.js applications with built-in load balancer, zero-downtime reload, startup scripts, monitoring, and microservice management features."
> — Source: [PM2 Official Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)

**Key Features:**
- Automatic process daemonization and monitoring
- Load balancing across multiple processes (cluster mode)
- Zero-downtime application reloading
- Real-time log streaming and historical log access
- File-watching with automatic restart functionality
- Memory threshold management for process recycling
- Startup script generation for systemd/upstart/launchd

**Configuration - Ecosystem File:**
```javascript
module.exports = {
  apps: [{
    name: "nightreign-web",
    script: "node_modules/next/dist/bin/next",
    args: "start",
    cwd: "/path/to/nightreign-query/apps/web",
    instances: "max",
    exec_mode: "cluster",
    env_production: {
      NODE_ENV: "production",
      PORT: 3000
    }
  }, {
    name: "nightreign-scraper",
    script: "./index.js",
    cwd: "/path/to/nightreign-query/apps/scraper",
    instances: 1,
    exec_mode: "fork",
    env_production: {
      NODE_ENV: "production"
    }
  }]
}
```

**Startup Persistence:**
```bash
# Generate systemd startup script
pm2 startup systemd

# Save current process list
pm2 save

# Restore on reboot (automatic after setup)
pm2 resurrect
```

**Pros:**
- Developer-friendly with simple CLI commands
- Built-in cluster mode for multi-core utilization
- Zero-downtime reloads (`pm2 reload app`)
- Excellent monitoring (`pm2 monit`, `pm2 logs`)
- Easy environment management
- No manual service file creation needed
- Centralized configuration for multiple apps

**Cons:**
- Additional dependency (not native to OS)
- Slightly more resource overhead than systemd
- Another tool to learn and maintain

**Sources:**
- [PM2 Quick Start](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/pm2-doc-single-page/)
- [Mastering PM2 for Next.js](https://dev.to/sasithwarnakafonseka/mastering-pm2-optimizing-nodejs-and-nextjs-applications-for-performance-and-scalability-4552)
- [Managing Next.js with PM2](https://dev.to/mochafreddo/managing-nextjs-and-nestjs-applications-in-production-with-pm2-3j25)

---

#### systemd (Native Linux Solution)

**Official Description:**
> "systemd is the default init system and service manager for most modern Linux distributions. It is responsible for starting, stopping, and managing all system services."
> — Source: [DigitalOcean Tutorial](https://www.digitalocean.com/community/tutorials/how-to-deploy-node-js-applications-using-systemd-and-nginx)

**Configuration - Service File:**
```ini
[Unit]
Description=Nightreign Query Web App
After=network.target

[Service]
Type=simple
User=nightreign
Group=nightreign
WorkingDirectory=/home/nightreign/nightreign-query/apps/web
ExecStart=/usr/bin/node /home/nightreign/nightreign-query/apps/web/.next/standalone/server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=nightreign-web
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

**Service Management:**
```bash
# Enable service to start on boot
sudo systemctl enable nightreign-web

# Start/stop/restart service
sudo systemctl start nightreign-web
sudo systemctl stop nightreign-web
sudo systemctl restart nightreign-web

# View status and logs
sudo systemctl status nightreign-web
sudo journalctl -u nightreign-web -f
```

**Pros:**
- Built into Linux, zero additional dependencies
- Zero performance overhead
- System-level stability and robustness
- Native integration with logging (journald)
- Precise control over service lifecycle
- Industry-standard for production servers

**Cons:**
- Manual service file creation required
- More complex syntax than PM2
- No built-in cluster mode (requires manual setup)
- Less developer-friendly for Node.js-specific features
- Separate service files for each app in monorepo

**Best Practices:**
- Set `NODE_ENV=production` for optimization
- Use dedicated system user for security
- Configure `Restart=always` for auto-recovery
- Log to syslog/journald for centralized logging
- Set `WorkingDirectory` for apps needing cwd context
- Use absolute paths for binaries

**Sources:**
- [DigitalOcean: Deploy Node.js with systemd](https://www.digitalocean.com/community/tutorials/how-to-deploy-node-js-applications-using-systemd-and-nginx)
- [Express.js Production Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [NodeSource: Running Node.js with systemd](https://nodesource.com/blog/running-your-node-js-app-with-systemd-part-1)

---

#### screen (Not Recommended for Production)

**Why Not screen:**
- No automatic restart on crash
- No persistence across server reboots
- Manual session management required
- No built-in logging
- No process monitoring
- Not designed for production workloads

**Verdict:** screen is only suitable for temporary development/testing sessions, not production deployments.

---

### 2. Next.js Production Deployment Best Practices

#### Official Recommendation: Node.js Server

**From Next.js Documentation:**
> "For self-hosted production deployments without Docker, Next.js officially recommends deploying as a Node.js server. Node.js deployments support all Next.js features."
> — Source: [Next.js Deployment Docs](https://nextjs.org/docs/deployment)

**Required Package.json Scripts:**
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

**Deployment Process:**
1. Run `npm run build` (or `pnpm build`)
2. Run `npm run start` (or `pnpm start`)

#### Standalone Output Mode (Recommended)

**Configuration:**
```js
// next.config.js
module.exports = {
  output: 'standalone',
}
```

**What It Does:**
> "Standalone output mode automatically creates a minimal, self-contained deployment package by tracing and including only the necessary files for production."
> — Source: [Next.js Output Config](https://nextjs.org/docs/app/api-reference/next-config-js/output)

**Benefits:**
- Drastically smaller deployments (excludes unused node_modules)
- No need for full `node_modules` installation on server
- Self-contained deployment package
- Uses `@vercel/nft` to trace dependencies
- Creates minimal `server.js` alternative to `next start`

**Deployment:**
```bash
# Start the standalone server
node .next/standalone/server.js

# With custom port/hostname
PORT=8080 HOSTNAME=0.0.0.0 node .next/standalone/server.js
```

**For Monorepo:**
```js
// next.config.js
const path = require('path')

module.exports = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
}
```

**Optional - Copy Static Assets:**
```bash
# Include public and static files
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
```

**Sources:**
- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Next.js Standalone Output](https://nextjs.org/docs/app/api-reference/next-config-js/output)
- [How to Deploy Next.js with PM2](https://dykraf.com/blog/deploying-nextjs-web-application-with-pm2)

---

### 3. GPU Pass-through for ML Workloads with Node.js

#### TensorFlow.js GPU Support

**Official Requirements:**
> "The GPU package runs tensor operations on the GPU with CUDA, so it's only available on Linux. CUDA must be installed on your machine with an NVIDIA graphics card before using tfjs-node-gpu."
> — Source: [TensorFlow.js Node.js Guide](https://www.tensorflow.org/js/guide/nodejs)

**Requirements:**
1. NVIDIA Graphics Card with CUDA support
2. CUDA installed on Linux system
3. `@tensorflow/tfjs-node-gpu` package

**Installation:**
```bash
npm install @tensorflow/tfjs-node-gpu
```

**Usage:**
```javascript
import * as tf from '@tensorflow/tfjs-node-gpu'
```

**Performance:**
> "The GPU package can be at least an order of magnitude faster than other binding options."
> — Source: [TensorFlow.js Node.js Guide](https://www.tensorflow.org/js/guide/nodejs)

**Platform Limitations:**
- **Linux only** for GPU support
- CPU package (`@tensorflow/tfjs-node`) works cross-platform
- No manual import of `@tensorflow/tfjs` needed (indirect dependency)

#### RTX 3070 Considerations (2026)

**Capabilities:**
- 5,888 CUDA cores
- 8GB GDDR6 VRAM
- Ampere architecture with 3rd-gen Tensor Cores
- 256-bit memory interface

**Use Cases:**
> "The RTX 3070 is perfect for learning AI development and working with smaller models, ideal for those just getting started with AI, and can run most tutorials and smaller models comfortably."
> — Source: [ExpertBeacon: RTX 3070 for ML](https://expertbeacon.com/is-rtx-3070-enough-for-machine-learning/)

**Limitations:**
- 8GB VRAM sufficient for models up to ~7B parameters
- Struggles with larger models (>7B parameters)
- Works well for inference and smaller training tasks

**Node.js Specific:**
- Most ML frameworks use Python (PyTorch, TensorFlow)
- Node.js interfaces with CUDA through `tfjs-node-gpu` or native bindings
- Performance comparable to Python for inference workloads
- Limited ecosystem compared to Python ML tools

**Sources:**
- [TensorFlow.js Node.js Guide](https://www.tensorflow.org/js/guide/nodejs)
- [@tensorflow/tfjs-node-gpu NPM](https://www.npmjs.com/package/@tensorflow/tfjs-node-gpu)
- [ExpertBeacon: RTX 3070 for ML](https://expertbeacon.com/is-rtx-3070-enough-for-machine-learning/)
- [Lambda Labs: RTX 30xx Deep Dive](https://lambda.ai/blog/deep-learning-hardware-deep-dive-rtx-30xx)

---

### 4. Turborepo Monorepo Deployment Strategies

#### Task Orchestration for Deployment

**Official Recommendation:**
> "Global turbo is useful in your CI pipelines, giving you maximum control of exactly which tasks to run at each point in your pipeline."
> — Source: [Turborepo Running Tasks](https://turborepo.com/repo/docs/core-concepts/monorepos/running-tasks)

**Key Strategies:**

**1. Selective Builds (Recommended)**
```bash
# Only build affected packages since last commit
turbo build --filter=[HEAD^1]

# Only build changed packages on feature branch
turbo build --filter=[main...my-feature]
```

**Impact:**
> "Selective deployment reduces deployment times by ~70% compared to naive monorepo builds."
> — Source: [Medium: TurboRepo Explained](https://rohitarya18.medium.com/turborepo-explained-making-monorepos-fast-scalable-21249f5724d9)

**2. Parallel Execution**
```bash
# Run multiple tasks with automatic parallelization
turbo run build test lint check-types
```

**3. Remote Caching**
> "With Remote Caching enabled, teams can count on hitting cache for unchanged packages."
> — Source: [Turborepo Running Tasks](https://turborepo.com/repo/docs/core-concepts/monorepos/running-tasks)

**Deployment Patterns:**

**Atomic Deployments:**
- All changes across packages deploy simultaneously
- Maintains system consistency
- Prevents partial deployments breaking dependencies

**Selective Deployment:**
- Only deploy packages with changed files
- Skip redundant builds and deployments
- ~70% faster than building entire monorepo

**Monorepo-Specific Configuration:**

```json
// turbo.json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "deploy": {
      "dependsOn": ["build"],
      "cache": false
    }
  }
}
```

**Sources:**
- [Turborepo Running Tasks](https://turborepo.com/repo/docs/core-concepts/monorepos/running-tasks)
- [Medium: TurboRepo Explained](https://rohitarya18.medium.com/turborepo-explained-making-monorepos-fast-scalable-21249f5724d9)
- [StudyRaid: Deployment Strategies](https://app.studyraid.com/en/read/12467/402956/deployment-strategies-with-turborepo)
- [Vercel Academy: Production Monorepos](https://vercel.com/academy/production-monorepos)

---

### 5. GitHub Actions CI Best Practices for pnpm Monorepos

#### Official pnpm Setup

**Recommended Workflow:**
```yaml
- uses: pnpm/action-setup@v4
  with:
    version: 10
- uses: actions/setup-node@v4
  with:
    node-version: ${{ matrix.node-version }}
    cache: "pnpm"
```

**Key Points:**
> "On GitHub Actions, you can use pnpm for installing and caching your dependencies."
> — Source: [pnpm CI Documentation](https://pnpm.io/continuous-integration)

**Note:**
> "This is not required, and it is not guaranteed that caching the store will make installation faster."
> — Source: [pnpm CI Documentation](https://pnpm.io/continuous-integration)

#### Complete Turborepo + pnpm Workflow

```yaml
name: CI

on:
  push:
    branches: ["main"]
  pull_request:
    types: [opened, synchronize]

jobs:
  build:
    name: Build and Test
    timeout-minutes: 15
    runs-on: ubuntu-latest

    steps:
      - name: Check out code
        uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - uses: pnpm/action-setup@v3
        with:
          version: 8

      - name: Setup Node.js environment
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build
        run: pnpm build

      - name: Test
        run: pnpm test
```

#### Remote Caching with Vercel

```yaml
env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ vars.TURBO_TEAM }}
```

**Setup Steps:**
1. Generate Scoped Access Token in Vercel Dashboard
2. Store as `TURBO_TOKEN` secret in GitHub repo settings
3. Create `TURBO_TEAM` variable with team slug

#### Local Caching with GitHub Actions

```yaml
- name: Cache turbo build setup
  uses: actions/cache@v4
  with:
    path: .turbo
    key: ${{ runner.os }}-turbo-${{ github.sha }}
    restore-keys: |
      ${{ runner.os }}-turbo-
```

#### Performance Impact

**Before Optimization:**
- Full monorepo build: ~26 minutes

**After Optimization (with caching):**
- Without cache hit: ~12 minutes
- With cache hit: ~3-5 minutes

**Weekly Savings:**
> "Teams have eliminated about 5 hours of CI time every week using this stack."
> — Source: [Tinybird: Turborepo + pnpm CI](https://www.tinybird.co/blog/frontend-ci-monorepo-turborepo-pnpm)

**Sources:**
- [pnpm Continuous Integration](https://pnpm.io/continuous-integration)
- [Turborepo GitHub Actions Guide](https://turborepo.com/docs/guides/ci-vendors/github-actions)
- [Tinybird: Faster CI with Turborepo + pnpm](https://www.tinybird.co/blog/frontend-ci-monorepo-turborepo-pnpm)
- [Nhost: pnpm + Turborepo Configuration](https://nhost.io/blog/how-we-configured-pnpm-and-turborepo-for-our-monorepo)

---

## Key Takeaways

### Process Management Recommendation

**For Node.js/Next.js Production: PM2 (Primary) + systemd (Backup)**

1. **Use PM2 for day-to-day operations:**
   - Easier development workflow
   - Built-in cluster mode for multi-core utilization
   - Zero-downtime deployments with `pm2 reload`
   - Excellent monitoring and logging
   - Centralized configuration for monorepo apps

2. **Integrate PM2 with systemd for resilience:**
   ```bash
   pm2 startup systemd
   pm2 save
   ```
   - Ensures PM2 starts on boot
   - System-level process supervision
   - Best of both worlds

3. **Alternative - Pure systemd for minimalism:**
   - If you prefer zero dependencies
   - Better for teams familiar with Linux administration
   - Requires manual service files per app

### Next.js Deployment Workflow

```bash
# 1. Enable standalone output
# Edit next.config.js: output: 'standalone'

# 2. Build for production
cd apps/web
pnpm build

# 3. Deploy with PM2
pm2 start ecosystem.config.js --env production

# 4. Or deploy with systemd
sudo systemctl start nightreign-web
```

### GPU Considerations

- **TensorFlow.js GPU support:** Linux only, requires CUDA
- **RTX 3070:** Sufficient for inference and models <7B parameters
- **Node.js ML ecosystem:** Limited compared to Python, but viable for inference
- **Best practice:** Use for embedding generation, small model inference

### CI/CD Pipeline Structure for Monorepo

```yaml
# Recommended structure:
1. Checkout with fetch-depth: 2 (for affected detection)
2. Setup pnpm with specific version
3. Setup Node.js with pnpm cache
4. Install dependencies (pnpm install)
5. Build with Turborepo (turbo build)
6. Test with Turborepo (turbo test)
7. Deploy (conditional on branch/tag)

# Enable caching:
- Local: actions/cache@v4 with .turbo path
- Remote: Vercel Remote Cache (TURBO_TOKEN + TURBO_TEAM)

# Use filters for efficiency:
- Only build affected packages
- Skip unchanged dependencies
```

### Deployment Workflow Suggestions

**For Nightreign Query Project:**

1. **Local Development:**
   ```bash
   pnpm dev  # Uses Turborepo to run all apps
   ```

2. **CI Pipeline (GitHub Actions):**
   ```bash
   turbo build --filter=[origin/main...HEAD]  # Only changed packages
   turbo test --filter=[origin/main...HEAD]
   ```

3. **Production Deployment:**
   ```bash
   # Build standalone Next.js
   cd apps/web && pnpm build

   # Deploy with PM2
   pm2 start ecosystem.config.js --env production
   pm2 save

   # Or with systemd
   sudo systemctl restart nightreign-web
   ```

4. **Zero-Downtime Updates:**
   ```bash
   # With PM2
   git pull
   pnpm install
   pnpm build
   pm2 reload nightreign-web

   # With systemd (requires load balancer or brief downtime)
   git pull
   pnpm install
   pnpm build
   sudo systemctl restart nightreign-web
   ```

---

## Recommendations for Next Steps

Based on this research, the following implementation steps are recommended:

1. **Process Management Setup:**
   - **typescript-expert agent** can help create PM2 ecosystem configuration with proper TypeScript typings
   - **system-architecture-reviewer agent** can evaluate PM2 vs systemd choice for specific use case

2. **Next.js Configuration:**
   - **nextjs-expert agent** can implement standalone output mode and optimize build configuration
   - Add `output: 'standalone'` to `apps/web/next.config.js`

3. **CI/CD Pipeline:**
   - Create `.github/workflows/ci.yml` with Turborepo + pnpm setup
   - Configure Vercel Remote Cache or GitHub Actions cache
   - **unit-test-maintainer agent** can ensure tests run correctly in CI

4. **GPU Setup (Optional):**
   - If using local embeddings with GPU acceleration, install CUDA toolkit
   - Install `@tensorflow/tfjs-node-gpu` for embedding generation
   - Note: Current project uses `bge-small-en-v1.5` which may not require GPU for small datasets

5. **Deployment Scripts:**
   - Create `scripts/deploy.sh` for automated deployment
   - Add `pnpm deploy` script to root package.json
   - Document deployment process in repository

---

## Gaps Identified

- Specific CUDA version requirements for RTX 3070 with current Node.js/TensorFlow.js (CUDA 10.0 mentioned but may be outdated for 2026)
- Next.js 16 standalone mode behavior in monorepo context (limited documentation found)
- PM2 cluster mode compatibility with Next.js 16 App Router
- Performance benchmarks for PM2 vs systemd with Next.js specifically
- Best practices for deploying multiple apps from same monorepo to same server

---

## Additional Resources

### Official Documentation
- [PM2 Official Docs](https://pm2.keymetrics.io/docs/)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Turborepo Documentation](https://turborepo.com/docs)
- [pnpm CI Guide](https://pnpm.io/continuous-integration)
- [TensorFlow.js Node.js](https://www.tensorflow.org/js/guide/nodejs)

### Community Resources
- [Better Stack: PM2 Complete Guide](https://betterstack.com/community/guides/scaling-nodejs/pm2-guide/)
- [DigitalOcean: systemd + Node.js Tutorial](https://www.digitalocean.com/community/tutorials/how-to-deploy-node-js-applications-using-systemd-and-nginx)
- [Vercel Academy: Production Monorepos](https://vercel.com/academy/production-monorepos)

---

## Sources

All sources are embedded throughout this document as hyperlinks. Primary authoritative sources include:

- PM2 Official Documentation
- Next.js Official Documentation (Vercel)
- Turborepo Official Documentation (Vercel)
- pnpm Official Documentation
- TensorFlow.js Official Documentation (Google)
- DigitalOcean Tutorials
- NVIDIA Developer Forums
- Community articles from DEV.to, Medium (cross-referenced with official docs)
