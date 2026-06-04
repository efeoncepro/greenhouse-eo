# Auditoría — Fragmentación del nacimiento del Cliente / Organización

> **Tipo:** Auditoría arquitectónica + propuesta de solución
> **Fecha:** 2026-06-02
> **Autor:** Claude (Opus 4.8) a pedido del operador (Julio Reyes)
> **Skills invocadas:** `arch-architect` (overlay Greenhouse), `greenhouse-finance-accounting-operator`, `commercial-expert` (overlay Greenhouse), `info-architecture`, `forms-ux`
> **Caso fuente:** Grupo Berel (HubSpot company `55405407542`) — nacido a medias
> **Estado:** Hallazgos verificados contra código + base de datos real (read-only). Propuesta `Proposed` (requiere aceptación humana antes de implementar).
> **Relacionados:** `GREENHOUSE_360_OBJECT_MODEL_V1.md`, `GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` (TASK-535), `GREENHOUSE_CLIENT_LIFECYCLE_V1.md` (Aceptado, no implementado), `GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md` (TASK-611/612/613), `GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md`

---

## 0. Veredicto en una frase

> **El nacimiento de un cliente NO tiene una puerta canónica única. Hay ≥4 puertas de escritura independientes que se reparten las columnas de `organizations` sin un helper de escritura compartido, ninguna escribe la fila completa, y no existe ninguna señal que detecte la organización a medio cocinar. El resultado es un objeto 360 inconsistente por diseño — exactamente el estado en que quedó Grupo Berel.**

La UX terrible que percibiste es el síntoma de un problema **estructural de datos**, no de pantallas. Arreglar el formulario no lo resuelve; hay que fijar **una puerta de entrada canónica + un helper de escritura SSOT + el ciclo de vida como entidad de primer nivel**.

---

## 1. Evidencia que lo disparó (estado real de Grupo Berel)

Verificado en PostgreSQL productivo (read-only, 2026-06-02):

| Artefacto | Estado real | Esperado para un cliente completo |
|---|---|---|
| `greenhouse_core.organizations` | ✅ existe (`org-32333527…`, "Grupo Berel", `hubspot_company_id=55405407542`) | ✅ |
| `organization_type` | ❌ `'other'` (NO promovida a `client`) | `client` |
| `lifecycle_stage` | ⚠️ (probable `active_client` por HubSpot `customer`, sin confirmar en `organization_lifecycle_history`) | `active_client` |
| `legal_name` / `tax_id` | ❌ ambos `NULL` | `PINTURAS BEREL SA DE CV` / RFC `PBE970101718` |
| `country` | ❌ `'CL'` (default, nunca derivado de HubSpot MX) | `MX` |
| `greenhouse_finance.client_profiles` | ❌ inexistente | ✅ (con moneda — MXN tras TASK-990) |
| `greenhouse_core.spaces` | ❌ inexistente | ✅ Space operativo |
| `greenhouse_finance.income` (factura `28800562`) | ❌ no proyectada (huérfana en BQ) | ✅ AR en MXN/CLP/USD |

**Cadena causal exacta:** el merge en HubSpot disparó el webhook `company.propertyChange` → `hubspot_companies_intake` → `syncHubSpotCompanies` → `createPartyFromHubSpotCompany`. Esa ruta escribe `lifecycle_stage` + `hubspot_company_id` pero **omite por completo `organization_type`, `tax_id`, `country`, `legal_name`** (defaults de DB). Como `organization_type` quedó `'other'`:

- Berel es **invisible** en la lista de clientes de Finanzas (filtro `COALESCE(organization_type,'other') IN ('client','both')` en `src/app/api/finance/clients/route.ts:104`).
- Como `tax_id=NULL`, la proyección Nubox **no puede** matchear la factura `28800562` (el mapa `orgByRut` excluye `tax_id IS NULL`, `src/lib/nubox/sync-nubox-conformed.ts`), y el income se skipea (`if (!sale.client_id) return 'skipped'`, `src/lib/nubox/sync-nubox-to-postgres.ts:266`).

---

## 2. Causa raíz: dos modelos de propiedad de columna, sin helper compartido

`greenhouse_core.organizations` tiene **dos dimensiones ortogonales** escritas por puertas distintas que **no comparten un write helper**:

| Dimensión | Columna | Valores | Quién la escribe |
|---|---|---|---|
| Lifecycle comercial | `lifecycle_stage` | `prospect, opportunity, active_client, inactive, churned, provider_only, disqualified` (CHECK en migración TASK-535) | Puertas HubSpot / party commands |
| Tipo de party | `organization_type` | `other`(default), `client, supplier, both, efeonce_internal` (**sin CHECK** — la tabla precede a `migrations/`) | **Solo** las puertas Finance/Supplier |

→ **Una organización nacida por HubSpot NUNCA puede auto-completar `organization_type`/`tax_id`/`country`/`legal_name`.** Esas columnas solo son alcanzables por la puerta de Finanzas (`ensureOrganizationForClient`). Eso es precisamente el estado a medias de Berel: nació por una puerta que estructuralmente no puede terminar la fila.

Subdiagnóstico crítico: `organization_type` y `lifecycle_stage` **modelan dos cosas que deberían reconciliarse** (¿es `organization_type` derivable de `lifecycle_stage` + relaciones, en vez de una columna hand-set?). Hoy son independientes y divergen.

---

## 3. La matriz de fragmentación (artefacto central)

Columnas: **org**=crea fila `organizations`; **type→client**=setea `organization_type` a `client`/`both`; **tax/país**=setea `tax_id`+`country`+`legal_name`; **client legacy**=crea `greenhouse_core.clients`; **fin profile**=crea `client_profiles`; **space**=crea `spaces`; **hubspot**=linkea `hubspot_company_id`; **income**=proyecta Nubox income.

| Puerta de entrada (función) | org | type→client | tax/país | client legacy | fin profile | space | hubspot | income |
|---|---|---|---|---|---|---|---|---|
| **A1 Webhook HubSpot** → `createPartyFromHubSpotCompany` | ✅ | ❌ | ❌ | ⚠️ solo si `active_client` | ⚠️ solo si `active_client` | ❌ | ✅ | ❌ |
| **A2 Cron HubSpot** → `syncHubSpotCompanies` | ✅ | ❌ | ❌ | ⚠️ idem | ⚠️ idem | ❌ | ✅ | ❌ |
| **A3 Adopt (Cotizador)** → `/api/commercial/parties/adopt` | ✅ | ❌ | ❌ | ⚠️ idem | ⚠️ idem | ❌ | ✅ | ❌ |
| **A4 Finance CreateClient** → `ensureOrganizationForClient` | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ (si se pega) | ❌ |
| **A5 Nubox income sync** → `upsertIncomeFromSale` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (solo si RUT resuelve) |
| **A6 Supplier** → `ensureOrganizationForSupplier` | ✅ (`supplier`/`both`) | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **A7 Crear Space** → `createSpaceForClient` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **A8 promote/instantiate** | ❌ (mutan) | ❌ | ❌ | ✅ `instantiateClientForParty` | ✅ idem | ❌ | ❌ | ❌ |

⚠️ = condicional a `lifecycle_stage==='active_client'`.

**Tesis probada:** ninguna fila escribe la fila completa. Las puertas HubSpot (A1-A3) son dueñas de `lifecycle_stage`+`hubspot`; Finance (A4) es dueña de `organization_type`+`tax`+`país`+`fin profile`; Nubox (A5) proyecta income pero no crea org; Space (A7) es su propia escritura. **`organization_type` y `tax_id`/`country` son alcanzables SOLO por A4/A6.**

---

## 4. Análisis por las 5 lentes

### 4.1 Arquitectura (`arch-architect`)

- **Violación del SSOT (regla canónica #8):** la fila `organizations` tiene múltiples dueños de escritura sin un helper único. El overlay arch exige "NEVER read or write canonical aggregations outside their canonical VIEW + helper". Acá no hay un `writeCanonicalOrganization()` único; hay `createPartyFromHubSpotCompany`, `ensureOrganizationForClient`, `ensureOrganizationForSupplier`, `promoteParty` — cada uno tocando un subconjunto.
- **Dimensiones ortogonales mezcladas (regla #anti-enum):** `organization_type` vs `lifecycle_stage` modelan "rol contable" vs "etapa comercial" como columnas independientes que divergen. Una de las dos debe derivarse de la otra (+ relaciones), o ambas deben moverse por el mismo comando.
- **Falta defense-in-depth (TASK-742):** la superficie crítica "nacimiento de cliente" no tiene DB constraint (no hay CHECK en `organization_type`), ni signal de drift, ni audit unificado del nacimiento. La capa de gobernanza está incompleta.
- **Existe el patrón canónico y NO se usó:** `GREENHOUSE_CLIENT_LIFECYCLE_V1.md` (Aceptado 2026-05-07) ya propone el `client_lifecycle_case` orquestador espejando TASK-760 (offboarding de colaboradores, battle-tested). Está **Aceptado pero no implementado**. La regla del overlay ("NEVER invent primitives the canonized patterns inventory already covers") obliga a **activar/extender esa spec**, no inventar otra.

### 4.2 Finanzas (`greenhouse-finance-accounting-operator`)

- **`tax_id`/`country` no son cosméticos — son la llave de conciliación.** Sin `tax_id`, Nubox no puede anclar la factura (RCV/F29 SII se reconcilian por RUT/RFC). El nacimiento debe capturar la identidad tributaria **como gate**, no como campo opcional.
- **El perfil financiero no debe nacer por una puerta paralela.** Es un **facet** que se completa dentro del ciclo de vida (con su moneda — MXN tras TASK-990). Hoy `client_profiles` puede crearse por A4 (Finance) o A8 (`instantiateClientForParty`) con defaults distintos (A8 default CLP, 30d) → drift de términos.
- **Frontera Commercial↔Finance (boundary doc):** Commercial es dueño del party/lifecycle; Finance del `client_profiles`. El nacimiento debe respetar esa frontera: el origin comercial crea la identidad; Finance completa su facet. Pero hoy A4 (Finance) escribe `organization_type` —una columna de identidad comercial— porque es la única que puede. Eso es una fuga de boundary forzada por el gap.

### 4.3 Comercial (`commercial-expert`)

- **El nacimiento del cliente es el final del Bow-tie, no un INSERT.** Un cliente nace de un recorrido: prospect → opportunity → deal won → active_client. HubSpot ES el sistema de registro de ese recorrido (deals, cotizaciones, historia). El `lifecycle_stage` ya modela esto (TASK-535). El problema no es el modelo comercial — es que el "momento de materialización" (cuando el party se vuelve cliente operable) no dispara la completitud del 360.
- **`client_kind` (Active / Self-Serve / Project) NO está materializado.** La doctrina comercial lo define pero no existe como columna. El onboarding debería capturarlo (gobierna playbook, touchpoints, expectativa de NRR).
- **Origin + touchpoints son contrato comercial, no metadata.** "De dónde nació este cliente y qué recorrido tuvo" es información de primera clase (atribución, win-loss, expansión). Hoy se pierde: el `lifecycle_stage_source` existe pero el origin del objeto no se expone como timeline en el 360.

### 4.4 Information Architecture (`info-architecture`)

- **Dupes sin canónica (Lane B, regla dura):** la IA tiene "el mismo feature alcanzable por N caminos — elige el canónico". Hoy crear cliente es alcanzable por: drawer Finanzas, adopt Cotizador, sync HubSpot automático, admin accounts. **Ninguno es declarado canónico.** El usuario no sabe cuál usar → confusión = el reporte exacto del operador.
- **Falta el "you are here" del lifecycle (wayfinding 5):** no hay una superficie que diga "este cliente está en onboarding, paso 3 de 5, falta tax_id + space". El Account 360 con facets (TASK-611) es el **destino** correcto, pero no muestra el **estado de completitud del nacimiento**.
- **Mental model > schema:** el operador piensa "doy de alta un cliente" (un acto, un origen, un recorrido). El sistema lo obliga a pensar en schema (¿org? ¿client? ¿profile? ¿space? ¿en qué pantalla?). La IA debe colapsar eso a **una sola puerta** con el origin capturado.

### 4.5 Forms / Onboarding (`forms-ux`)

- **El nacimiento es un wizard, no un drawer de 1 paso.** >10 campos con grupos lógicos (identidad, comercial, finanzas, space) + algunos requieren lookup (HubSpot, RFC) → patrón wizard canónico (origen → identidad → comercial → finanzas → space → confirmar).
- **Smart prefill desde el origin:** si el origin es HubSpot, pre-llenar nombre/país/tax desde la company (mostrando qué se infirió, editable). Si es Nubox, desde la factura. **Nunca** inventar defaults (Berel quedó con `country='CL'` por un default ciego — anti-patrón forms-ux directo).
- **Una sola escritura canónica al confirmar:** el wizard NO debe tener N llamadas a N puertas. Debe componer **un solo comando** (el orquestador del lifecycle) que escribe la fila completa atómicamente.

---

## 5. Propuesta de solución (robusta + escalable)

**Principio rector:** *un cliente nace una sola vez, por una sola puerta, con un origin declarado, y su completitud es un lifecycle observable — no un conjunto de INSERTs dispersos.*

La solución NO es una spec nueva: es **activar y extender `GREENHOUSE_CLIENT_LIFECYCLE_V1.md`** (ya Aceptada) + cerrar los dos gaps estructurales que esa spec no cubre.

### 5.1 Helper de escritura canónico (SSOT de la fila `organizations`)

- Crear `upsertCanonicalOrganization(input, client?)` — **único** punto de escritura de la fila `organizations`, dueño del set completo de columnas (`organization_type`, `lifecycle_stage`, `tax_id`, `country`, `legal_name`, `hubspot_company_id`, origin).
- **Todas** las puertas existentes (A1-A8) se refactorizan para pasar por él. `createPartyFromHubSpotCompany`, `ensureOrganizationForClient`, `ensureOrganizationForSupplier` se vuelven **callers**, no escritores paralelos.
- **Reconciliar `organization_type` ↔ `lifecycle_stage`:** `organization_type` pasa a **derivarse** (o validarse) desde `lifecycle_stage` + relaciones (`active_client` ⇒ `client`; `provider_only` ⇒ `supplier`; dual ⇒ `both`). Agregar el CHECK constraint que falta. La puerta HubSpot deja de producir orgs `'other'` con lifecycle `active_client`.
- **Derivar `country`/`tax_id` del origin:** el sync HubSpot debe mapear el país de la company (MX, no default CL) y el tax_id cuando exista. Nunca defaults ciegos.

### 5.2 `client_lifecycle_case` como orquestador (activar la spec aceptada)

- Implementar el agregado `client_lifecycle_case` (`onboarding | offboarding | reactivation`) con checklist materializado, audit append-only y outbox v1 — exactamente como `GREENHOUSE_CLIENT_LIFECYCLE_V1` ya lo especifica (espejo de TASK-760 colaboradores).
- El **onboarding case** es la puerta canónica: declara origin + intención, llama al helper SSOT, valida pre-condiciones (tax_id, country, etc.), gobierna la transición a `active_client`, y materializa los facets pendientes (perfil financiero, space) como pasos del checklist.
- Captura **`origin`** (`hubspot_sync | nubox | manual | adopt | quote_converted`) y **`client_kind`** (Active/Self-Serve/Project) como campos de primera clase.

### 5.3 Una sola puerta de entrada (IA + forms)

- **UI canónica:** un wizard de onboarding de cliente (origen → identidad → comercial → finanzas → space → confirmar) que compone el onboarding case. Smart prefill desde el origin (HubSpot/Nubox), un solo commit atómico.
- Las puertas hoy dispersas se reordenan: el drawer de Finanzas pasa a **completar el facet financiero de un cliente que ya existe** (no a parir clientes); el adopt del Cotizador dispara el onboarding case con origin `adopt`; el sync HubSpot dispara un onboarding case en estado `pending_completion` en vez de dejar la org a medias.
- **Account 360 (facets) = destino**, con un **timeline de lifecycle/touchpoints** (origin, etapas, completitud) en la cabecera. "You are here" del nacimiento.

### 5.4 Detección (defense-in-depth — los signals que faltan)

Nuevos reliability signals (subsystem `Identity & Access` / `Commercial Health`, steady=0):

- `commercial.organization.type_lifecycle_drift` — orgs con `lifecycle_stage='active_client'` pero `organization_type='other'` (el drift exacto de Berel).
- `commercial.organization.incomplete_identity` — orgs con `hubspot_company_id` set pero `tax_id`/`legal_name` NULL.
- `commercial.client.active_without_profile` — `active_client` sin `client_profiles`.
- `commercial.client.active_without_space` — `active_client` sin `spaces`.

Hoy `rg organization_type src/lib/reliability/` = **cero matches**. El estado a medias es completamente invisible.

### 5.5 Roadmap por slices

1. **Slice 0** — Señales de drift (read-only, detectan el problema sin cambiar escritura). Backfill detector de orgs a medias (cuántas Bereles hay).
2. **Slice 1** — `upsertCanonicalOrganization` SSOT + CHECK constraint en `organization_type` + reconciliación con `lifecycle_stage`. Refactor de A1/A3/A4/A6 a callers. **Cero cambio de comportamiento observable** salvo que HubSpot ya completa type/country.
3. **Slice 2** — Implementar `client_lifecycle_case` (activar `GREENHOUSE_CLIENT_LIFECYCLE_V1`) como orquestador del onboarding.
4. **Slice 3** — Wizard único de onboarding (forms-ux) + reordenar las puertas; el drawer Finanzas pasa a "completar facet".
5. **Slice 4** — Timeline de lifecycle/touchpoints en el Account 360.
6. **Slice 5** — Remediar Berel por la puerta canónica (con TASK-990 para el facet financiero MXN) como caso de validación end-to-end.

---

## 6. 4-Pillar Score (de la propuesta)

### Safety

- **Qué puede salir mal:** un helper SSOT mal hecho rompe TODAS las puertas a la vez (blast radius alto). Mitigación: refactor incremental (Slice 1 mantiene comportamiento bit-for-bit salvo completar type/country), tests de no-regresión por puerta, expand-and-contract en el CHECK.
- **Gates:** capability dedicada para el onboarding case write; el CHECK constraint en `organization_type` como gate DB.
- **Riesgo residual:** el CHECK en una columna sin constraint previo puede rechazar filas legacy inconsistentes → requiere backfill+VALIDATE en dos pasos (NOT VALID → remediar → VALIDATE).

### Robustness

- **Idempotencia:** `upsertCanonicalOrganization` upsert por `hubspot_company_id`/`organization_id`/`tax_id`; el onboarding case idempotente por org.
- **Atomicidad:** el wizard compone UN comando transaccional (org + profile + space + outbox en una tx) — elimina los estados parciales.
- **Cobertura de constraint:** el CHECK que falta + la derivación `type`↔`lifecycle` cierran el drift estructural.

### Resilience

- **Señales de drift** (5.4) detectan cualquier org a medias en steady=0.
- **Audit append-only** del onboarding case = reconstrucción forense del nacimiento.
- **Recuperación:** las orgs ya a medias (Berel y las que el detector encuentre) se remedian por la puerta canónica, no por SQL manual.

### Scalability

- **Hot path:** el nacimiento es baja frecuencia (clientes nuevos), no es un hot path. Escala trivialmente.
- **A 10x clientes / N países:** el origin + lifecycle + facets escalan sin rediseño; agregar MXN/COP/PEN es decisión de dominio (alineado con TASK-990 multi-currency), no rework.
- **Tradeoff nombrado:** un helper SSOT + orquestador añade indirección vs los INSERTs directos de hoy. Se acepta: la integridad del 360 y la eliminación del trabajo manual del operador valen la indirección.

---

## 7. Reglas duras (post-implementación)

- **NUNCA** escribir la fila `greenhouse_core.organizations` fuera de `upsertCanonicalOrganization`. Las puertas son callers.
- **NUNCA** dejar nacer una org con `lifecycle_stage='active_client'` y `organization_type='other'`. El helper los reconcilia; el signal lo detecta.
- **NUNCA** setear `country`/`tax_id` con defaults ciegos. Derivar del origin o dejar explícitamente pendiente (gate del onboarding case).
- **NUNCA** crear `client_profiles` por una puerta paralela con defaults distintos. El perfil es un facet completado dentro del lifecycle.
- **NUNCA** parir un cliente desde el drawer de Finanzas. El drawer completa el facet financiero de un cliente existente.
- **SIEMPRE** capturar `origin` + `client_kind` en el nacimiento.
- **SIEMPRE** que emerja una puerta nueva (otro sync, otro adopt), debe pasar por el helper SSOT + disparar el onboarding case.

---

## 8. Open questions (decisión humana)

1. **¿`organization_type` se deriva de `lifecycle_stage`+relaciones, o se mantiene como columna gobernada con el CHECK?** (recomendación: derivar/validar, no hand-set). — decisión de gobernanza arquitectónica.
2. **¿`client_kind` (Active/Self-Serve/Project) se materializa ahora o se difiere?** Impacta playbook comercial + NRR tracking.
3. **¿El wizard único reemplaza el drawer de Finanzas, o coexisten con roles redefinidos?** (recomendación: coexisten — wizard pare, drawer completa facet).
4. **¿Berel se remedia ahora (manual, por la puerta canónica futura aún no construida) o se espera a Slice 5 + TASK-990?** (recomendación: esperar para que sea el caso de validación end-to-end; entretanto NO crear a Berel por el drawer, que reproduciría el problema).

---

## 9. Recomendación de cierre

1. Aceptar esta auditoría como base.
2. La solución se implementa partida en **dos tasks** (EPIC-CLIENT-360), por dependencia real con TASK-990:
   - **TASK-991 — Canonical Organization Write SSOT + Birth Completeness** (FOUNDATION, prerequisito): helper SSOT `upsertCanonicalOrganization` + reconciliación `organization_type↔lifecycle_stage` + derivación country/tax + 4 signals + remediación de la **identidad** de Berel. **Va PRIMERO** — destraba el RFC match de TASK-990.
   - **TASK-992 — Client Lifecycle Orchestrator + Single Front Door** (depende de 991): activa `client_lifecycle_case` (onboarding, per `GREENHOUSE_CLIENT_LIFECYCLE_V1` Aceptada-no-implementada) + puerta única (wizard) + timeline Account 360. **Va ÚLTIMO** — no bloquea el outcome de Berel.
3. **Secuencia canónica: `991 → 990 → 992`.** TASK-990 puede arrancar su maquinaria de moneda en paralelo; solo su proyección de income de Berel espera a que 991 remedie la identidad de la org. El outcome de negocio de Berel (AR en MXN) se cierra con **991 + 990**; 992 es el arreglo sistémico durable.
4. **NO** crear a Berel por el drawer de Finanzas mientras tanto — reproduciría el estado a medias. La identidad de Berel se remedia en TASK-991 (por el helper canónico) y su facet financiero MXN en TASK-990.

> Patrón fuente para la implementación: TASK-760 (offboarding de colaboradores — `work_relationship_offboarding_cases`, battle-tested) espejado al dominio comercial, exactamente como `GREENHOUSE_CLIENT_LIFECYCLE_V1` ya lo prescribe.
