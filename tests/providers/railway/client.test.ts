import { describe, it, expect } from "bun:test";
import { RailwayClient } from "../../../src/providers/railway/client";

describe("RailwayClient", () => {
  it("should construct with token", () => {
    const client = new RailwayClient("test-token");
    expect(client).toBeDefined();
    expect(client).toBeInstanceOf(RailwayClient);
  });

  it("should construct with optional teamId", () => {
    const client = new RailwayClient("test-token", "team-123");
    expect(client).toBeDefined();
  });

  it("should use correct endpoint", () => {
    const client = new RailwayClient("token");
    const endpoint = (client as any)["endpoint"];
    expect(endpoint).toBe("https://backboard.railway.com/graphql/v2");
  });

  it("should include Bearer token in headers", () => {
    const client = new RailwayClient("my-secret-token");
    const headers = (client as any)["headers"];
    expect(headers).toEqual({
      "Content-Type": "application/json",
      "Authorization": "Bearer my-secret-token",
    });
  });

  it("should extract operation name from named mutation", () => {
    const client = new RailwayClient("token");
    const name = (client as any)["extractOperationName"](
      "mutation projectCreate($input: ProjectCreateInput!) { projectCreate(input: $input) { id } }"
    );
    expect(name).toBe("projectCreate");
  });

  it("should extract operation name from named query", () => {
    const client = new RailwayClient("token");
    const name = (client as any)["extractOperationName"](
      "query project($id: String!) { project(id: $id) { id name } }"
    );
    expect(name).toBe("project");
  });

  it("should extract root field name, not operation name", () => {
    const client = new RailwayClient("token");
    const name = (client as any)["extractOperationName"](
      "mutation CreateProject($input: ProjectCreateInput!) { projectCreate(input: $input) { id } }"
    );
    expect(name).toBe("projectCreate");
  });

  it("should extract operation name from anonymous query", () => {
    const client = new RailwayClient("token");
    const name = (client as any)["extractOperationName"]("query { me { name } }");
    expect(name).toBe("me");
  });

  it("should allow configurable endpoint", () => {
    const customEndpoint = "https://custom.railway.endpoint/graphql";
    const client = new RailwayClient("token", undefined, customEndpoint);
    const endpoint = (client as any)["endpoint"];
    expect(endpoint).toBe(customEndpoint);
  });

  it("should use default endpoint when none provided", () => {
    const client = new RailwayClient("token");
    const endpoint = (client as any)["endpoint"];
    expect(endpoint).toBe("https://backboard.railway.com/graphql/v2");
  });

  it("should return teamId via getter", () => {
    const client1 = new RailwayClient("token");
    expect(client1.getTeamId()).toBeUndefined();

    const client2 = new RailwayClient("token", "team-456");
    expect(client2.getTeamId()).toBe("team-456");
  });
});
