# Dockyard

Dockyard is a CLI tool that manages PaaS infrastructure from a config file. You define your projects, applications, databases, and domains in `dac.config.ts`, and the tool creates, updates, or deletes resources on your provider to match. It currently supports [Dokploy](https://dokploy.com) and [Railway](https://railway.com). The provider interface is generic, so other platforms can be added.

Your project can be written in any language. The `dac.config.ts` file is just a config that sits in your repo.

## Install

Requires [Bun](https://bun.sh).

```sh
bun add -g dockyard-cli
```

That's it. You now have the `dac` command available everywhere.

If you don't want a global install, you can use `bunx` to run it without installing:

```sh
bunx dockyard-cli init
bunx dockyard-cli plan
bunx dockyard-cli apply
```

Or build from source:

```sh
git clone https://github.com/Nu11ified/Dockyard.git
cd Dockyard && bun install && bun run build
cp dist/dac ~/.local/bin/
```

## Quick start

**1. Create a config file in your project:**

```sh
dac init
```

This creates `dac.config.ts` in the current directory. It works in any project: Go, Python, Rust, a static site, anything.

**2. Set your provider credentials:**

**Dokploy:**

```sh
export DOKPLOY_URL="https://your-dokploy-instance.com"
export DOKPLOY_API_KEY="your-api-key"
```

Get your API key from the Dokploy dashboard under Settings > API.

**Railway:**

```sh
export RAILWAY_TOKEN="your-railway-api-token"
```

Get your token from the [Railway dashboard](https://railway.com/account/tokens).

**3. Edit `dac.config.ts`:**

```ts
export default {
  providers: {
    dokploy: {
      type: "dokploy",
      url: process.env.DOKPLOY_URL!,
      apiKey: process.env.DOKPLOY_API_KEY!,
    },
  },

  project: {
    name: "my-app",
  },

  environments: {
    production: {
      provider: "dokploy",

      applications: [{
        name: "api",
        source: { type: "github", repo: "myorg/api", branch: "main", owner: "myorg" },
        build: { type: "dockerfile", context: "." },
        domains: [{ host: "api.example.com", https: true }],
        env: {
          NODE_ENV: "production",
          DATABASE_URL: "${{db.postgres.connectionString}}",
        },
        ports: [{ container: 3000 }],
      }],

      databases: [
        { name: "postgres", type: "postgres", version: "16" },
      ],
    },
  },
};
```

No imports needed. The CLI validates the config at runtime.

To use Railway instead, swap the provider:

```ts
providers: {
  railway: {
    type: "railway",
    token: process.env.RAILWAY_TOKEN!,
    teamId: "optional-workspace-id",  // optional
  },
},
```

The rest of the config (applications, databases, domains) stays the same. See [Platform differences](#platform-differences) for what each provider supports.

**4. Preview and apply:**

```sh
dac plan     # show what would change
dac apply    # apply the changes
```

**5. Deploy:**

```sh
dac deploy          # deploy all applications
dac deploy api      # deploy a specific app
```

### TypeScript autocomplete (optional)

If you want autocomplete and type checking in your config, add dockyard-cli as a dev dependency in a JS/TS project:

```sh
bun add -d dockyard-cli
```

Then add a type annotation to your config:

```ts
import type { DacConfig } from "dockyard-cli";

export default {
  // full autocomplete here
} satisfies DacConfig;
```

This is optional. The config works without it.

## Commands

| Command | Description |
|---|---|
| `dac init` | Create a `dac.config.ts` template |
| `dac plan` | Show planned changes without applying |
| `dac apply` | Apply changes (prompts for confirmation) |
| `dac apply --auto-approve` | Apply without confirmation |
| `dac deploy [app]` | Trigger deployment for one or all apps |
| `dac destroy` | Delete all managed resources |
| `dac status` | List managed resources and their IDs |
| `dac rollback <app>` | Rollback an application |

## Configuration reference

### Provider types

- `dokploy` — Self-hosted Dokploy instance. Requires `url` and `apiKey`.
- `railway` — Railway.com. Requires `token`. Optional `teamId` for workspace scoping.

### Source types

- `github` - repo, branch, owner, buildPath, watchPaths, triggerType
- `gitlab` - repo, branch, owner, buildPath, projectId, pathNamespace
- `bitbucket` - repo, branch, owner, repositorySlug, buildPath
- `gitea` - repo, branch, owner, buildPath
- `git` - url, branch, buildPath, sshKeyId
- `docker` - image, registryUrl, username, password

### Build types

- `dockerfile` - dockerfile, context, buildStage
- `nixpacks` - no extra options
- `buildpacks` - version
- `static` - publishDirectory, isSpa
- `railpack` - version

### Database types

`postgres`, `mysql`, `mariadb`, `redis`, `mongo`

Each takes `name`, `type`, and an optional `version`. Credentials are auto-generated if not specified.

### Resource references

Use `${{db.<name>.<field>}}` in environment variables to reference database connection details. These are resolved after databases are created.

```ts
env: {
  DATABASE_URL: "${{db.postgres.connectionString}}",
  REDIS_URL: "${{db.cache.connectionString}}",
}
```

### Other resource types

Applications can also include: `domains`, `ports`, `mounts`, `redirects`, `security`, `resources` (CPU/memory), `replicas`.

Top-level config also supports `certificates` and `registries` arrays.

### Platform differences

Not all features are available on every provider:

| Feature | Dokploy | Railway |
|---|---|---|
| Applications | Yes | Yes |
| Databases | Yes | Yes (auto-created as services) |
| Compose | Yes | No |
| Domains | Yes | Yes (SSL automatic) |
| Mounts/Volumes | Yes | Yes |
| Redirects | Yes | No |
| Basic auth | Yes | No |
| Manual certificates | Yes | No (SSL automatic) |

Using an unsupported feature with a provider that doesn't support it will produce an error during `dac plan`.

## GitHub Actions

Since `dac.config.ts` is just TypeScript, it can read `process.env` directly. Any environment variable you set in your GitHub Actions workflow is available in your config. This means you can store secrets (API keys, database passwords, tokens) in GitHub and have them flow into your deployments without hardcoding anything.

### Basic setup

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2

      - name: Plan
        if: github.event_name == 'pull_request'
        run: bunx dockyard-cli plan
        env:
          DOKPLOY_URL: ${{ secrets.DOKPLOY_URL }}
          DOKPLOY_API_KEY: ${{ secrets.DOKPLOY_API_KEY }}
          STRIPE_KEY: ${{ secrets.STRIPE_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}

      - name: Apply
        if: github.event_name == 'push'
        run: bunx dockyard-cli apply --auto-approve
        env:
          DOKPLOY_URL: ${{ secrets.DOKPLOY_URL }}
          DOKPLOY_API_KEY: ${{ secrets.DOKPLOY_API_KEY }}
          STRIPE_KEY: ${{ secrets.STRIPE_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}

      - name: Deploy
        if: github.event_name == 'push'
        run: bunx dockyard-cli deploy
        env:
          DOKPLOY_URL: ${{ secrets.DOKPLOY_URL }}
          DOKPLOY_API_KEY: ${{ secrets.DOKPLOY_API_KEY }}
```

Then in your config, reference them:

```ts
applications: [{
  name: "api",
  // ...
  env: {
    STRIPE_KEY: process.env.STRIPE_KEY!,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
  },
}],
```

Add your secrets in your GitHub repo under Settings > Secrets and variables > Actions.

### Scoped environments (staging / production)

GitHub Actions has an [environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment) feature that lets you define separate sets of secrets per environment. Each environment gets its own secrets, so `STRIPE_KEY` in staging can be a test key while production uses the live key.

```yaml
name: Deploy

on:
  push:
    branches: [main, develop]

jobs:
  staging:
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - name: Apply staging
        run: bunx dockyard-cli apply --auto-approve
        env:
          DOKPLOY_URL: ${{ secrets.DOKPLOY_URL }}
          DOKPLOY_API_KEY: ${{ secrets.DOKPLOY_API_KEY }}
          STRIPE_KEY: ${{ secrets.STRIPE_KEY }}
          DATABASE_PASSWORD: ${{ secrets.DATABASE_PASSWORD }}
          APP_ENV: staging
      - name: Deploy staging
        run: bunx dockyard-cli deploy
        env:
          DOKPLOY_URL: ${{ secrets.DOKPLOY_URL }}
          DOKPLOY_API_KEY: ${{ secrets.DOKPLOY_API_KEY }}

  production:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - name: Apply production
        run: bunx dockyard-cli apply --auto-approve
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
          STRIPE_KEY: ${{ secrets.STRIPE_KEY }}
          DATABASE_PASSWORD: ${{ secrets.DATABASE_PASSWORD }}
          APP_ENV: production
      - name: Deploy production
        run: bunx dockyard-cli deploy
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

Your config can then branch on `APP_ENV` or use different providers per environment. For example, Dokploy for staging and Railway for production:

```ts
export default {
  providers: {
    dokploy: {
      type: "dokploy",
      url: process.env.DOKPLOY_URL!,
      apiKey: process.env.DOKPLOY_API_KEY!,
    },
    railway: {
      type: "railway",
      token: process.env.RAILWAY_TOKEN!,
    },
  },

  project: { name: "my-app" },

  environments: {
    staging: {
      provider: "dokploy",
      applications: [{
        name: "api",
        source: { type: "github", repo: "myorg/api", branch: "develop", owner: "myorg" },
        build: { type: "dockerfile" },
        env: {
          NODE_ENV: "staging",
          STRIPE_KEY: process.env.STRIPE_KEY!,
        },
      }],
      databases: [
        { name: "postgres", type: "postgres", version: "16" },
      ],
    },
    production: {
      provider: "railway",
      applications: [{
        name: "api",
        source: { type: "github", repo: "myorg/api", branch: "main", owner: "myorg" },
        build: { type: "dockerfile" },
        env: {
          NODE_ENV: "production",
          STRIPE_KEY: process.env.STRIPE_KEY!,
        },
      }],
      databases: [
        { name: "postgres", type: "postgres", version: "16" },
      ],
    },
  },
};
```

The same database and application config works on both providers. Dockyard handles the platform-specific translation.

To set this up:

1. Go to your GitHub repo > Settings > Environments
2. Create `staging` and `production` environments
3. Add secrets to each (same key names, different values)
4. Push to `develop` to deploy staging, push to `main` to deploy production

The same config file handles both. The secrets are different per environment because GitHub injects the right set based on the `environment:` field in the workflow.

The `.dac/state.json` file should be committed to your repo so CI knows what resources are already managed.

## How it works

Dockyard keeps a state file at `.dac/state.json` that maps config resource names to remote IDs. On `dac plan` or `dac apply`, it diffs your config against this state and produces creates, updates, and deletes. Resources are applied in dependency order: projects, then environments, then databases, then applications.

Commit the state file to your repo. This is how Dockyard tracks what it manages.

## Development

```sh
git clone https://github.com/Nu11ified/Dockyard.git
cd Dockyard
bun install
bun test           # run tests
bun run dev        # run CLI without compiling
bun run build      # compile to ./dist/dac
```

## License

MIT
