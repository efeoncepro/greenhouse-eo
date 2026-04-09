# ISSUE-032 — Secret Manager payload contamination breaks runtime secrets

## Ambiente

staging + production

## Detectado

2026-04-08, reporte manual de usuario al descargar PDF/XML de Nubox en `staging` + auditoría posterior de secretos runtime críticos.

## Síntoma

- `Finance > Income > Descargar PDF/XML` devolvía error `401` aguas abajo desde Nubox.
- El runtime podía resolver secretos desde Secret Manager, pero algunos payloads llegaban con comillas envolventes o sufijos literales `\\n`.
- El patrón no estaba limitado a Nubox: también afectaba secretos usados por auth (`NEXTAUTH_SECRET`, `GOOGLE_CLIENT_SECRET`) y podía degradar sesiones, SSO o integraciones futuras.

## Causa raíz

- Algunos secretos fueron publicados en GCP Secret Manager como strings serializados o copy/pasteados con formato contaminado, por ejemplo `"secret-value"` en vez de `secret-value`.
- La capa canónica `src/lib/secrets/secret-manager.ts` hacía `trim()` del payload, pero no removía comillas envolventes ni sufijos literales `\\n`.
- Los consumers asumían que el valor resuelto ya era un scalar limpio y lo reenviaban tal cual a providers externos o a NextAuth.

## Impacto

- Nubox rechazaba `Authorization: Bearer "..."` con `401 Unauthorized`.
- `NEXTAUTH_SECRET` y `GOOGLE_CLIENT_SECRET` quedaban expuestos al mismo patrón si el secreto estaba contaminado.
- El problema podía reaparecer cada vez que un operador publicara una nueva versión de un secreto sin una guía de higiene clara.

## Solución

- `src/lib/secrets/secret-manager.ts` ahora sanea tanto payloads devueltos por GCP Secret Manager como fallbacks por env:
  - remueve comillas envolventes simples o dobles
  - remueve sufijos literales `\\n` / `\\r`
  - hace `trim()` final antes de entregar el valor al runtime
- Se agregó cobertura en `src/lib/secrets/secret-manager.test.ts` para payloads quoted y env fallbacks contaminados.
- Se publicaron nuevas versiones limpias en GCP Secret Manager para:
  - `greenhouse-google-client-secret-shared`
  - `greenhouse-nextauth-secret-staging`
  - `greenhouse-nextauth-secret-production`
  - `webhook-notifications-secret`
- Se dejó documentado el protocolo anti-contaminación en `AGENTS.md`, `CLAUDE.md`, `project_context.md` y los docs canónicos de Cloud Governance / Security / Infrastructure.

## Verificación

- `pnpm exec vitest run src/lib/secrets/secret-manager.test.ts src/lib/auth-secrets.test.ts src/lib/nubox/client.test.ts` — OK
- `pnpm exec tsc --noEmit --incremental false` — OK
- `pnpm lint` — OK
- `pnpm staging:request /api/auth/providers --pretty` — `200`
- `pnpm staging:request /api/auth/session --pretty` — `200`
- `curl https://greenhouse.efeoncepro.com/api/auth/providers` — `200`
- `curl https://greenhouse.efeoncepro.com/api/auth/session` — `200`
- Auditoría posterior de secretos runtime críticos con `*_SECRET_REF`: todos los payloads quedaron limpios en origen.

## Estado

resolved

## Relacionado

- `src/lib/secrets/secret-manager.ts`
- `src/lib/secrets/secret-manager.test.ts`
- `src/lib/auth-secrets.ts`
- `src/lib/nubox/client.ts`
- `AGENTS.md`
- `CLAUDE.md`
- `project_context.md`
- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
