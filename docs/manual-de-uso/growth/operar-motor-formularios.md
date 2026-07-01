# Operar el Motor de Formularios de Growth

> **Tipo:** Manual de uso / runbook operativo
> **Version:** 1.2 — 2026-06-30 (Codex, AEO `/aeo-2/` live bridge)
> **Doc funcional:** [docs/documentation/growth/motor-formularios-publicos.md](../../documentation/growth/motor-formularios-publicos.md)
> **Estado de flags (SoT humano):** [docs/operations/FEATURE_FLAG_STATE_LEDGER.md](../../operations/FEATURE_FLAG_STATE_LEDGER.md)

## Para que sirve

Operar (prender, verificar, revertir) el motor de formularios publicos de Growth y su entrega a HubSpot. La operación humana diaria vive en **Growth → Forms** (`/admin/growth/forms`); las APIs siguen siendo el contrato gobernado para automatización, Nexa, MCP, scripts y verificación.

## Usar el cockpit visual

1. Entra al menú vertical **Growth → Forms**.
2. Revisa el **Pulso operativo**: cobertura publicada, retry queue, dead letters y surfaces gobernadas.
3. Selecciona un formulario en el command center. El inspector muestra readiness, host surfaces, destinos, submissions recientes y evidence ledger.
4. Para authoring básico, usa **Nuevo formulario**. Crea un draft low-risk con email, organización, interés y consentimiento explícito.
5. Usa las acciones gobernadas: **Enviar a review**, **Publicar**, **Deprecar**, **Archivar** y **Ejecutar dispatch**.
6. Para auditoría, abre **Ver evidencia** y revisa consent snapshot, delivery attempts, retry state y errores.

El cockpit consume los mismos Product APIs/readers del motor. No reemplaza smoke público: AEO `/aeo-2/` ya valida el motor público con un bridge HTML Turnstile, pero antes de generalizar producción hay que validar WordPress/dataLayer contra un form genérico renderizado por `<greenhouse-form>`.

## Los tres flags

El motor depende de tres flags independientes. Para que funcione punta a punta los tres deben estar ON en el environment.

| Flag | Dónde | Qué habilita | Default |
|---|---|---|---|
| `GROWTH_FORMS_PUBLIC_API_ENABLED` | Vercel (env por environment) | `GET/POST /api/public/growth/forms/*` (render + submit publico). OFF → 404 `disabled`. | OFF |
| `GROWTH_FORMS_DISPATCH_ENABLED` | Cloud Run `ops-worker` (`deploy.sh` ENV-branch) | el dispatcher async drena submissions aceptadas y las entrega. OFF → el scheduler dispara pero el handler no-opea. | OFF |
| `GROWTH_FORMS_HUBSPOT_SECURE_SUBMIT_ENABLED` | Cloud Run `ops-worker` (`deploy.sh` ENV-branch) | el adapter entrega a HubSpot Forms. OFF → `skipped` (la submission queda `accepted` esperando). | OFF |

**Verdad live:** `vercel env ls` (flag Vercel) + `gcloud run services describe ops-worker --region=us-east4` (flags worker). El ledger es el estado humano, no la verdad.

**Estado actual:** staging (`develop`) = los 3 ON (2026-06-25). Produccion = ON de forma acotada para `efeonce-aeo-diagnostic` en `/aeo-2/`; desde TASK-1294 `<greenhouse-form>` ya emite `captchaToken` cuando el contract declara Turnstile, y desde TASK-1296 AEO v3 declara `ui_policy_json.security.captcha`. Produccion ya serializa `render_contract.security.captcha` en el `GET` publico. No asumir rollout generico hasta pasar smoke WordPress/dataLayer con un form generico real.

## Prender en un environment

**Vercel (publico):**

```bash
echo "true" | vercel env add GROWTH_FORMS_PUBLIC_API_ENABLED staging   # o production
# luego redeploy para que tome efecto:
vercel redeploy <deployment-url> --scope efeonce-7670142f
```

**Ops-worker (dispatcher + HubSpot):** el patron canonico es el bloque `if [ "${ENV}" = "staging" ]` en `services/ops-worker/deploy.sh` (durable, sobrevive redeploys). Para prender en un ambiente, ajustar el default ahi y desplegar (CI on push develop para staging; release control plane para prod), o flip directo:

```bash
gcloud run services update ops-worker --project=efeonce-group --region=us-east4 \
  --update-env-vars GROWTH_FORMS_DISPATCH_ENABLED=true,GROWTH_FORMS_HUBSPOT_SECURE_SUBMIT_ENABLED=true
```

> El worker SA necesita `secretAccessor` sobre el secret `hubspot-access-token` (lo asegura `deploy.sh`). El token debe tener scope `forms` (lo exige secure-submit).

## Verificar

```bash
# 1. Endpoint publico vivo (debe devolver el render contract, no "disabled"):
pnpm staging:request /api/public/growth/forms/<slug>

# 2. Dispatcher manual (alternativa al scheduler */2):
#    POST /api/admin/growth/forms/dispatch (capability growth.forms.retry_delivery)

# 3. Estado de entrega de una submission:
#    GET /api/admin/growth/forms/submissions  (capability growth.forms.submissions.read)
```

Señales reliability (en `/admin/operations`): `growth.forms.dead_letter_count`, `growth.forms.destination_failure_rate`, `growth.forms.submission_rejection_rate`, `growth.forms.hubspot_submit_failed`. Steady = 0.

## Que significan los estados de entrega

- `accepted` → aceptada, esperando entrega (o el adapter esta `skipped`/OFF).
- `delivered` → entregada a todos los destinos. **Nunca se re-entrega** (at-most-once).
- `retrying` → fallo retryable (429/5xx/timeout); reintenta con backoff exponencial+jitter.
- `dead_letter` → agoto reintentos (MAX=5) o fallo no-retryable (mapping/auth). **Requiere humano** (revisar token/scope/mapping/HubSpot).

## Revertir (rollback)

- Vercel: `vercel env rm GROWTH_FORMS_PUBLIC_API_ENABLED staging` (o setear a false) + redeploy → publico 404 `disabled` (<5 min).
- Worker: `gcloud run services update ops-worker --update-env-vars GROWTH_FORMS_HUBSPOT_SECURE_SUBMIT_ENABLED=false` → adapter `skipped` (la submission queda `accepted`, no se pierde).

## Que NO hacer

- No generalizar el publico en produccion sin form publicado, host surface autorizado, CORS revisado, Turnstile operativo, smoke WordPress/dataLayer y sign-off. La excepcion vigente es AEO `/aeo-2/`, que sigue usando host bridge HTML aunque el renderer ya emite `captchaToken` y el form v3 ya declara `security.captcha`; migrarlo requiere task WordPress/visual separada.
- No llamar a HubSpot inline desde el submit: la entrega SIEMPRE corre en el dispatcher async (overlay #3).
- No reintentar manualmente una submission `delivered` (duplica el lead en HubSpot — secure-submit NO es idempotente).

## Publicar copy renderizable de un form (TASK-1297)

Para que el renderer muestre un CTA aprobado (ej. `Solicitar diagnóstico gratis →`) en vez del
default per-tipo, el copy se publica en el render contract (`copy.submit`). NO se edita una versión
publicada in-place: se clona, se setea el copy y se publica una versión nueva. El patrón canónico es
un script idempotente que resuelve el form por su `form_key` (identidad estable, no por etiqueta/slug),
muestra slug/form_id/surface antes de mutar, preserva fields/validación/Turnstile/destinos, y corre
dry-run por defecto. Ejemplo (AEO): `scripts/growth/activate-aeo-render-copy-contract.ts` —
`npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/activate-aeo-render-copy-contract.ts`
(dry-run) y `--apply` para publicar. El `form_key` real de un form: `SELECT slug, form_key FROM greenhouse_growth.form_definition`.

## Agregar campos a un formulario de HubSpot

Cuando un destination HubSpot Forms necesita recibir un campo nuevo, no hacerlo a mano a ciegas en
la UI. Usar el script gobernado:

```bash
pnpm hubspot:forms:upsert-fields -- --config scripts/hubspot/examples/upsert-aeo-brand-website-field.json
pnpm hubspot:forms:upsert-fields -- --config scripts/hubspot/examples/upsert-aeo-brand-website-field.json --apply
```

El script es dry-run por defecto. Con `--apply`:

- lee la definición del form por HubSpot Forms API `2026-09-beta`;
- verifica que las CRM properties existan;
- crea properties si el config trae `createProperty`;
- marca properties como `formField=true` cuando corresponde;
- agrega el campo faltante a `fieldGroups` preservando el resto de la definición del form.

Config mínimo:

```json
{
  "formId": "<hubspot-form-guid>",
  "fields": [
    {
      "objectType": "companies",
      "name": "domain",
      "label": "Sitio web de la marca",
      "fieldType": "single_line_text",
      "after": "email"
    }
  ]
}
```

Si la property no existe, agregar `createProperty` con `label`, `type`, `fieldType` y opcionalmente
`options`. Después del `--apply`, actualizar también el `form_destination.mapping_json.fieldMapping`
en Greenhouse y correr un smoke de secure-submit; HubSpot puede rechazar fields enviados si no están
en la definición del form.

## Referencias tecnicas

- Arquitectura: `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md` (§Delta 2026-06-25 + §22).
- Flags: `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.
- Codigo: `src/lib/growth/forms/**`, `src/lib/growth/forms/destinations/hubspot/**`, `services/ops-worker/deploy.sh`.
