# TASK-1352 — Reposicionar la landing HubSpot (`/servicios-contratar-hubspot/`): **evidencia antes que promesa**

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `motion`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1352-landing-hubspot-agentic-platform.md`
- Flow: `docs/ui/flows/TASK-1352-landing-hubspot-agentic-platform-flow.md`
- Motion: `docs/ui/motion/TASK-1352-landing-hubspot-agentic-platform-motion.md`
- Backend impact: `none`
- Epic: `EPIC-019`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `public-site`
- Blocked by: `none`
- Branch: `task/TASK-1352-landing-hubspot-agentic-platform`

> **Reescrita desde cero el 2026-07-13.** La versión anterior derivaba de la tesis v1 de PDR-006
> (*"el diferenciador es Kortex — RevOps programático"*), **que no se sostiene**. No es un delta: es
> una task nueva sobre la misma URL. Fuente:
> **[PDR-006 reescrito](../../public-site/decisions/PDR-006-landing-hubspot-agentic-platform-posicionamiento.md)**.

## Summary

Reposiciona **in-place** (misma URL, sin 301) la página `/servicios-contratar-hubspot/` (WordPress id
`244079`, `publish`) bajo la idea única **"evidencia antes que promesa"**: *te quitamos el riesgo antes de que
compres*. Vende **la plataforma HubSpot completa** (Smart CRM + los 6 Hubs + Breeze) y su operación (las 4
capas de CRM Solutions), entrando por **el mapa dolor → Hub** (siete dolores, siete perfiles). Los cuatro
activos que sostienen la tesis: **el waiver del onboarding** (le borras USD 3.000 del contrato), **los dos
graders** (diagnóstico gratis), **la descalificación honesta** (los límites de HubSpot por escrito) y
**Kortex** (versionado, trazable, reversible — **mecanismo, nunca escala**). Reusa `<greenhouse-form>` +
HubSpot Meetings; **no construye backend nuevo**.

## Why This Task Exists

**Tres razones, todas verificadas el 2026-07-13.**

**1. La página viva afirma cosas falsas.** Auditoría desde la fuente (REST autenticado + Playwright):
dice *"Líder en CRM según Gartner"* — cuando HubSpot es **Niche Player** en el MQ de *Sales Force Automation*
(Leaders: Salesforce, Microsoft, Oracle) — y afirma **ISO 27001** de HubSpot, que **HubSpot no reclama para sí**
(solo su infra AWS). Un CIO verifica lo primero en dos minutos; un equipo de seguridad pide el certificado del
segundo. **En los dos casos el que queda desacreditado es Efeonce.** Además tiene un botón *"Más testimonios"*
que apunta a **`themeforest.net`** (leftover del tema Ohio), describe Hubs con nombres **retirados**
("Commerce Hub", "Operations Hub") y sus dos testimonios son de **branding**, no de CRM → **cero prueba social
de CRM en una landing de CRM**.

**2. La tesis anterior no se sostiene.** PDR-006 v1 apostaba la página a *"Kortex — lo único que la región no
replica"*. **Kortex opera un cliente en producción (ANAM).** Es un piloto, no un moat. Y **pelea contra JOLT**,
que la propia página adopta: *"te operamos con nuestro software propietario"* **añade** miedo al lock-in justo
cuando el objetivo es quitarlo.

**3. Falta la oferta más fuerte del canal.** Efeonce **está certificada** → puede entregar el onboarding
**en lugar de HubSpot** y **el cargo obligatorio desaparece del contrato del cliente** (USD 3.000 en Marketing
Hub Pro = **31% del año 1**). **El HubSpot directo no puede igualarlo.** Hoy la página dice, vagamente,
*"descuentos preferentes como partners"*.

## Goal

- Reescribir la página con las **13 regiones** del wireframe, bajo la postura *"antes de venderte HubSpot, te
  mostramos si te sirve"*, **preservando URL y canonical** (reposición in-place).
- 🔴 **Vender la plataforma completa.** La región firma es **el mapa dolor → Hub** (7 dolores → 7 respuestas).
  **NUNCA estrechar la página a un Hub** — una página que orbita AEO es una landing de AEO con logo de HubSpot.
- **Ser citable por motores de respuesta**: answer capsules + JSON-LD, y 🔴 **toda cifra citable en el HTML
  servido** (los contadores JS renderizan `00 %` y los crawlers de IA no ejecutan JavaScript).
- Entregar a la **oferta de dos escalones** (reunión + diagnóstico) **reusando contratos gobernados**.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

**Normativos:**

- 🔴 **[PDR-006 reescrito](../../public-site/decisions/PDR-006-landing-hubspot-agentic-platform-posicionamiento.md)** — la tesis. **Leerlo entero antes de escribir una línea de copy.**
- **Skill `hubspot-solutions-partner`** — el dominio. Cargar: `SOURCES.md` (§ *Datos que NO se citan*),
  `modules/01_PRODUCTO_2026.md` (Hubs, Breeze, límites), `modules/10_DISCOVERY_SCOPING.md` (descalificación),
  `modules/11_PROPUESTA_PRICING.md` § 2 (el waiver), `efeonce/ESTADO_ACTUAL.md` (tier y cartera reales).
- [PDR-003](../../public-site/decisions/PDR-003-layering-ecosistema-digital-efeonce.md) · [PDR-007](../../public-site/decisions/PDR-007-hubspot-portal-grader-lead-magnet.md) · `docs/context/02_gtm.md` (4 capas) · `docs/context/05_voz-tono-estilo.md`
- Skill `efeonce-public-site-wordpress` → `references/landings/hubspot-services.md` (identidad + rollback)

## 🔴 Reglas duras

**Contenido**

1. **Vende la plataforma completa** (Smart CRM + 6 Hubs + Breeze). **NUNCA se estrecha a un Hub.**
2. **Ningún claim que HubSpot no haga.** ❌ *"Líder en CRM según Gartner"* · ❌ Forrester Wave (no verificable
   2026) · ❌ **ISO 27001** de HubSpot · ❌ residencia de datos en LATAM · ❌ *"flota de agentes de IA"*
   (**solo 3 Breeze Agents en GA**). ✅ **"Leader en B2B Marketing Automation (Gartner, 5.º año)"** ·
   **SOC 2 Type II + SOC 3**. Fuente: `hubspot-solutions-partner/SOURCES.md` § *Datos que NO se citan*.
3. **"HubSpot Solutions Partner Gold"** ✅ **es cierto y se puede afirmar** (portal Partner).
   🔴 **Condición dura:** el Gold está acreditado **hasta el 2027-01-15** y hoy Efeonce está **bajo el umbral
   de puntos totales**. **Revisar el claim en la revisión de tier del 2027-01-15; si baja de tier, el badge
   sale de la página ese día** (riesgo de compliance del programa). **Dejar el recordatorio en el landing file.**
4. **Kortex: describir el mecanismo, NUNCA implicar escala** (n=1). Prohibido *"lo único que la región no
   replica"* o cualquier formulación que sugiera una flota. ✅ Sí: *"Kortex, nuestra app, está publicada en el
   HubSpot Marketplace"*.
5. **Nomenclatura 2026:** **Revenue Hub** (ex-Commerce) · **Data Hub** (ex-Operations) · **UNBOUND** (ex-INBOUND).
6. **No hardcodear** roster ni pricing de Breeze (volátiles; pay-per-result desde abr-2026).
   **Reverificar toda cifra de HubSpot (WebSearch) el día de publicación.**
7. **Casos:** regla positiva — **métrica verificable + relación vigente o cerrada en buenos términos +
   autorización**. Si falta una → **anonimizado o no se usa**. 🔴 **SSilva: solo anonimizado**
   ("una inmobiliaria del Cono Sur"); **nunca con nombre ni testimonio firmado**. **Berel NO como prueba de
   co-selling** (cierre directo, sin PDM).
8. 🔴 **Toda cifra citable va en el HTML servido**, no en un contador JS.

**Build**

- Ohio nativo (`template default`, header claro heredado), CSS page-scoped. **NO** `elementor_canvas`, sin
  overrides de header/wrapper. Mutación vía `Document::save()` (**nunca** `_elementor_data` directo).
  Snapshot + Kinsta purge + rollback documentado.
- **Full API Parity por reuso:** la landing es **cliente**. **NO** reconstruir el form ni el agendador.
- **Lidera la masterbrand Efeonce.** Kortex/Greenhouse/Verk = el software que sostiene el servicio.
- **es-LATAM neutro**, tuteo, sin voseo ni chilenismos. `hreflang`-ready (variante `en-US` futura).

## Dependencies & Impact

**Depende de:** `<greenhouse-form>` renderer (TASK-1320/1327) · HubSpot Meetings link + UTM `[verificar]` ·
🔴 **CORS/surface-allowlist del form para `efeoncepro.com/servicios-contratar-hubspot/*`** — `[verificar]`
**probable gap** (TASK-1335 cubrió `/servicios/*`; esta URL es sibling top-level) · URL del listing de
**Kortex en el HubSpot Marketplace** `[verificar]` · **casos de CRM citables** `[hoy: cero]`.

**Impacta a:** refuerza el canal co-sell (PDM) · sostiene la jugada B2B2B (Kortex Marketplace) · habilita el
pillar de categoría CRM en Think (EPIC-020).

**Files owned:** esta task · wireframe · flow · motion · contenido de la página `244079` · scenario GVC ·
fila del landing registry + `references/landings/hubspot-services.md`.

## Current Repo State

**Ya existe:** PDR-006 reescrito · skill `hubspot-solutions-partner` (dominio verificado) · la página `244079`
con su Partner Proof Module · Growth Forms renderer + patrón de embed · landings hermanas como referencia de
patrón · data Semrush pan-hispana.

**Gap:** el copy entero (13 regiones) sin draftear · **el mapa dolor→Hub (R3) sin construir** · **las regiones
de límites (R5) y waiver (R6) no existen** · JSON-LD sin confirmar · form instance
`efeonce-hubspot-portal-audit` sin crear · CORS sin confirmar · **cero casos de CRM citables**.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Discovery, snapshot y verificación de hechos

- **Snapshot** de `244079` (`_elementor_data`, settings, metas Ohio, `_thumbnail_id`, hashes) + **before-capture**.
  Documentar rollback (`references/landings/hubspot-services.md`).
- 🔴 **Auditar TODOS los `href`** de la página buscando leftovers del template.
  *(Confirmado: "Más testimonios" → `themeforest.net/user/colabrio/reviews`.)*
- 🔴 **Reverificar (WebSearch) el día de publicación:** el **onboarding fee** de cada Hub · el estado de
  **Breeze** (roster/pricing) · el estado del **tier Gold**.
- Confirmar: link canónico de **HubSpot Meetings** + UTM · **CORS** del form para este origin (si falta →
  fallback link como primer release) · URL del **listing de Kortex** en el Marketplace.
- **Conseguir al menos un caso de CRM citable** — o aprobar cifras ilustrativas del modelo, declaradas.
  *(Hoy hay cero. Ver §Follow-ups: el QBR con ANAM lo produce.)*
- Poblar el **FAQ** con objeciones reales (migración · gobierno de agentes · tier · onboarding · tiempos ·
  integraciones · **"¿y si me quiero ir?"**).

### Slice 2 — Copy final (`greenhouse-ux-writing`)

- Draftear el copy ledger completo (13 regiones) validado con `greenhouse-ux-writing` + context pack 05.
- 🔴 **Sujeto a las 8 reglas duras.** El copy de R3 (el mapa) usa **el dolor en el lenguaje del comprador**,
  nunca el nombre del Hub como encabezado.

### Slice 3 — Build / reposición

- Reescribir las 13 regiones en Ohio nativo vía `Document::save()`, evolucionando el Partner Proof Module.
- 🎯 **Construir el mapa dolor→Hub (R3)** — page-scoped, **progressive enhancement**: **sin JS se ve la lista
  completa de los 7 dolores + su Hub**.
- Construir las regiones **límites (R5)** y **waiver (R6)** — texto servido, sin contadores JS.
- On-page AEO: answer capsules bajo cada H2 · internal links (AEO ↔ HubSpot bidireccional, SEO, Agencia
  Creativa, desarrollo, pillar CRM en Think) · markers `data-capture` · canonical preservado.

### Slice 4 — Form de diagnóstico + structured data

- Form instance `efeonce-hubspot-portal-audit` (config del contrato existente) + surface WordPress + Turnstile;
  HubSpot delivery `disabled` hasta cutover.
- JSON-LD `Service` + `Organization` + `FAQPage` + `BreadcrumbList`.

### Slice 5 — Verificación visual + registro

- Scenario GVC + capturas desktop/mobile/reduced-motion + **el mapa en 2+ estados** + **before/after**.
- 🔴 **Assertions de citabilidad sin JS** y **de claims prohibidos** (ver wireframe).
- Actualizar landing registry + landing file + route-ownership matrix. CWV. Purge Kinsta.

## Out of Scope

- Pillar de categoría CRM en Think (EPIC-020) · cutover de HubSpot delivery del form · definición operativa del
  Portal Grader (EPIC-024) · cambios al motor de Growth Forms o al agendador · variante `en-US` ·
  **el arreglo del listing del Solutions Directory** (va al plan de rescate de la práctica).

## Rollout Plan & Risk Matrix

Reposición de contenido de una página `publish` (misma URL), sin runtime nuevo. Riesgo bajo-medio.

### Slice ordering hard rule

Slice 1 (snapshot + verificación de hechos) → 2 (copy) → 3 (build) → 4 (form + schema) → 5 (GVC + registro).
🔴 **NO mutar `244079` sin snapshot + before-capture.** **NO publicar cifras de HubSpot sin reverificarlas el
día de publicación.** **NO publicar sin confirmar el CORS del form** (si falta → fallback link).

### Risk matrix

| Riesgo | Prob. | Mitigación | Señal |
|---|---|---|---|
| **Heredar un claim falso** de la página vieja (ISO 27001, Gartner) | **alta** | Regla dura 2 + **GVC assertion de claims prohibidos** en el DOM | `grep` del DOM falla |
| **La página se estrecha a AEO/Marketing** y pierde 6 de 7 compradores | **media** | Regla dura 1 + el mapa (R3) como región firma + AC explícita | Review humano |
| **Kortex implica escala** (n=1) | media | Regla dura 4; copy revisado | Review humano / feedback PDM |
| **El badge Gold se vuelve falso** en enero 2027 | media | Recordatorio en el landing file + revisión el 2027-01-15 | Portal Partner |
| Cifras de Breeze / onboarding **stale** | media | Reverificar el día de publicación (Slice 1 + Slice 5) | Contradice a HubSpot |
| **CORS** bloquea el embed del form | media | Verificar en Slice 1; fallback link | Consola CORS |
| Mutar una página `publish` rompe layout/canonical/equity | media | Snapshot + before/after + rollback WP revision | GSC / GVC |
| **Cero casos de CRM citables** | **alta** | Slice 1: conseguir uno o declarar cifras ilustrativas | Bloquea Slice 2 |

### Rollback

| Slice | Rollback | Tiempo |
|---|---|---|
| 1-2 | N/A (discovery / copy en borrador) | — |
| 3 | Restaurar la WP revision previa de `244079` + purge Kinsta | <10 min |
| 4 | Despublicar form surface + quitar JSON-LD | <10 min |
| 5 | Revertir registry / landing file / matrix | <5 min |

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La página queda reposicionada bajo **"evidencia antes que promesa"**, misma URL, canonical intacto.
- [ ] El `<h1>` es **la postura** (*"antes de venderte HubSpot, te mostramos si te sirve"*), no un claim de
      features ni "somos partner".
- [ ] 🔴 **Vende la plataforma completa:** el **mapa dolor → Hub (R3)** cubre los **7 dolores** y **no orbita AEO**.
- [ ] 🔴 **Ningún claim prohibido en el DOM** (verificado por GVC assertion): `ISO 27001` · `Forrester` ·
      `Líder en CRM` · `Commerce Hub` · `Operations Hub` · `INBOUND` · "flota de agentes".
      ✅ Sí *"Leader en B2B Marketing Automation (Gartner, 5.º año)"*.
- [ ] **Existe la región de límites (R5)** ("cuándo HubSpot NO es para ti") con los límites documentados.
- [ ] 🎯 **Existe la región del waiver (R6)** con la cifra (USD 3.000 ≈ 31% del año 1), **reverificada**.
- [ ] 🔴 **Kortex describe el mecanismo y NO implica escala.**
- [ ] **"Solutions Partner Gold"** afirmado + **recordatorio de revisión 2027-01-15** en el landing file.
- [ ] 🔴 **Citabilidad sin JS:** un `fetch` sin JavaScript devuelve **el mapa, el waiver y los límites** en el
      HTML servido.
- [ ] **Sin leftovers del template** (`themeforest.net` u otro `href` foráneo).
- [ ] Casos: métrica verificable + relación en buenos términos + autorización. **SSilva solo anonimizado.**
      Berel no como co-sell.
- [ ] Cada H2 tiene answer capsule (40-60 palabras). JSON-LD válido (Rich Results Test).
- [ ] CTA dual funciona con **fallback honesto**. **NO** se reconstruyó el form ni el agendador.
- [ ] Copy es-LATAM neutro, sin voseo, validado con `greenhouse-ux-writing`.
- [ ] GVC 1440 + 390 + reduced-motion + **before/after** capturado **y mirado**. Sin scroll horizontal.
- [ ] `UI ready: yes` solo si `pnpm task:lint --task TASK-1352` queda sin findings.
- [ ] Landing registry + landing file + route-ownership matrix actualizados.

## Verification

`pnpm task:lint --task TASK-1352` · `pnpm ops:lint --changed` ·
`pnpm ui:wireframe-check|flow-check|motion-check --task TASK-1352` ·
Playwright/GVC live (1440 + 390; **assertion sin-JS**; **assertion de claims prohibidos**) ·
Growth Form API smoke · HTTP 200 + canonical preservado.

## Closing Protocol

- [ ] `Lifecycle` sincronizado con la carpeta · `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] Chequeo de impacto cruzado (pillar CRM en Think, landings hermanas, PDR-007/EPIC-024)
- [ ] Página registrada en route-ownership matrix + landing registry + landing file

## Follow-ups

- 🎯 **QBR con ANAM** — produce el **caso de CRM citable** que hoy no existe *(y reinicia los puntos managed,
  abre el cross-sell y convierte a Kortex de promesa en caso demostrable)*.
  → `.claude/skills/hubspot-solutions-partner/efeonce/PLAN_RESCATE_6M.md`.
- **Arreglar el listing del Solutions Directory** (0 reviews, solo español, "Any Budget", 28 servicios).
  En un mercado sin búsqueda de categoría, **ese listing ES el canal**.
- **Repricear el retainer de AEO** — de *"medimos"* a *"movemos"*. HubSpot acaba de hacer la medición gratis
  dentro de Marketing Hub (**riesgo de canibalización**, PDR-006 §5).
- Pillar de categoría CRM en Think (EPIC-020) · cutover del form · variante `en-US`.

## Open Questions

- ¿Link canónico de HubSpot Meetings + UTM?
- ¿URL pública del listing de **Kortex en el HubSpot Marketplace**?
- ¿El CORS del `<greenhouse-form>` cubre `/servicios-contratar-hubspot/*` o hay que agregar el origin?
- 🔴 **¿Qué caso de CRM/HubSpot citable tenemos?** *(Hoy: cero. Si no hay, ¿se aprueban cifras ilustrativas
  del modelo, declaradas?)*
