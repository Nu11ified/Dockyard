export class DokployClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(url: string, apiKey: string) {
    this.baseUrl = url.replace(/\/$/, "");
    this.apiKey = apiKey;
  }

  private buildUrl(endpoint: string): string {
    return `${this.baseUrl}/api/${endpoint}`;
  }

  private get headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "x-api-key": this.apiKey,
    };
  }

  async post<T = unknown>(endpoint: string, body: Record<string, unknown> = {}): Promise<T> {
    const res = await fetch(this.buildUrl(endpoint), {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Dokploy API error ${res.status} on ${endpoint}: ${text}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : ({} as T);
  }

  async get<T = unknown>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(this.buildUrl(endpoint));
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: this.headers,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Dokploy API error ${res.status} on ${endpoint}: ${text}`);
    }
    return res.json() as Promise<T>;
  }
}
