import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

export interface ResourceState {
  remoteId: string;
  [key: string]: unknown;
}

export interface ProviderState {
  type: string;
  resources: Record<string, ResourceState>;
}

export interface DacState {
  version: number;
  providers: Record<string, ProviderState>;
}

export class StateManager {
  private statePath: string;
  private state: DacState;

  constructor(baseDir: string) {
    const dacDir = join(baseDir, ".dac");
    this.statePath = join(dacDir, "state.json");
    if (!existsSync(dacDir)) {
      mkdirSync(dacDir, { recursive: true });
    }
    this.state = this.load();
  }

  load(): DacState {
    if (existsSync(this.statePath)) {
      const raw = readFileSync(this.statePath, "utf-8");
      this.state = JSON.parse(raw);
      return this.state;
    }
    this.state = { version: 1, providers: {} };
    return this.state;
  }

  save(): void {
    writeFileSync(this.statePath, JSON.stringify(this.state, null, 2));
  }

  setResource(providerName: string, providerType: string, resourceKey: string, value: ResourceState): void {
    if (!this.state.providers[providerName]) {
      this.state.providers[providerName] = { type: providerType, resources: {} };
    }
    this.state.providers[providerName].resources[resourceKey] = value;
  }

  getResource(providerName: string, resourceKey: string): ResourceState | undefined {
    return this.state.providers[providerName]?.resources[resourceKey];
  }

  removeResource(providerName: string, resourceKey: string): void {
    if (this.state.providers[providerName]) {
      delete this.state.providers[providerName].resources[resourceKey];
    }
  }

  listResources(providerName: string): Record<string, ResourceState> {
    return this.state.providers[providerName]?.resources ?? {};
  }

  getState(): DacState {
    return this.state;
  }
}
