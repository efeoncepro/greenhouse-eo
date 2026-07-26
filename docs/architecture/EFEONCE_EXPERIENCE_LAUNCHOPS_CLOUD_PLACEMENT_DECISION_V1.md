# Efeonce Experience LaunchOps — Cloud Placement Decision V1

## Status

Proposed — default placement for pilot and first commercial implementation; no production rollout authorized by
this document alone.

## Date

2026-07-26

## Owner

Wave + Product/Architecture + Cloud/Platform + Security/Privacy + Finance

## Scope

Placement of the Experience LaunchOps Control Plane, Agent Fabric, Worker runtime, Provider Gateway, evidence and
client execution integrations across GCP, Azure and AWS.

## Decision

Experience LaunchOps will use **GCP as the default Efeonce/Wave cloud**, in a dedicated project and isolated runtime.
The product will remain cloud-portable through a containerized Agent Fabric, provider-neutral gateway and portable
Client Execution Runner.

```text
Dedicated GCP project
  Control Plane · API · Orchestrator · Provider Gateway
  Cloud Run services · Cloud Run Jobs · queue/event layer
  Dedicated Cloud SQL · private object storage · Secret Manager
  Artifact Registry/WIF · logging/monitoring/tracing
          ↓
Portable Client Execution Runner
          ↓
Client cloud and systems: GCP / Azure / AWS · CMS · IAM · Analytics · CI/CD · ITSM
```

The current shared Greenhouse project, shared Cloud SQL and Greenhouse runtime are not the production foundation
for this commercial product. Greenhouse may contribute implementation patterns and internal adapters, but the
commercial product receives its own project, IAM, data, secrets, billing and operational boundary.

## Why GCP first

- Efeonce already operates Cloud Run, Cloud SQL, BigQuery, Secret Manager, WIF and Vertex AI.
- Cloud Run supports services, jobs and worker pools, fitting the API/orchestrator/long-running Worker shape.
- Existing operational skills and deployment patterns reduce time-to-pilot and operating risk.
- Vertex AI can be a GCP-aligned provider rail without becoming the product source of truth.

This is an execution and operating advantage, not a claim that GCP is universally superior for every client.

## Placement by plane

| Plane | Default | Enterprise alternative |
| --- | --- | --- |
| LaunchOps Control Plane | Dedicated GCP project | Client-approved GCP/Azure/AWS tenant for private deployment |
| Agent Fabric/orchestrator | Cloud Run service or job | Container Apps, AgentCore Runtime or client-managed runtime |
| Long-running/bulk Workers | Cloud Run Jobs | Azure Container Apps Jobs, ECS/EKS jobs or equivalent |
| Durable operational data | Dedicated Cloud SQL PostgreSQL | Client-managed relational store through contract |
| Evidence/artifacts | Private object storage | Client-controlled storage or approved encrypted store |
| Secrets/identity | Secret Manager + dedicated service identities + WIF | Entra, AWS IAM or client secret platform |
| Models/providers | Provider Gateway | Client-approved provider endpoint/rail |
| CMS execution | API/MCP/CLI adapters | Client-side Execution Runner in private network |

## Deployment modes

### Managed Wave

Control Plane, Agent Fabric and adapters run in Efeonce's dedicated GCP project. Client systems remain the source of
truth and expose only approved integrations.

### Hybrid enterprise

Control Plane remains in Wave's dedicated environment; a Client Execution Runner runs inside the client's GCP,
Azure or AWS network and handles sensitive credentials, private endpoints and governed mutations.

### Client-controlled

The client hosts the Agent Fabric, Workers and/or adapters in its cloud. Wave supplies versioned contracts, recipes,
Worker manifests, evaluation packs, support and operating method.

### Private deployment

Future option for regulated or procurement-constrained clients. Requires separate economics, support, upgrade,
residency, incident and IP decisions; it is not a V1 assumption.

## Provider independence

Cloud placement and model/provider selection are separate decisions. A GCP-hosted Control Plane may route to Claude,
OpenAI or Vertex according to client policy, task, data classification, region, quality, cost and fallback.
Azure Foundry/Entra and AWS Bedrock AgentCore are enterprise deployment rails where client governance makes them the
right fit; neither becomes the canonical LaunchOps state or Worker contract.

## Security and data boundary

- No use of shared Greenhouse production data or Cloud SQL as the commercial product baseline.
- Tenant, environment, client and launch scopes are enforced server-side.
- Client credentials remain in the client Execution Runner where required.
- Evidence and artifacts are classified, encrypted, access-controlled and exportable.
- Provider retention, region and subprocessor policy are evaluated per client and Worker.
- No active-active multi-cloud in V1; portability is achieved through contracts and containers, not duplicated live state.
- Recovery requires explicit RTO/RPO, backup/restore, provider fallback and client communication ownership.

## Cost and operating boundary

The dedicated project must have separate billing labels, budgets, quota controls, model/provider metering, storage
lifecycle policies and cost-per-launch reporting. Custom/private deployments are priced as separate implementation,
support and maintenance commitments, not hidden inside the managed default.

## Alternatives considered

### Azure as default

Rejected for V1 because Efeonce's current operational center of gravity and runtime patterns are GCP. Azure remains a
first-class enterprise rail for Microsoft-native clients.

### AWS as default

Rejected for V1 for the same operating leverage reason. AWS remains a first-class client execution/deployment rail.

### Multi-cloud active-active from day one

Rejected. It would multiply IAM, deployment, observability, data consistency, support and cost before demand proves
the need.

### Run inside Greenhouse

Rejected. It would couple a commercial product to internal Greenhouse tenancy, data, billing, release and security
boundaries, weakening both products.

## Acceptance gates

- Dedicated project, billing, IAM and ownership approved.
- Dedicated database/storage/secrets posture defined; no shared Greenhouse database dependency.
- Cloud Run service/job topology and queue/event semantics verified.
- Provider Gateway supports at least one primary and one fallback route.
- Client Execution Runner contract works in one real client-like network boundary.
- Backup/restore, rollback, secret rotation and cost anomaly paths rehearsed.
- Data residency, subprocessors, retention and contract treatment approved for pilot.

## Revisit when

- The first qualified client requires Azure/AWS hosting as a contractual condition.
- Data residency or private networking blocks the managed GCP mode.
- Cost-to-serve or latency differs materially between rails.
- A client requires active-active or regional failover.
- Private deployment becomes a repeatable revenue lane rather than an exception.

## External references

Vendor capabilities are time-sensitive and must be revalidated before implementation:

- [Google Cloud Run](https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run)
- [Google Vertex AI Agent Engine](https://cloud.google.com/vertex-ai/generative-ai/docs/reasoning-engine/overview)
- [Microsoft Foundry Agent Service](https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/runtime-components)
- [Microsoft Container Apps Jobs](https://learn.microsoft.com/en-us/azure/container-apps/jobs)
- [Amazon Bedrock AgentCore](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html)
