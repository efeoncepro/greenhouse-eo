# TASK-1454 internal identity smoke

## Scope

This runbook covers both identity planes of the non-production internal pilot: the private workload bridge and the human OAuth callback/session. It does not authorize Production, external clients, creative provider calls, asset storage, databases or a public branded launch surface.

## Reconcile infrastructure

```bash
infra/scripts/provision-task-1454-internal-smoke.sh
infra/scripts/deploy-task-1454-private-api.sh
```

The deployer is dedicated. The default Compute service account is never used as an application runtime or build identity. Cloud Build source/log access is bucket-scoped and the image writer grant is limited to the deployer.

## Verify the private API

Build the SDK, temporarily grant the local operator `roles/iam.serviceAccountTokenCreator` on `greenhouse-globe-caller`, and run:

```bash
GLOBE_API_BASE_URL='https://globe-api-internal-818083690953.southamerica-west1.run.app' \
GLOBE_API_AUDIENCE='https://globe-api-internal-818083690953.southamerica-west1.run.app' \
GLOBE_CALLER_SERVICE_ACCOUNT='greenhouse-globe-caller@efeonce-globe.iam.gserviceaccount.com' \
node scripts/smoke-private-api.mjs
```

Expected result:

```json
{"unauthenticated":"denied","exactAudience":"allowed","wrongAudience":"denied","service":"efeonce-globe","apiVersion":"v1"}
```

Remove the temporary operator grant immediately after the smoke.

## Vercel WIF diagnostic

The verified sequence is:

1. obtain the short-lived Vercel OIDC subject token;
2. exchange it through the exact WIF provider audience;
3. use the federated source client with `Impersonated.fetchIdToken()` for `greenhouse-globe-caller`;
4. mint an ID token for the exact Cloud Run audience;
5. send it in `X-Serverless-Authorization` through the Globe SDK contract.

Never let raw Google/Vercel auth errors escape a function. Some upstream errors can contain the short-lived subject token inside diagnostic request objects. Catch and map them to a canonical code before logging. If this happens, remove the deployment and its WIF subject binding immediately. TASK-1454 exercised that containment: all diagnostic previews and the `preview` binding were removed; no persistent credential existed.

## Human federation verification

The approved additive Greenhouse migration is applied. The registered `globe` OAuth client and binding allow only `efeonce_internal`, require `globe.studio.access`, project no Greenhouse roles and use an exact callback URI. Verify these paths with the canonical agent sessions without printing code, token, cookie, client secret or bypass secret:

- internal identity reaches the Globe callback and creates/revalidates a local session;
- client-tenant identity is rejected and creates no session;
- authorization code replay is rejected;
- explicit token revocation and client suspension converge to a denied Globe session;
- the same correlation ID is present across broker audit and callback result.

The verified pilot results are: internal allowed, client tenant denied, replay denied, revocation denied, suspension denied and correlation matched.

## Current rollback posture

- remove `roles/run.invoker` from the caller on `globe-api-internal`;
- remove the remaining development/staging WIF subject bindings;
- set Cloud Run traffic to zero or delete the non-production service after explicit operator approval;
- keep Production absent;
- suspend the Greenhouse Globe client/binding and disable its allowlist when a human rollback is required.

## Security evidence and residuals

- A short-lived Vercel OIDC token appeared inside a failed provider diagnostic. All diagnostic deployments and the Preview WIF subject binding were removed; the temporary operator impersonation grant was removed; no persistent key existed. Development and staging WIF bindings remain.
- Cloud Run platform request logs can include the one-time OAuth `code` and `state` query parameters on the GET callback. They are short-lived/one-time, but log retention and a future form-post callback should be evaluated before broader rollout.
- The Greenhouse OAuth client secret and Vercel bypass secret live in Secret Manager and are readable only by `globe-web-runtime`.
- Production, external tenants and service-account keys remain absent.
