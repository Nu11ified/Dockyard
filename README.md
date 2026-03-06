# Dockyard

Dockyard is a CLI tool that manages PaaS infrastructure from a config file. You define your projects, applications, databases, and domains in `dac.config.ts`, and the tool creates, updates, or deletes resources on your provider to match. It currently supports [Dokploy](https://dokploy.com). The provider interface is generic, so other platforms can be added.

Your project can be written in any language. The `dac.config.ts` file is just a config that sits in your repo. It does not require Node, npm, or a package.json.

## Install

Requires [Bun](https://bun.sh).

### Compiled binary (recommended)

```sh
git clone https://github.com/Nu11ified/Dockyard.git
cd Dockyard
bun install
bun run build
```

This produces `./dist/dac`. Copy it somewhere on your PATH:

```sh
cp ./dist/dac ~/.local/bin/dac
```

Now you can run `dac` from any project, regardless of language.

### As a project dependency (TypeScript/JavaScript projects)

If your project already uses Bun or Node, you can install dockyard as a dev dependency to get type-checked autocomplete in your config file:

```sh
bun add -d dockyard
```

This gives you both the `dac` CLI (via `bunx dac`) and the TypeScript types for your config.

## Quick start

**1. Create a config file in your project:**

```sh
dac init
```

This creates `dac.config.ts` in the current directory. It works in any project: a Go service, a Python app, a static site, anything.

**2. Set your provider credentials:**

```sh
export DOKPLOY_URL="https://your-dokploy-instance.com"
export DOKPLOY_API_KEY="your-api-key"
```

You can get your API key from the Dokploy dashboard under Settings > API.

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

If you're in a TypeScript project and want autocomplete, install dockyard as a dev dependency and add a type annotation:

```ts
import type { DacConfig } from "dockyard";

export default {
  // ... your config
} satisfies DacConfig;
```

**4. Preview and apply:**

```sh
dac plan     # show what would change
dac apply    # apply the changes
```

`plan` shows a diff. `apply` shows the same diff and asks for confirmation before making changes.

**5. Deploy:**

```sh
dac deploy          # deploy all applications
dac deploy api      # deploy a specific app
```

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

Each takes `name`, `type`, and an optional `version`. Credentials (databaseUser, databasePassword, etc.) are auto-generated if not specified.

### Resource references

Use `${{db.<name>.<field>}}` in environment variables to reference database connection details. These are resolved after databases are created.

```ts
env: {
  DATABASE_URL: "${{db.postgres.connectionString}}",
  REDIS_URL: "${{db.cache.connectionString}}",
}
```

### Other resource types

Applications can also include:

- `domains` - custom domains with optional HTTPS
- `ports` - port mappings (host port auto-assigned if omitted)
- `mounts` - bind mounts, volumes, or file mounts
- `redirects` - regex-based URL redirects
- `security` - basic auth credentials
- `resources` - CPU/memory limits and reservations
- `replicas` - number of replicas

Top-level config also supports `certificates` and `registries` arrays.

## GitHub Actions

You can run Dockyard in CI to automatically apply infrastructure changes on push.

Create `.github/workflows/deploy.yml` in your repo:

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

      # Install dockyard for the dac CLI
      - run: bun add -d dockyard

      # On PRs, just show the plan
      - name: Plan
        if: github.event_name == 'pull_request'
        run: bunx dac plan
        env:
          DOKPLOY_URL: ${{ secrets.DOKPLOY_URL }}
          DOKPLOY_API_KEY: ${{ secrets.DOKPLOY_API_KEY }}

      # On push to main, apply and deploy
      - name: Apply
        if: github.event_name == 'push'
        run: bunx dac apply --auto-approve
        env:
          DOKPLOY_URL: ${{ secrets.DOKPLOY_URL }}
          DOKPLOY_API_KEY: ${{ secrets.DOKPLOY_API_KEY }}

      - name: Deploy
        if: github.event_name == 'push'
        run: bunx dac deploy
        env:
          DOKPLOY_URL: ${{ secrets.DOKPLOY_URL }}
          DOKPLOY_API_KEY: ${{ secrets.DOKPLOY_API_KEY }}
```

Add `DOKPLOY_URL` and `DOKPLOY_API_KEY` to your repository secrets (Settings > Secrets and variables > Actions).

On pull requests, the workflow runs `dac plan` so you can see what would change. On push to main, it runs `dac apply --auto-approve` followed by `dac deploy`.

Note: the `.dac/state.json` file needs to be committed to your repo for this to work, since the state tracks what resources Dockyard manages. Add and commit it after your first `dac apply`.

## How it works

Dockyard keeps a local state file at `.dac/state.json` that maps config resource names to remote IDs on the provider. When you run `dac plan` or `dac apply`, it compares your config against this state and produces a diff of creates, updates, and deletes. Resources are applied in dependency order: projects first, then environments, then databases, then applications.

The state file should be committed to your repo. This is how Dockyard knows which remote resources it manages and avoids recreating things that already exist.

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
