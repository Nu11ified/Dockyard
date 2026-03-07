// ── Projects ──────────────────────────────────────────────────────

export const LIST_PROJECTS = `query projects {
  projects {
    edges {
      node {
        id
        name
      }
    }
  }
}`;

export const GET_PROJECT = `query project($id: String!) {
  project(id: $id) {
    id
    name
  }
}`;

export const GET_PROJECT_WITH_SERVICES = `query project($id: String!) {
  project(id: $id) {
    id
    name
    services {
      edges {
        node {
          id
          name
        }
      }
    }
    environments {
      edges {
        node {
          id
          name
        }
      }
    }
  }
}`;

export const CREATE_PROJECT = `mutation projectCreate($input: ProjectCreateInput!) {
  projectCreate(input: $input) {
    id
    name
    environments {
      edges {
        node {
          id
          name
        }
      }
    }
  }
}`;

export const UPDATE_PROJECT = `mutation projectUpdate($id: String!, $input: ProjectUpdateInput!) {
  projectUpdate(id: $id, input: $input)
}`;

export const DELETE_PROJECT = `mutation projectDelete($id: String!) {
  projectDelete(id: $id)
}`;

// ── Environments ──────────────────────────────────────────────────

export const LIST_ENVIRONMENTS = `query environments($projectId: String!) {
  environments(projectId: $projectId) {
    edges {
      node {
        id
        name
      }
    }
  }
}`;

export const CREATE_ENVIRONMENT = `mutation environmentCreate($input: EnvironmentCreateInput!) {
  environmentCreate(input: $input) {
    id
    name
  }
}`;

export const DELETE_ENVIRONMENT = `mutation environmentDelete($id: String!) {
  environmentDelete(id: $id)
}`;

// ── Services ──────────────────────────────────────────────────────

export const CREATE_SERVICE = `mutation serviceCreate($input: ServiceCreateInput!) {
  serviceCreate(input: $input) {
    id
    name
  }
}`;

export const UPDATE_SERVICE_INSTANCE = `mutation serviceInstanceUpdate($serviceId: String!, $environmentId: String!, $input: ServiceInstanceUpdateInput!) {
  serviceInstanceUpdate(serviceId: $serviceId, environmentId: $environmentId, input: $input)
}`;

export const DELETE_SERVICE = `mutation serviceDelete($id: String!) {
  serviceDelete(id: $id)
}`;

export const DEPLOY_SERVICE = `mutation serviceInstanceDeploy($serviceId: String!, $environmentId: String!) {
  serviceInstanceDeploy(serviceId: $serviceId, environmentId: $environmentId)
}`;

export const LIST_DEPLOYMENTS = `query deployments($input: DeploymentListInput!) {
  deployments(input: $input, first: 1) {
    edges {
      node {
        id
        status
      }
    }
  }
}`;

export const ROLLBACK_DEPLOYMENT = `mutation deploymentRollback($id: String!) {
  deploymentRollback(id: $id) {
    id
  }
}`;

// ── Variables ─────────────────────────────────────────────────────

export const GET_VARIABLES = `query variables($projectId: String!, $environmentId: String!, $serviceId: String) {
  variables(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId)
}`;

export const UPSERT_VARIABLES = `mutation variableCollectionUpsert($input: VariableCollectionUpsertInput!) {
  variableCollectionUpsert(input: $input)
}`;

// ── Domains ───────────────────────────────────────────────────────

export const CREATE_CUSTOM_DOMAIN = `mutation customDomainCreate($input: CustomDomainCreateInput!) {
  customDomainCreate(input: $input) {
    id
    domain
  }
}`;

export const DELETE_CUSTOM_DOMAIN = `mutation customDomainDelete($id: String!) {
  customDomainDelete(id: $id)
}`;

export const CREATE_SERVICE_DOMAIN = `mutation serviceDomainCreate($input: ServiceDomainCreateInput!) {
  serviceDomainCreate(input: $input) {
    domain
    id
  }
}`;

// ── Volumes ───────────────────────────────────────────────────────

export const CREATE_VOLUME = `mutation volumeCreate($input: VolumeCreateInput!) {
  volumeCreate(input: $input) {
    id
  }
}`;

export const DELETE_VOLUME = `mutation volumeDelete($volumeId: String!) {
  volumeDelete(volumeId: $volumeId)
}`;

// ── TCP Proxies ───────────────────────────────────────────────────

export const LIST_TCP_PROXIES = `query tcpProxies($serviceId: String!, $environmentId: String!) {
  tcpProxies(serviceId: $serviceId, environmentId: $environmentId) {
    id
    domain
    proxyPort
    applicationPort
  }
}`;
