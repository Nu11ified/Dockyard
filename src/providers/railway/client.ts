export class RailwayClient {
  private endpoint = "https://backboard.railway.com/graphql/v2";
  private token: string;
  private teamId?: string;

  constructor(token: string, teamId?: string, endpoint?: string) {
    this.token = token;
    this.teamId = teamId;
    if (endpoint) this.endpoint = endpoint;
  }

  private get headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.token}`,
    };
  }

  private extractOperationName(query: string): string {
    // Remove variable definitions: everything between balanced parens after operation name
    const withoutVarDefs = query.replace(/\([^)]*\)/g, "");
    // Match first field name inside the selection set
    const match = withoutVarDefs.match(/\{\s*(\w+)/);
    if (match) return match[1];
    throw new Error("Could not extract operation name from query");
  }

  private async execute<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Railway API error ${res.status}: ${text}`);
    }

    const json = (await res.json()) as {
      data?: Record<string, unknown>;
      errors?: Array<{ message: string }>;
    };

    if (json.errors && json.errors.length > 0) {
      throw new Error(`Railway GraphQL error: ${json.errors.map((e) => e.message).join(", ")}`);
    }

    if (!json.data) {
      throw new Error("Railway API returned no data");
    }

    const operationName = this.extractOperationName(query);
    return json.data[operationName] as T;
  }

  async query<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<T> {
    return this.execute<T>(query, variables);
  }

  async mutate<T = unknown>(mutation: string, variables?: Record<string, unknown>): Promise<T> {
    return this.execute<T>(mutation, variables);
  }

  getTeamId(): string | undefined {
    return this.teamId;
  }
}
