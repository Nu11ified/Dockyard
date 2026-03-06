# Dockyard

Dockyard is a CLI tool that manages PaaS infrastructure from a TypeScript config file. You define your projects, applications, databases, and domains in `dac.config.ts`, and the tool creates, updates, or deletes resources to match. It currently supports [Dokploy](https://dokploy.com) as a provider. The provider interface is generic, so other platforms can be added.

## Install

Requires [Bun](https://bun.sh).

```
git clone https://github.com/Nu11ified/Dockyard.git
cd Dockyard
bun install
```

To compile a standalone binary:

```
bun run build
# produces ./dist/dac
```

## Usage

Scaffold a config file:

```
bun run dev init
```

This creates `dac.config.ts` in the current directory. Edit it to match your setup, then:

```
bun run dev plan     # show what would change
bun run dev apply    # apply the changes
```

If you compiled the binary, replace `bun run dev` with `./dist/dac` or put it on your PATH.

## Configuration

A `dac.config.ts` file looks like this:

```ts
import { defineConfig } from "dockyard";

export default defineConfig({
  providers: {
    staging: {
      type: "dokploy",
      url: process.env.DOKPLOY_URL!,
      apiKey: process.env.DOKPLOY_API_KEY!,
    },
  },

  project: {
    name: "my-app",
  },

  environments: {
    staging: {
      provider: "staging",

      applications: [{
        name: "api",
        source: { type: "github", repo: "myorg/api", branch: "main", owner: "myorg" },
        build: { type: "dockerfile", context: "." },
        domains: [{ host: "api.staging.example.com", https: true }],
        env: {
          NODE_ENV: "staging",
          DATABASE_URL: "${{db.postgres.connectionString}}",
        },
        ports: [{ container: 3000 }],
      }],

      databases: [
        { name: "postgres", type: "postgres", version: "16" },
      ],
    },
  },
});
```

The config is validated with Zod at load time. Your editor will provide autocomplete and type errors for all fields.

### Source types

`github`, `gitlab`, `bitbucket`, `gitea`, `git`, `docker`

### Build types

`dockerfile`, `nixpacks`, `buildpacks`, `static`, `railpack`

### Database types

`postgres`, `mysql`, `mariadb`, `redis`, `mongo`

### Environment variables

Use `${{db.<name>.<field>}}` to reference database connection details. These are resolved after databases are created.

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

## How it works

Dockyard keeps a local state file at `.dac/state.json` that maps config resource names to remote IDs. When you run `dac plan` or `dac apply`, it compares your config against this state and produces a diff of creates, updates, and deletes. Resources are applied in dependency order (projects before environments, environments before databases, databases before applications).

## Development

```
bun test          # run tests
bun run dev       # run CLI without compiling
bun run build     # compile to ./dist/dac
```

## License

MIT
