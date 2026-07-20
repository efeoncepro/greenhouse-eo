# Local Authentication

Local authentication is an operator convenience, not a production credential source.

## Required local sessions

Greenhouse's operating contract requires both Google CLI and Application Default Credentials sessions:

```bash
gcloud auth login
gcloud auth application-default login
```

- `gcloud auth login` authenticates `gcloud` commands.
- `gcloud auth application-default login` authenticates Google client libraries such as `google-auth-library`.
- One does not replace the other.

Do not place `VERCEL_OIDC_TOKEN`, service-account JSON or raw access/identity tokens in `.env` files. When the dedicated Globe service accounts exist, prefer local service-account impersonation over broad direct user access.

## SDK usage

```ts
import { GlobeClient } from '@efeonce-globe/sdk';
import { createGoogleAdcIdTokenAuth } from '@efeonce-globe/sdk/google-auth';

const audience = process.env.GLOBE_API_AUDIENCE;
if (!audience) throw new Error('globe_api_audience_missing');

const globe = new GlobeClient({
  baseUrl: audience,
  audience,
  auth: createGoogleAdcIdTokenAuth({ audience }),
});

await globe.health({ correlationId: crypto.randomUUID() });
```

The audience must be the exact Cloud Run service audience configured by the deployment. A browser custom domain must not be substituted implicitly.

## Current rollout state

- The SDK and ADC adapter exist and are covered by unit tests.
- No Globe Cloud Run service or service account has been provisioned.
- Therefore no live identity-token smoke is possible yet.
- A local developer session must never be treated as evidence that the production WIF path works.
