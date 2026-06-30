# Runbook — Growth Forms: lanzamiento productivo (catálogo + selector + cutover del form)

> **Tipo:** Runbook operativo (paso a paso, operador-coordinado)
> **Creado:** 2026-06-27 por Claude
> **Task de ejecución:** `TASK-1264`
> **Dependencias de código:** `TASK-1258` (catálogo + auth), `TASK-1259` (selector WordPress), `TASK-1261` (form "Lead Gen - Web" sembrado)
> **Documentación técnica:** `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`

## Para qué sirve

Encender, en **producción**, el motor de Growth Forms para el primer form comercial real
(`efeonce-lead-gen-web`, GUID HubSpot `de4593c3`) y su selector en WordPress. Todo el
código ya está construido y probado en staging; este runbook es la secuencia de **rollout
operativo** (flags, credenciales, deploy, swap del embed vivo, verificación).

Es operador-coordinado y **hard-to-reverse en partes** (toca el sitio de marketing vivo +
el CRM HubSpot). No se ejecuta por pasos sueltos: se hace en ventana, con verificación
entre cada paso.

## Antes de empezar

- [ ] El código de TASK-1258 + TASK-1259 está en `main` (promoción `develop→main` por el
      **release control plane** — ver `greenhouse-production-release`). Sin esto, los
      endpoints/rutas no existen en prod.
- [ ] Acceso a: Vercel (env vars prod), GCP Secret Manager / `pnpm pg:connect`, SSH/WP-CLI
      Kinsta, HubSpot (confirmar GUID/mapping con comercial).
- [ ] Ventana de edición acordada + alguien que apruebe el diff de la página viva.
- [ ] Snapshot/backup de la página `/diseno-de-sitios-web/` (Elementor + `_thumbnail_id`).

## Estado de partida (verificado 2026-06-26)

- Catálogo: **ON + verificado live en staging** (`GROWTH_FORMS_CATALOG_API_ENABLED`).
- Embed key minteada para surface `fhsf-efeonce-lead-gen-web` (staging/prod comparten la
  instancia `greenhouse-pg-dev` → misma surface/llave).
- Selector WordPress: construido en `efeonce-public-site-runtime` (plugin `eo-elementor-widgets`
  v0.8.0, commit `27c1468`), **sin deploy a Kinsta**.
- Destino HubSpot del form: `delivery_mode='disabled'` (shadow).
- Flags prod (todos OFF): `GROWTH_FORMS_PUBLIC_API_ENABLED`, `GROWTH_FORMS_SERVER_VALIDATION_ENABLED`,
  `GROWTH_FORMS_CATALOG_API_ENABLED`, `GROWTH_FORMS_DISPATCH_ENABLED`,
  `GROWTH_FORMS_HUBSPOT_SECURE_SUBMIT_ENABLED`.

## Paso a paso

### Fase A — Catálogo + selector (bajo riesgo, no toca el form vivo)

1. **Flag prod del catálogo**: `vercel env add GROWTH_FORMS_CATALOG_API_ENABLED true production` + redeploy prod.
2. **Embed key**: `pnpm growth:forms:embed-key --surface-id fhsf-efeonce-lead-gen-web` → copiar el `SECRET` (se muestra 1 vez; no va a git ni al navegador).
3. **wp-config del sitio vivo** (vía Kinsta):
   ```php
   define( 'GREENHOUSE_GROWTH_CATALOG_SURFACE_ID', 'fhsf-efeonce-lead-gen-web' );
   define( 'GREENHOUSE_GROWTH_CATALOG_EMBED_KEY', '<SECRET del paso 2>' );
   // GREENHOUSE_GROWTH_CATALOG_BASE_URL por defecto = https://greenhouse.efeoncepro.com
   ```
4. **Deploy del plugin** a Kinsta (rail documentado, con backups):
   `scp` los archivos del plugin → `opcache_reset` → `wp kinsta cache purge --all`.
5. **Verificar selector**: abrir `/diseno-de-sitios-web/` en el editor Elementor → el panel del
   widget muestra "✓ Catálogo conectado · N formularios" y el desplegable pobla con
   `Lead Gen - Web — v1 · …`. Sin tocar la página todavía.

### Fase B — Cutover del form vivo (alto riesgo: sitio vivo + CRM)

6. **Flags prod del motor (juntos)**: `GROWTH_FORMS_PUBLIC_API_ENABLED=true` **+**
   `GROWTH_FORMS_SERVER_VALIDATION_ENABLED=true` (decisión operador 2026-06-26: en prod
   nacen juntos para que el primer submit nazca validado) + `GROWTH_FORMS_DISPATCH_ENABLED`
   + `GROWTH_FORMS_HUBSPOT_SECURE_SUBMIT_ENABLED` (ops-worker). Redeploy.
7. **Destino HubSpot → entrega**: cambiar `form_destination` del form a `delivery_mode='direct'`
   apuntando al GUID productivo `de4593c3` con el `fieldMapping` completo (10 campos).
   Confirmar mapping con comercial ANTES.
8. **Swap del embed**: en `/diseno-de-sitios-web/`, reemplazar el embed HubSpot directo por el
   widget Growth Form (elegido del desplegable). Aprobación humana del diff.
9. **Smoke productivo (1 lead de prueba)**: enviar el form en la página viva → verificar
   (a) `<greenhouse-form>` monta y emite `gh_form_*` al dataLayer, (b) submission llega al
   ledger Greenhouse, (c) `form_destination_attempt='succeeded'` + 200 + contacto en HubSpot,
   (d) limpiar el contacto de prueba del CRM.
10. **Monitoreo 7 días**: submissions, destination attempts, errores public-site, signals
    `growth.forms.*`. Cooldown 24h antes de ampliar a más páginas.

## Qué significan los estados / señales

- Selector "✓ Catálogo conectado · N" = Fase A OK.
- Selector "catálogo no habilitado en este entorno" = falta el flag prod o las constantes.
- `destinationReadiness: destination_disabled` en el catálogo = el destino sigue en shadow
  (esperado hasta el paso 7).

## Qué NO hacer

- **NUNCA** meter el bypass SSO de staging en el wp-config de prod (apuntar el plugin a prod).
- **NUNCA** flipear `SERVER_VALIDATION` solo en prod antes del cutover (no-op no-verificable;
  nacen juntos con `PUBLIC_API`).
- **NUNCA** cambiar el destino a `direct` sin confirmar el GUID/mapping con comercial.
- **NUNCA** editar la página viva sin snapshot + aprobación del diff.
- **NUNCA** dejar un contacto de prueba en el CRM productivo.

## Rollback

| Qué | Cómo | Tiempo |
|---|---|---|
| Catálogo / selector | flag `GROWTH_FORMS_CATALOG_API_ENABLED=false`; el plugin degrada al slug manual | < 5 min |
| Plugin (deploy) | restaurar backup del plugin en Kinsta + cache purge | < 15 min |
| Flags del motor | flags a `false` + redeploy → endpoints 404 | < 5 min |
| Destino HubSpot | `delivery_mode='disabled'` → deja de entregar (attempts append-only, no se borran) | < 5 min |
| Página viva | restaurar snapshot Elementor de `/diseno-de-sitios-web/` | < 15 min |

## Problemas comunes

- **El desplegable no pobla** → revisar flag prod del catálogo + constantes wp-config +
  que `origin` del sitio esté en el `origin_allowlist` de la surface (curl al endpoint).
- **401 del catálogo** → embed key no coincide (re-mintear) o origin no permitido.
- **Submit 404** → `GROWTH_FORMS_PUBLIC_API_ENABLED` OFF en prod.

## Referencias técnicas

- Ledger de flags: `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- Manual del selector: `docs/manual-de-uso/growth/incrustar-formulario-wordpress-astro.md`
- Release control plane: skill `greenhouse-production-release`
- Specs: `docs/tasks/in-progress/TASK-1258-*.md`, `TASK-1259-*.md`, `TASK-1261-*.md`
