# Dockyard

Dockyard is a CLI tool that manages PaaS infrastructure from a config file. You define your projects, applications, databases, and domains in `dac.config.ts`, and the tool creates, updates, or deletes resources on your provider to match. It currently supports [Dokploy](https://dokploy.com). The provider interface is generic, so other platforms can be added.

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

## GitHub Actions

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

      - name: Apply
        if: github.event_name == 'push'
        run: bunx dockyard-cli apply --auto-approve
        env:
          DOKPLOY_URL: ${{ secrets.DOKPLOY_URL }}
          DOKPLOY_API_KEY: ${{ secrets.DOKPLOY_API_KEY }}

      - name: Deploy
        if: github.event_name == 'push'
        run: bunx dockyard-cli deploy
        env:
          DOKPLOY_URL: ${{ secrets.DOKPLOY_URL }}
          DOKPLOY_API_KEY: ${{ secrets.DOKPLOY_API_KEY }}
```

Add `DOKPLOY_URL` and `DOKPLOY_API_KEY` to your repository secrets.

On pull requests, the workflow runs `dac plan` so you can review changes. On push to main, it applies and deploys.

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
