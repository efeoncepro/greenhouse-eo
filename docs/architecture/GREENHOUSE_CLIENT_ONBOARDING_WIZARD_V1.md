# Greenhouse — Client Onboarding Wizard ("Puerta única de alta de cliente") V1

> **Tipo:** Spec arquitectónica canónica (agent-facing)
> **Estado:** Vigente desde 2026-06-03 (TASK-992/998/1001)
> **Ruta runtime:** `/agency/clients/new` (flag `CLIENT_LIFECYCLE_ONBOARDING_ENABLED`)
> **Mockup aprobado:** `src/views/greenhouse/agency/clients/mockup/`

El wizard es la **puerta única canónica de nacimiento de cliente** (TASK-992). En UN
solo flujo guiado de 6 pasos crea/vincula la identidad (org), instancia el Cliente +
perfil de facturación, gobierna la transición a `active_client`, crea el Space
operativo y abre el caso de onboarding con su checklist — todo en **una transacción
atómica**. Es idempotente: completa clientes existentes "media-cocidos" sin duplicar.

---

## 1. Stack

| Capa | Tecnología |
|---|---|
| UI | Next.js 16 App Router (server page + client view) + MUI 7 + Vuexy |
| Vista | `src/views/greenhouse/agency/clients/ClientOnboardingView.tsx` (client component) |
| Page | `src/app/(dashboard)/agency/clients/new/page.tsx` (server, `requireServerSession` + flag + capability) |
| Estado UI | `useState` local (wizard de pasos) — no Redux |
| Copy | `src/lib/copy/client-onboarding.ts` (`GH_CLIENT_ONBOARDING`, es-CL) |
| Helpers de form | `src/lib/client-onboarding/form-helpers.ts` (país, taxId, moneda, **`toCanonicalSpaceType`**, SpaceType) |
| Backend (write SSOT) | `src/lib/client-lifecycle/commands/provision-client-from-wizard.ts` |
| API | `POST /api/admin/clients/lifecycle/provision` (capability `client.lifecycle.case.open`) |
| Completitud (read SSOT) | `src/lib/client-lifecycle/queries/resolve-client-completeness.ts` + `GET .../completeness` |
| Notion connect | `src/lib/client-onboarding/notion-connect-store.ts` + `notion-token-connect.ts` |
| Persistencia | PostgreSQL (Cloud SQL, usuario runtime `greenhouse_app`) |

---

## 2. Los 6 pasos (UI + datos)

1. **Origen** — ¿de dónde viene? `HubSpot` (empresa del CRM, prefill), `Nubox` (venta facturada), `Manual`. Cards `OriginCard` con isotipo de marca. La pick de HubSpot setea `existingOrganizationId` si la empresa ya existe en Greenhouse.
2. **Identidad** — razón social, RFC/RUT (validación por país), país (`CustomTextField select`), industria. Prefill + chips de inferencia. Gate de duplicado por tax_id ("usar existente" vs "crear nuevo").
3. **Comercial** — tipo de engagement, fecha de inicio/término (`GreenhouseDatePicker`), fases (form con `GreenhouseDatePicker`).
4. **Finanzas** — moneda de pago (incl. **MXN/UF/UTM**), términos de pago, contactos de finanzas (prefill HubSpot).
5. **Espacio** — nombre del space, tipo (Cliente/Interno), aprovisionamiento: Notion (crear/**vincular** teamspace) + Teams (crear/**vincular** canal). El **código numérico es automático** (allocator `allocateSpaceNumericCode`, NO lo asigna el operador).
6. **Confirmar** — resumen por sección + "qué va a pasar" + checkboxes + CTA adaptativo (**Crear** / **Completar** / **Abrir** según completitud).

---

## 3. Componentes reutilizables (canónicos)

| Componente | Reusable | Uso |
|---|---|---|
| `GreenhouseDatePicker` | ✅ `@/components/greenhouse` | TODO input de fecha (Comercial + fases). NUNCA `type=date` nativo. Estética encapsulada (ver `reference_greenhouse_datepicker_canonical`). |
| `NotionIsotype` / `TeamsIsotype` / `HubSpotIsotype` | ✅ `@/components/greenhouse/brand/BrandIsotypes` | Isotipos de integraciones de terceros. Glyphs Tabler (Notion/Teams) + path real simple-icons (HubSpot). NUNCA SVG inventado. Ver DESIGN.md "Brand assets — Integraciones de terceros". |
| `OriginCard` | local (wizard) | Card de selección con `icon` (className) o `iconNode` (ReactNode, p. ej. `<HubSpotIsotype>`). |
| Banner de completitud | local (wizard) | Alert ámbar/info según `ClientCompleteness` (3 estados). |
| `CustomTextField`, `CustomAutocomplete` | ✅ Vuexy | Inputs/selects. |

**Estado de reutilización:** `GreenhouseDatePicker` y `BrandIsotypes` ya son canónicos compartidos. `OriginCard`, el stepper-rail y el banner de completitud son wizard-local hoy; candidatos a extracción si emerge un segundo wizard (ver §9 Pendiente).

---

## 4. Microinteracciones

- **OriginCard**: hover `translateY(-2px)` + borde primary + bg `action.hover` (150ms cubic-bezier); `focus-visible` outline; radio check animado.
- **Cards de aprovisionamiento (Notion/Teams)**: MUI `Button` `contained`/`tonal` con ripple + el título hereda el color de contraste (`color: 'inherit'`) — legible en ambos estados.
- **Stepper-rail**: progreso 0→100% + estados de paso (completado/en-curso) + "Borrador guardado".
- **GreenhouseDatePicker**: calendario temado (hoy resaltado, navegación de mes).
- **Pantalla de éxito**: check verde + resumen + próximos pasos del checklist.
- Todas respetan `prefers-reduced-motion` (vía MUI + `useReducedMotion`).

> Validación visual: GVC (`pnpm fe:capture`) — scenarios `client-onboarding-wizard-runtime` + `--route=/agency/clients/new`.

---

## 5. Estados de UI honestos (state-design)

- **Origen nuevo** → CTA "Crear cliente".
- **Org existente incompleta** ("media-cocida": `active_client` sin client/space/caso) → banner ámbar con los gaps + CTA "**Completar cliente**".
- **Org existente completa** → CTA "Abrir cliente" (no re-crea).
- **Notion connect diferido** → pantalla de éxito con aviso "Notion quedó pendiente" (caso de borde: API de Notion caída).
- **Degradado** → si la completitud no se puede resolver, el wizard sigue como alta normal (degradación honesta).

---

## 6. Backend — el flujo de nacimiento (atómico)

`provisionClientFromWizard(input)` corre en **una sola tx** (`withTransaction`):

1. **Org (SSOT TASK-991)** — `upsertCanonicalOrganization` (identidad + rol client + type). `lifecycle_stage` NO se escribe acá.
2. **Cliente** — `instantiateClientForParty` (crea `clients` + `client_profiles` con la moneda, incl. MXN). Idempotente: si ya existe, lo reusa (`OrganizationAlreadyHasClientError`).
3. **Space** — reusa el existente o crea uno nuevo con `space_type` **canónico** (`toCanonicalSpaceType`) + `numeric_code` del allocator (TASK-700). Emite outbox `commercial.space.auto_created`.
4. **Notion link (opcional)** — `writeSpaceNotionSourcesFromIntent` en un **SAVEPOINT** (un fallo no envenena la tx).
5. **Promote (SSOT)** — `promoteParty('active_client')` (único writer de `lifecycle_stage` + history). No-op si ya está activo.
6. **Caso de onboarding** — `provisionClientLifecycle` (caso + 10 ítems de checklist).

El route (`provision/route.ts`): valida origen → si hay `notionConnect`, llama `provisionNotionConnectIntent` (discovery + secret) **no-bloqueante** (si falla, el cliente se crea igual + warning) → llama el composer → devuelve 201 (+ `notionConnectWarning`). Errores no mapeados → 502 con **`detail` sanitizado + `pgCode`** (NO el genérico opaco).

---

## 7. Lecciones de bug class (TASK-992/998 — 2026-06-03)

Cinco bugs encadenados costaron horas porque el error genérico "No se pudo procesar
la solicitud de ciclo de vida" **escondía la causa**. Quedan como invariantes:

1. **`space_type` canónico** — el wizard usa vocabulario UI (`client`/`internal`/`partner`); la DB exige `client_space`/`internal_space` (CHECK). Mapear SIEMPRE con `toCanonicalSpaceType`; NUNCA pasar el valor crudo al INSERT.
2. **Columnas de IDs de Notion = TEXT** — los IDs de Notion vienen con guiones (36 chars). `space_notion_sources.notion_db_*` eran `VARCHAR(32)` → overflow 22001. Cualquier columna que guarde un ID de Notion debe ser TEXT/≥36.
3. **SAVEPOINT para errores tragados dentro de una tx** — un `try/catch` que traga un error de query DENTRO de una tx PG la deja abortada (25P02) y TODO lo siguiente revienta. Si un paso opcional puede fallar y se quiere continuar, envolverlo en `SAVEPOINT` + `ROLLBACK TO SAVEPOINT`.
4. **Secret write del runtime** — el SA `greenhouse-portal@` necesita rol acotado para escribir el token Notion per-cliente (ver `reference_runtime_sa_secret_write_grant`). NUNCA admin.
5. **Error API con detalle** — `mapLifecycleError` devuelve `detail` (redactado) + `pgCode`. Un error genérico opaco es deuda de diagnóstico; el detalle sanitizado es la diferencia entre minutos y horas.

Bonus: el rol PG del runtime es **`greenhouse_app`** (miembro de `cloudsqlsuperuser`), NO `greenhouse_runtime` (NOLOGIN). No asumir el rol — verificar con `pg_stat_activity`.

---

## 8. Tests (anti-regresión)

- `src/lib/client-onboarding/form-helpers.test.ts` — contrato de `toCanonicalSpaceType` (bug del CHECK).
- `src/lib/client-lifecycle/commands/provision-client-from-wizard.live.test.ts` — **test LIVE** del flujo completo con `spaceType='client'` + Notion IDs de 36 chars + completar org media-cocida. Habría atrapado los bugs #1 y #2. Se saltea sin DB.
- `src/lib/client-onboarding/notion-connect-store.test.ts` — shape del connect.
- Gate de cierre: `pnpm vitest run src/lib/client-onboarding src/lib/client-lifecycle`.

---

## 9. Pendiente / forward-looking

- Extraer `OriginCard`, stepper-rail y banner de completitud a `src/components/greenhouse/*` cuando emerja un segundo wizard.
- Smoke E2E del alta completa en `tests/e2e/smoke/` (hoy cubierto por el live test + GVC).
- Reconciliar Notion/Teams link (hoy en el wizard) vs el checklist (TASK-998 dice checklist) — open question de gobernanza.

---

## 10. Hard rules

- **NUNCA** pasar `space_type` crudo del wizard al INSERT — usar `toCanonicalSpaceType`.
- **NUNCA** guardar un ID de Notion en una columna < 36 chars.
- **NUNCA** dejar un `try/catch` que trague un error de query dentro de una tx sin `SAVEPOINT` (envenena la tx).
- **NUNCA** crear cliente fuera de `provisionClientFromWizard` (puerta única) ni escribir `lifecycle_stage` fuera de `promoteParty`.
- **NUNCA** devolver el genérico "ciclo de vida" sin `detail` + `pgCode`.
- **SIEMPRE** que el wizard cambie, correr el live test + GVC antes de cerrar.
