# Alta de una surface Growth Form (checklist end-to-end)

> **Tipo:** Manual de uso / runbook operativo
> **Version:** 1.0 — 2026-07-05 (Claude)
> **Doc funcional:** [docs/documentation/growth/motor-formularios-publicos.md](../../documentation/growth/motor-formularios-publicos.md)
> **Contrato runtime:** [docs/architecture/growth-public-forms-runtime-contract.md](../../architecture/growth-public-forms-runtime-contract.md)
> **Runbook hermano:** [Operar el Motor de Formularios de Growth](operar-motor-formularios.md) · [Incrustar el formulario (WordPress/Astro)](incrustar-formulario-wordpress-astro.md)

## Para qué sirve

Publicar un Growth Form **en un host/dominio nuevo** sin que se rompa en producción. Existe porque el motor es data-driven (la mayoría de las piezas se hacen por configuración, sin código), **pero** hay pasos por-surface fáciles de olvidar — sobre todo el **hostname de Turnstile** y el **smoke end-to-end en la surface real** — que si faltan dejan el formulario aceptando datos pero **sin generar nada** (síntoma clásico: "el form envía pero nunca llega el resultado").

Caso fuente: `think.efeoncepro.com/brand-visibility` (TASK-1327), donde faltó el hostname de Turnstile + el CORS del status del grader + verificación end-to-end en la surface nueva. Ver §Problemas comunes.

## Antes de empezar: ¿tu form es Tier 1 o Tier 2?

La cantidad de trabajo depende del **success behavior**, no del tamaño del form.

| | **Tier 1 — estándar** | **Tier 2 — pipeline async** |
|---|---|---|
| Ejemplos | Suscripción, lead magnet, contacto, gated content | AI Visibility Grader (`tokenized_report`) |
| Success behavior | `inline_message` · `redirect` · `asset_access` · `review_pending` | `tokenized_report` |
| Qué pasa al enviar | Entrega a HubSpot (reintentada) → gracias/asset | Crea un objeto de dominio (grader run) → poll de status → reporte en pantalla |
| Trabajo | **Solo config/data** (secciones A–F) | Config + **wiring de dominio** (secciones A–F **y** G) |

Regla: si tu form es Tier 1, **no deberías escribir código**. Si te encuentras escribiendo un consumer, un endpoint de status o una superficie de reporte, estás en Tier 2 — y eso es porque el form dispara trabajo real, no porque el motor sea frágil.

## Paso a paso — Tier 1 (config-only)

### A. Publicar el form

1. **Growth → Forms** (`/admin/growth/forms`) → **Nuevo formulario** (o versionar uno existente).
2. Declarar campos, consentimiento, retención y **success behavior**.
3. **Publicar.** El motor no publica si falta consentimiento/retención/behavior; si falta algo, lo dice.
4. Anotar el **`form_key`** (UUID estable, público/opaco) — es lo que va en el embed. **No** es el HubSpot `formGuid`.

### B. Registrar la host surface + el origin (CORS)

5. Crear/activar la **host surface** del sitio (`form_host_surface`).
6. Agregar el origin del host (ej. `https://think.efeoncepro.com`) al **`origin_allowlist_json`** de esa surface. Desde TASK-1335 el transporte CORS del motor es la **unión gobernada** de los origins de las surfaces `active` — agregar un origin permitido es **un dato, nunca código**. No tocar el route helper.

### C. Configurar el destino (HubSpot u otro)

7. Crear la fila de **`form_destination`** con el adapter reusable (`hubspot_forms_secure_submit`): `formGuid`, `portalId`, `fieldMapping`, `consentText`, `retry_policy`. El browser nunca ve este mapping.

### D. Turnstile — agregar el hostname del host ⚠️

8. En el panel de Cloudflare Turnstile, abrir el widget cuyo **Site Key** sea el del render contract y **agregar el hostname del host nuevo** (ej. `think.efeoncepro.com`) al Hostname Management. **Guardar.**
   - **Turnstile NO hereda subdominios por la raíz en este widget** (verificado en el caso Think: `efeoncepro.com` no cubría `think.efeoncepro.com`). Cada host/subdominio nuevo se agrega **explícito**.
   - Propaga en segundos, sin redeploy.
   - Si falta: el widget falla client-side y el submit **muere antes de llegar al backend** → banner genérico "No pudimos enviar tu formulario".

### E. Incrustar el `<greenhouse-form>`

9. En el host, poner el custom element con `form-key`, `surface`, `base-url` (y opcional `appearance="bare"`, `locale`, `color-scheme`). El sitio no captura datos ni implementa submit; solo aporta dónde va y el color de marca. Detalle: [incrustar-formulario-wordpress-astro.md](incrustar-formulario-wordpress-astro.md).

### F. Smoke end-to-end en la surface real (gate de cierre) ✅

10. **Desde un browser real** (no automation — Turnstile bloquea headless), en la URL pública del host:
    - Completar y enviar el form.
    - Confirmar el success behavior real (mensaje/redirect/asset).
    - Verificar la entrega: la submission aparece en el cockpit y el lead llega a HubSpot (o el destino declarado).
11. **Verificación de transporte** (server-to-server, complementa el browser):
    ```bash
    # preflight + submit deben reflejar ACAO para el origin del host
    curl -s -o /dev/null -D - -X OPTIONS \
      "https://greenhouse.efeoncepro.com/api/public/growth/forms/<form-key>/submit" \
      -H "Origin: https://<host>" -H "Access-Control-Request-Method: POST" | grep -i access-control-allow-origin
    ```

> **Fin del Tier 1.** Si tu form es estándar, terminaste acá — sin código.

## Paso a paso — Tier 2 (extra, solo `tokenized_report`/async)

Además de A–F, un form que dispara pipeline async necesita **wiring de dominio**. No lo declares live hasta cerrar todo esto:

### G. Wiring del pipeline async

12. **Consumer reactivo submit→objeto de dominio.** Debe existir y estar desplegado el consumer que convierte la submission aceptada en el objeto de dominio (para el grader: `growth_grader_run_from_submission` crea el `grader_run` + materializa el lead). Sin esto, la submission queda `delivered` pero **no nace el run** → el loader hace poll a un run inexistente para siempre.
13. **Degradación, no dead-end.** El consumer **NUNCA** debe matar la creación del objeto por un dato de dominio irresoluble (ej. `category unresolved, node=unknown`). Debe degradar (crear con default/`unknown` + flag de reclasificación). Un intake público que dead-end-ea al usuario por una categoría no mapeada es un bug de robustez.
14. **CORS de las rutas async.** El status-poll y el reporte viven **fuera** de las rutas genéricas del motor (`/api/public/growth/ai-visibility/run/[handle]`, `/report/[token]`), así que su CORS **no lo cubre** el contrato genérico de forms — hay que reflejar ACAO en cada una reusando el helper gobernado (`publicFormsCorsHeaders` / `publicFormsOptionsResponse`), **no** inventar un resolver paralelo.
15. **Smoke del handoff completo:** submit → objeto creado → pipeline procesa → estado `ready` + token → el browser lee el status (CORS OK) → abre la ruta de reporte.

## Qué significan los estados / señales

- **`form_submission.status`**: `delivered` = aceptada y (si hay destino) entregable. Ojo: `delivered` **no** implica que un pipeline async haya creado su objeto de dominio — para Tier 2 hay que mirar el objeto (ej. `grader_run`).
- **Cockpit (Growth → Forms):** retry queue, dead letters, cobertura publicada, host surfaces, destinos, evidence ledger.
- **Grader (Tier 2):** `grader_runs.public_delivery_state = ready` con `poll_token` = análisis publicable listo. `intake_events` con `run_id = null` repetidos = el loader poll-ea un run que nunca nació (revisar G12/G13).

## Qué NO hacer

- **No** declarar la surface live sin el smoke end-to-end **en el host real** (§F/§G15). "Tests verdes" no prueba runtime cross-origin ni Turnstile.
- **No** agregar origins CORS por código en el route helper — es un dato en `form_host_surface` (TASK-1335).
- **No** hardcodear el HubSpot `formGuid`/`portalId` en el cliente ni exponerlos en el render contract; viven server-only en `form_destination`.
- **No** asumir que Turnstile cubre subdominios desde la raíz — agregar cada host explícito.
- **No** (Tier 2) crear un resolver CORS paralelo para status/report; reusar el helper gobernado.
- **No** (Tier 2) dejar que el consumer mate el objeto por un dato de dominio irresoluble.

## Problemas comunes

| Síntoma | Causa | Fix |
|---|---|---|
| "No pudimos enviar tu formulario" (banner al enviar) | Hostname del host no está en el allowlist del widget Turnstile → widget falla client-side, el submit no llega al backend | Agregar el hostname al widget (§D). Propaga en segundos |
| El form envía pero **nunca llega el resultado** (Tier 2) | (a) El consumer submit→objeto no creó el run (no desplegado / murió por dato irresoluble), y/o (b) el endpoint de status no devuelve CORS → el browser no puede leer el poll | (a) Verificar consumer + degradación (§G12/G13); (b) reflejar ACAO en status/report (§G14) |
| El submit llega pero no aparece en HubSpot | Falta la fila `form_destination` o el mapping es inválido | Configurar el destino (§C); revisar retry queue/dead letters en el cockpit |
| CORS bloquea al browser aunque el submit "funciona" en curl | curl server-to-server no valida CORS; el browser sí. Origin no está en la surface o la ruta no refleja ACAO | Agregar origin a la surface (§B) y/o reflejar ACAO en la ruta (§G14) |

## Referencias técnicas

- Contrato runtime + CORS gobernado: [growth-public-forms-runtime-contract.md](../../architecture/growth-public-forms-runtime-contract.md) (§Public Host CORS, TASK-1335).
- Doc funcional del motor: [motor-formularios-publicos.md](../../documentation/growth/motor-formularios-publicos.md).
- Código: `src/lib/growth/forms/**` (commands/readers/compiler/dispatch), `src/lib/growth/forms/destinations/hubspot/**`, `src/app/api/public/growth/forms/**` (+ `cors.ts` = resolver gobernado), renderer portable `src/growth-forms-renderer/**`.
- Tier 2 grader: `src/lib/growth/ai-visibility/public-intake/**` (forms-engine-binding, consumer `growth_grader_run_from_submission`), `src/app/api/public/growth/ai-visibility/run/**` + `report/**`.
- Flags (SoT humano): [FEATURE_FLAG_STATE_LEDGER.md](../../operations/FEATURE_FLAG_STATE_LEDGER.md).
