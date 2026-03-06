const REF_PATTERN = /\$\{\{([^}]+)\}\}/g;

export interface ReferenceContext {
  databases: Record<string, { connectionString?: string; host?: string; port?: number; [key: string]: unknown }>;
}

export function resolveReferences(
  env: Record<string, string>,
  context: ReferenceContext,
): Record<string, string> {
  const resolved: Record<string, string> = {};

  for (const [key, value] of Object.entries(env)) {
    resolved[key] = value.replace(REF_PATTERN, (match, ref: string) => {
      const parts = ref.trim().split(".");
      if (parts[0] === "db" && parts.length === 3) {
        const dbName = parts[1];
        const field = parts[2];
        const db = context.databases[dbName];
        if (!db || !(field in db)) {
          throw new Error(`Unresolved reference: ${match} — database "${dbName}" field "${field}" not found`);
        }
        return String(db[field]);
      }
      throw new Error(`Unresolved reference: ${match} — unknown reference format`);
    });
  }

  return resolved;
}
