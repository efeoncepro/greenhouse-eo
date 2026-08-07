---
name: greenhouse-gcloud-auth-playwright
description: Autentica o renueva localmente Google Cloud CLI y Application Default Credentials mediante el runner Playwright del repo. Invoca esta skill cuando el operador solicite autenticación Gcloud, renovación OAuth, `gcloud auth login`, ADC, o una verificación de ambos carriles; el agente debe completar el flujo estándar sin pedir intervención manual.
---

# Gcloud Auth Playwright

Usa esta skill para que el agente complete el acceso local de Gcloud cuando el operador lo solicite. El
runner gobierna los dos carriles independientes: `gcloud auth login` para la CLI y
`gcloud auth application-default login` para ADC.

## Contexto local de Gcloud

- **Google Cloud CLI (`gcloud`)**: autenticado como `julio.reyes@efeonce.org` con ADC. Usar para Secret Manager, Cloud Run, Cloud SQL, Cloud Scheduler, BigQuery, Cloud Build, Workload Identity Federation. Project canónico: `efeonce-group`.
  - **GCP multi-proyecto:** `globe` para Globe; restaurar `default`.
  - **Regla operativa obligatoria**: cuando un agente necesite acceso interactivo local a GCP, debe lanzar **siempre ambos** flujos y no asumir que uno reemplaza al otro:
    - `gcloud auth login`
    - `gcloud auth application-default login`
  - Motivo: `gcloud` CLI y ADC pueden quedar desalineados; si solo se autentica uno, pueden fallar `bq`, `psql` via Cloud SQL tooling, Secret Manager o scripts del repo de forma parcial y confusa.

## Ejecución canónica

1. Lee `AGENTS.md`, `CLAUDE.md`, `project_context.md` y `Handoff.md`.
2. Para una solicitud explícita de autenticación o renovación, ejecuta desde la raíz:

   ```bash
   pnpm gcloud:auth:playwright -- --force
   ```

   El runner abre Chrome mediante Playwright, usa el perfil aislado de `.auth/`, completa la selección de
   cuenta, la clave y el consentimiento OAuth, entrega el código a Gcloud y termina con el preflight canónico.
3. Para una comprobación o mantenimiento sin forzar OAuth, ejecuta:

   ```bash
   pnpm gcloud:auth:playwright
   pnpm gcloud:auth:playwright -- --check-only
   ```

   El primer comando solo abre Playwright si CLI o ADC requieren renovación; el segundo nunca abre navegador.
4. Considera terminado el flujo solo cuando el preflight confirme CLI y ADC vigentes para `efeonce-group`.

## Credencial local

- La credencial queda en `.auth/gcloud-auth-credentials.json`, ignorada por Git y protegida con `0600`.
- El setup de una sola vez es `pnpm gcloud:auth:playwright:setup`; solicita la clave sin mostrarla y solo
  debe ejecutarse si falta o cambió la credencial local.
- Nunca agregues `.auth/` al índice, commit, screenshot, artefacto o log.
- Nunca pases la clave como argumento de shell ni la imprimas. No copies URLs OAuth, códigos, tokens, cookies
  ni errores raw al chat.

## Guardas de automatización

- Usa el runner `scripts/gcloud-auth-playwright.mjs`; no reconstruyas el flujo OAuth con pasos ad hoc.
- No uses el perfil personal real de Chrome ni configures `GCLOUD_AUTH_PLAYWRIGHT_PROFILE` hacia él.
- El flujo estándar es autónomo para el agente. Si Google presenta un reto de seguridad fuera del login,
  deja que el runner falle de forma segura y reporta el bloqueo sin pedir al operador que complete una pantalla
  ni registrar el desafío.
- No confundas que `gcloud auth print-access-token` funcione con ADC vigente: verifica ambos carriles.

## Referencias del repo

- Runner: `scripts/gcloud-auth-playwright.mjs`
- Setup protegido: `scripts/gcloud-auth-playwright-secret-setup.mjs`
- Verificación canónica: `scripts/gcloud-auth-preflight.sh`
- Manual: `docs/manual-de-uso/operations/gcloud-auth-playwright.md`
