# RESEARCH-005 — CPQ Gap Analysis & Hardening Plan

> **Tipo de documento:** Research brief (auditoria + roadmap)
> **Version:** 1.4
> **Creado:** 2026-04-24 por Julio + Claude
> **Status:** Active
> **Alcance:** Modulo Cotizaciones + Product Catalog + HubSpot Sync

**Actualizaciones:**

- v1.1 (2026-04-24): incorpora business context confirmado (renewal via service catalog, SaaS bundles, footprint LATAM) + hallazgo del service catalog como proto-bundle engine
- v1.2 (2026-04-24): incorpora PDF enterprise spec + product descriptions rich HTML + DocuSign integration + renewal periodicity variable confirmada + conceptos explicados (constraint rules DSL, nesting, co-term, amendment)
- v1.3 (2026-04-24): cierra las 7 decisiones operativas pendientes con racional robustez + escalabilidad documentado; refina alcance de TASK-619/620/624/626/629/630 con los acuerdos cerrados
- v1.4 (2026-04-24): decision PDF — single template con secciones condicionales (no multi-template explicito); refina TASK-629 con el contrato de secciones (always vs conditional) + reglas de activacion

**Documentacion tecnica relacionada:**

- [GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md](../architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md)
- [GREENHOUSE_PRODUCT_CATALOG_FULL_FIDELITY_V1.md](../architecture/GREENHOUSE_PRODUCT_CATALOG_FULL_FIDELITY_V1.md)
- [catalogo-productos-fullsync.md](../documentation/admin-center/catalogo-productos-fullsync.md)
- [cotizaciones-gobernanza.md](../documentation/finance/cotizaciones-gobernanza.md)

## Proposito

Auditoria end-to-end del pipeline Cotizaciones → Product Catalog → HubSpot Sync, contrastada contra el canon CPQ del mercado (Salesforce CPQ, HubSpot CPQ, Oracle CPQ, Conga, DealHub, PROS, Zuora). Produce un roadmap priorizado por impacto para cerrar gaps de robustez primero, luego gaps funcionales.

Esta investigacion surge del cierre del programa TASK-587 (Product Catalog Full-Fidelity HubSpot Sync) el 2026-04-24. Tras ejecutar el backfill + verificar 74 productos en HubSpot portal 48713323, se identificaron gaps residuales de varios tipos: algunos de datos (materializer), otros de arquitectura (race conditions), otros funcionales (bundles, eSignature).

## Metodo de la auditoria

1. **Mapeo exhaustivo** del codigo con agente Explore — inventario de 23 API routes quote + 4 handlers materializer + 9 rutas middleware Python + 5 projections reactivas.
2. **Muestreo live** contra portal HubSpot (48713323): `GET /crm/v3/properties/products/*` para validar opciones reales y `GET /crm/v3/objects/products?limit=100` para agregados post-backfill.
3. **Mapeo contra CPQ canonico** — 7 dimensiones (Product Catalog, Quote Config, Pricing, Document, CRM, Quote-to-Cash, Analytics).
4. **Clasificacion de hallazgos** en 3 categorias: **robustez** (data consistency), **funcional** (features vs mercado), **cosmeticos** (deuda tecnica sin impacto de negocio).

## Delta 2026-04-24 (v1.1) — Business Context Confirmado

Post-revision del service catalog con el owner del producto, se confirman 4 inputs que **cambian la priorizacion del plan**:

1. **Service Catalog es el vehiculo para bundles** — no se va a replicar Salesforce CPQ ni construir un motor de bundle desde cero. La tabla `greenhouse_commercial.service_modules` + `service_role_recipe` + `service_tool_recipe` ya es un **proto-bundle engine** (composite products: un service SKU contiene roles + tools con quantity + optional flag + pass-through flag). `expandServiceIntoQuoteLines()` ya expande servicios a multiples quote lines via `pricing-engine-v2`.
2. **Renewal es un must-have** con base actual ya funcional: `service_modules.default_duration_months` + `commercial_model='on_going'` ya persisten el concepto. Falta el schedule engine + co-term + amendment.
3. **SaaS bundles entran en roadmap** — requiere motor `pricingModel=volume|graduated` (hoy engine es `flat` only) + licencias con periodos recurrentes formales.
4. **LATAM multi-pais confirmado** — FX ya multi-moneda (6 codigos: CLP, USD, CLF, COP, MXN, PEN). Tax engine multi-pais sube en prioridad (hoy solo IVA Chile).

### Hallazgo — Service Catalog como proto-bundle

Revision de `src/lib/commercial/service-catalog-{store,expand,constraints}.ts`:

| Capability bundle CPQ | Estado service catalog | Gap |
|---|---|---|
| Parent container (bundle SKU) | ✅ `service_modules.service_sku` | — |
| Child components | ✅ `service_role_recipe` + `service_tool_recipe` | — |
| Quantity per component | ✅ `hours_per_period` + `quantity` | — |
| Optional flag | ✅ `is_optional` | — |
| Override at quote time | ✅ `ServiceLineOverride` en `expandServiceIntoQuoteLines()` (excluded, qty, hours) | — |
| Commercial model recurring | ✅ `commercial_model: on_going \| on_demand \| hybrid \| license_consulting` | — |
| Tier (1-4) | ✅ `tier` column | — |
| Duration | ✅ `default_duration_months` | — |
| Pass-through (reventa) | ✅ `pass_through` en tool recipe | — |
| Business line | ✅ `business_line_code` | — |
| **Nesting (bundle dentro de bundle)** | ❌ | Gap — service no referencia otro service |
| **Constraint rules entre components** | ❌ | Gap — no hay "si rol X, tool Y requerido" |
| **Bundle-level discount** | ⚠️ Hoy se aplica via `globalDiscount`, no por-bundle | Gap menor |
| **Sync a HubSpot como bundle** | ❌ `hubspot_bundle_type='none'` hardcoded | Gap — HS si soporta bundles |
| **Renewal schedule engine** | ❌ | Gap — `default_duration_months` persiste pero no hay cron/event que genere renewal quote |
| **Amendment / co-term** | ❌ | Gap |

**Conclusion:** no se construye "bundles desde cero"; se **extiende service_catalog** con: nesting, constraint rules, HubSpot bundle sync, renewal engine, amendment. Reduce esfuerzo 60-70% vs disenar desde cero y aprovecha tests existentes (`service-catalog-constraints.test.ts`, `service-catalog-expand.test.ts`).

### Confirmacion de decisiones abiertas

| Decision | Resolucion | Racional |
|---|---|---|
| Bundle model | **Extender service_catalog** (NO replicar Salesforce) | Proto-bundle ya existe; 70% del camino hecho |
| Renewal trigger | **Event-based + cliente-driven combinado** | Cron por `default_duration_months` expira + boton opcional en portal para adelantar |
| Tax engine | **Extender Chile IVA incrementalmente** a otros paises LATAM (Colombia IVA, Mexico IVA, Peru IGV) antes de Avalara | Cada pais LATAM tiene su enum tributario; Avalara solo cuando escales fuera de LATAM |
| Analytics stack | **In-portal Next.js + BQ** | Dashboards nativos aprovechan permisos del portal; sin overhead Metabase |
| eSignature | **DocuSign only en Fase 1** | Mayor cobertura LATAM; Adobe Sign si cliente enterprise lo pide |

Con estas decisiones cerradas, el plan pasa de "hipotetico" a "accionable" — las tasks P0/P1 arrancan sin blockers.

## Delta 2026-04-24 (v1.2) — PDF enterprise + product descriptions + DocuSign + conceptos

### a) Renewal periodicity confirmada

El campo `service_modules.default_duration_months` hoy persiste un integer. Se confirma que el rango operacional es **variable, con mínimo mensual**: mensual, bimensual, trimestral, semestral, anual. El engine debe soportar cualquier entero de meses (no solo los 5 tipicos — algunos retainers pueden ser de 4 o 9 meses).

**Modelado:** el campo actual ya soporta cualquier entero. No requiere cambio de schema. Lo que falta es:

- Una tabla de **periodicidades canonicas** con labels humanos (`mensual`, `bimensual`, `trimestral`, `semestral`, `anual`) que se muestre en UI como preset, con opcion "Personalizado" para valores arbitrarios.
- El renewal engine (TASK-624) usa directamente `default_duration_months` para calcular `next_renewal_date = start_date + INTERVAL N MONTH` sin asumir que la periodicidad es una de las 5 tipicas.

### b) Product descriptions rich HTML — estado actual vs gap

HubSpot ya soporta 2 fields nativos: `description` (text plain) + `hs_rich_text_description` (HTML). Mapping del estado real:

| Layer | `description` plain | `description_rich_html` | Status |
|---|---|---|---|
| HubSpot portal 48713323 | ✅ field existe | ✅ field existe | — |
| Greenhouse `product_catalog` schema | ✅ columna `description TEXT` | ✅ columna `description_rich_html TEXT` (TASK-603) | — |
| Adapter outbound GH→HS | ✅ emite `description` | ✅ emite sanitized HTML via `sanitizeProductDescriptionHtml` | — |
| Adapter inbound HS→GH (v2 rehydration) | ✅ | ✅ first-sync only | TASK-604 |
| Backfill 2026-04-24 | ✅ presente en los 74 products que tengan valor | ⚠️ presente pero la mayoria no tiene rich HTML cargado (operator no lo editó aún) | Populacion progresiva via admin UI |
| **Quote PDF rendering** | ⚠️ Linea del quote tiene su propio `description` operator-set, **no lee el del product_catalog** | ❌ **NO se renderiza en PDF** | **Gap del PDF, no de los datos** |
| Admin UI editor rich text | ⚠️ A validar — existe el campo pero hay que confirmar si el detail view usa un editor WYSIWYG (TipTap/Slate) o solo textarea | ⚠️ Mismo | Gap menor |

**Conclusion:** el contrato end-to-end funciona. El gap es que el **PDF no linkea line_item → product_id → product.description_rich_html** para enriquecer la linea con la descripcion canonica del catalogo. Fix trivial en `render-quotation-pdf.ts`.

### c) PDF enterprise — spec de rediseno

El PDF actual ([src/lib/finance/pdf/quotation-pdf-document.tsx](../../src/lib/finance/pdf/quotation-pdf-document.tsx)) es funcional pero no-enterprise. Principales problemas:

1. "Efeonce" es texto plano en Helvetica, no el logo real
2. Color primary `#0375DB` no es el canon (canon Efeonce: `#023c70` azul marino, con `#0375db` como accent)
3. Direccion del cliente aparece siempre `—`
4. No hay datos del emisor (RUT 77.357.182-1, direccion legal)
5. Sin pagina de portada ni sub-brand identification (Globe/Wave/Reach)
6. Footer minimal sin paginacion (N/M)
7. Sin signature block ni QR de verificacion online
8. Sin executive summary ni investment timeline
9. `product_catalog.description_rich_html` no se renderiza en el PDF
10. Bundles no visualmente agrupados (todas las lineas mezcladas)

**Spec PDF enterprise propuesta:**

```text
Pagina 1 — Cover
├─ Logo real (public/branding/logo-full.png, ~150x40px via <Image>)
├─ Sub-brand badge (isotipo globe/wave/reach segun business_line_code)
├─ Titulo: "Propuesta Comercial"
├─ Quote ID + version + fecha emision
├─ "Preparada para:" [Client name + organization]
├─ "Preparada por:" [sales rep name + email + phone]
├─ "Valida hasta:" [fecha]
└─ Footer cover: datos legales emisor

Pagina 2 — Executive Summary
├─ TL;DR: "Inversion total [TOTAL] [MONEDA]"
├─ "Duracion estimada: [duration_months] meses"
├─ "Modelo: [commercial_model label]"
├─ "Equipo asignado: [N roles seniors, N analysts]"
└─ Descripcion ejecutiva (< 400 palabras — desde quote.description)

Pagina 3+ — Scope of Work
├─ Para cada line item / bundle:
│   ├─ Nombre del producto/servicio
│   ├─ Rich HTML description del product_catalog (NEW — hoy no se renderiza)
│   ├─ Quantity + unit + recurrencia
│   └─ Componentes si es bundle (roles/tools listados con indent)
└─ Bundles visualmente agrupados con linea lateral accent color

Pagina N-2 — Commercial Proposal (tabla detalle)
├─ Tabla pricing idéntica a hoy + mejoras:
│   ├─ Agrupacion visual por bundle (subtotales)
│   ├─ Line-level IVA si aplica (hoy solo total)
│   └─ Alternate row background con surface color
└─ Pricing summary sidebar: Neto / IVA / Total

Pagina N-1 — Investment Timeline + Payment Terms
├─ Milestones visualizados en timeline horizontal
├─ "Mes 1: [amount]"
├─ "Mes 2-12: [amount recurrente]"
└─ Metodos de pago aceptados

Pagina N — Terms & Conditions + Signatures
├─ Terms block (existente, mejor formato)
├─ Signature block:
│   ├─ "Firma cliente" + area + "Nombre, cargo, fecha"
│   ├─ "Firma Efeonce Group" + area + "Nombre, cargo, fecha"
│   └─ QR code → link a version online verificable
└─ FX footer (existente)

Footer fijo todas las paginas
├─ "Efeonce Group SpA · RUT 77.357.182-1 · Santiago, Chile"
├─ "Propuesta [QUOTE-NUMBER] v[N] · Pagina N de M"
└─ "Confidencial · No distribuir sin autorizacion"
```

**Brand assets ya disponibles en el repo** (inventario via Explore agent):

- `public/branding/logo-full.png` — logo completo para PDF via `<Image>`
- `public/branding/SVG/isotipo-efeonce-negativo.svg` — isotipo
- Sub-brand variants: `globe-full.svg`, `wave-full.svg`, `reach-full.svg` (+ negativo variants)
- Colores canonicos: `#023c70` (Efeonce Digital navy), `#0375db` (accent), `#bb1954` (Globe), `#00BAD1` (Wave), `#ff6500` (Reach)
- Fuentes: DM Sans (body) + Poppins (headings) — via `Font.register()` en `@react-pdf/renderer`, requiere `.ttf` en `src/assets/fonts/`
- Emisor legal: **Efeonce Group SpA, RUT 77.357.182-1, Dr. Manuel Barros Borgoño 71 of 05, Providencia, Chile**

**Decisiones tecnicas a resolver:**

| Tema | Decision recomendada |
|---|---|
| Logo SVG vs PNG en PDF | PNG via `<Image>` (SVG en `@react-pdf/renderer` soporta limitado) |
| Rich HTML renderer | Whitelist `<p>`, `<strong>`, `<em>`, `<ul>`, `<li>`, `<br>` via parser custom → React-PDF `<Text>` jerarquicos |
| QR code | Libreria `qrcode` → PNG data URL → `<Image>` |
| Executive summary auto | Fallback al campo `description`; enriquecer con AI cuando TASK-609 este live |
| Sales rep info | De session `tenant.userId` → lookup `team_members` (name, email, phone) |

**Gap clasificado:** Este PDF redesign es un item **funcional-visibilidad**, no robustez. Alto impacto percibido (cada cliente ve el PDF) con esfuerzo medio (2 sprints). Encaja en **P2 Fase 1** junto con eSignature (ambos tocan el "momento de cierre").

### d) DocuSign integration — contexto

DocuSign es el lider enterprise con ~70% market share. Para LATAM:

- **Integracion tecnica:** API REST + webhooks (`envelope.sent`, `envelope.signed`, `envelope.declined`, `envelope.voided`).
- **Flujo operacional:** quote emitida → POST a DocuSign → envelope con PDF + campos de firma → email al cliente → cliente firma → webhook → GH actualiza `quotation.signed_at` + `signed_by`.
- **Validez legal LATAM:** Chile (Ley 19.799), Colombia (Ley 527), Mexico (NOM-151), Peru (Ley 27269). Todas validas con eSignature no-certificada para contratos comerciales.
- **Costo:** ~$10-25 USD/envelope segun plan (Business Pro = $40 USD/user/mes + envelopes incluidos).
- **Alternativas:** Adobe Sign (enterprise mas caro), HelloSign (barato, menos trust), Signaturit (LATAM-nativo, mas barato).

**Recomendacion Fase 1:** DocuSign only con capa de abstraccion `eSignatureProvider` (interface) para permitir swap a Adobe Sign sin rework cuando un cliente enterprise lo pida.

**Fields nuevos en `quotations`:**

- `esignature_provider VARCHAR` (docusign, adobe_sign)
- `esignature_envelope_id VARCHAR`
- `esignature_status ENUM(pending, sent, viewed, signed, declined, voided, expired)`
- `esignature_sent_at TIMESTAMP`
- `esignature_signed_at TIMESTAMP`
- `esignature_signed_by VARCHAR` (nombre del firmante)
- `esignature_signed_ip VARCHAR` (audit trail)

### e) Conceptos explicados (pedido explicito del owner)

#### Constraint rules DSL: DB vs TS declarativo

**Problema:** al construir bundles necesitas reglas de compatibilidad entre componentes:

- "Si agregas `senior-data-scientist` **debes** incluir `bigquery-license`"
- "`retainer-premium` **no puede** combinarse con `retainer-basic`"
- "Si `quantity > 10 horas/mes` de `strategy-director`, obligatorio agregar `project-manager`"

**Opcion A — DSL en DB:** tabla `bundle_constraints` con operadores (`AND`/`OR`/`REQUIRES`/`EXCLUDES`) que persiste. Admins editan sin deploy. Mas flexible, mas complejo de testear.

**Opcion B — TS declarativo:** reglas viven en TypeScript como funciones tipadas. Maximo type safety, cada cambio requiere deploy.

**Recomendacion Greenhouse:** TS declarativo en Fase 1 (mas robusto, menos bugs). Migrar a DB solo si los product managers piden autonomia real sin PR.

#### Nesting recursivo vs 1 nivel

**1 nivel:** Service A contiene roles + tools. Service B tambien. **No** puedes meter Service A dentro de Service B.

**Recursivo (N niveles):** "Retainer Premium" = "Retainer Base" + "Analytics Add-on", cada uno podria contener otros bundles.

**Riesgos del recursivo:**

1. Ciclos infinitos (A → B → A) requieren deteccion
2. Pricing engine se vuelve arbol profundo (mas CPU)
3. UX confuso al editar quote

**Recomendacion:** 1 nivel + campo `service.add_ons[]` para un paso extra sin recursividad. Cubre el caso "Retainer Premium = Base + Analytics" sin complejidad de arbol.

#### Co-term estricto vs paralelo-agrupable

Cliente con 3 servicios recurrentes:

- Service A: vence Mar 2027
- Service B: vence Jun 2027
- Service C: vence Sep 2027

**Co-term estricto:** al renovar uno, forzas alinear los 3 a la misma fecha (ej. todos a Mar 2028). Una sola fecha de renewal, un solo quote, un solo pago anual.

**Paralelo-agrupable:** cada servicio mantiene su fecha. Opcional: boton "Renovar todos juntos" genera quote combinado con prorrateo (adelantar B y C a Mar).

**Recomendacion:** paralelo-agrupable. Estricto genera friccion (clientes no quieren pagar 6 meses antes solo por alineacion).

#### Amendment vs re-quote

Cliente con retainer vigente pide cambios (ej. subir de 40 a 60 horas/mes):

**Amendment:** modifica contrato existente. Anexo "cambio nro 1" con fecha efectiva, delta, firma adicional. Contrato original sigue siendo unidad legal. Contabilidad: ajuste de revenue.

**Re-quote:** cotizacion nueva que **supersede** la anterior. Cancela contrato vigente + crea uno nuevo. Contabilidad: baja original + alta nuevo.

**Diferencia practica:** amendment mantiene continuidad legal (serial, auditoria, terminos heredados). Re-quote es mas simple operacionalmente pero pierde trazabilidad del cambio.

**Recomendacion LATAM:** soportar ambos. Amendment es lo estandar en contratos corporativos LATAM; re-quote como fallback cuando el cambio es tan grande que amerita renegociar todo.

### f) Impacto en priorizacion (update a la tabla P2)

Agregar 2 items al plan:

| ID | Spec candidato | Gap | Fase | Esfuerzo |
|---|---|---|---|---|
| **TASK-629** | PDF enterprise redesign (7 paginas + logo + sub-brand + signature block + QR verificacion + paginacion + datos emisor dinamicos + rich HTML descriptions rendering) | PDF generico | P2 Fase 1 (junto con eSignature) | 2 sprints |
| **TASK-630** | Rich text editor (TipTap) en admin UI product-catalog para poblar `description_rich_html` | Datos product | P2 Fase 1 | 1 sprint |

Y refinar el alcance de tasks ya planeadas:

- **TASK-620** (Service catalog como bundle CPQ) incluye explicitamente **constraint rules en TS declarativo** (Opcion B elegida) + **1 nivel de nesting** con `service.add_ons[]`.
- **TASK-624** (Renewal engine) incluye **paralelo-agrupable** (no co-term estricto) + soporta cualquier `default_duration_months` entero (no solo los 5 presets tipicos).
- **TASK-628** (Amendment) queda **NO diferible**: sube de Fase 5 a Fase 2 porque LATAM corporate lo espera.
- **TASK-619** (eSignature DocuSign) incluye capa `eSignatureProvider` interface para permitir Adobe Sign como segundo provider cuando lo pidan.

## Delta 2026-04-24 (v1.3) — 7 decisiones operativas cerradas con racional robustez+escalabilidad

Las 7 decisiones operativas que quedaban abiertas en v1.2 se cierran. Cada una tiene su racional documentado para que cualquier futuro cambio de criterio entienda el trade-off.

### Decision 1 — Renewal lead time → multi-valor cascada estandar (90 / 30 / 7 dias)

Emitir 3 events en cascada antes del vencimiento:

- **90 dias antes**: `commercial.service.renewal_due_advance` → CSM tiene tiempo para revisar valor entregado y negociar
- **30 dias antes**: `commercial.service.renewal_due_imminent` → genera renewal quote draft automatica
- **7 dias antes**: `commercial.service.renewal_due_critical` → escala a manager si no hay aceptacion

**Racional:** enterprise estandar (Salesforce/Zuora/Chargebee). Single-event te deja sin segunda oportunidad si el cliente no responde. Multi-tier permite procesos diferenciados (revision → quote → escalacion) sin construirlos despues.

**Modelado:** tabla `service_renewal_alerts` con `(service_module_id, alert_offset_days, event_type)`. **Configurable por tenant** para que algunos clientes premium tengan 120/60/14 si se justifica.

### Decision 2 — Discount levels → soportar los tres jerarquicamente

Soportar **line + bundle + global** con orden de aplicacion claro:

```text
precio_linea
  → -line_discount
  → subtotal_linea
  → suma_subtotales_bundle
  → -bundle_discount
  → subtotal_bundle
  → suma_bundles
  → -global_discount
  → total
```

**Racional:** bundle-level es lo que el operador comercial intuitivamente quiere ofrecer ("15% off al paquete completo"). Line-level es necesario para casos puntuales (descontar solo una herramienta cara). Negar uno de los dos corta UX: operador termina haciendo calculos mentales para "fingir" el descuento que no tiene.

**Robustez:** agregar tabla `bundle_discount_audit` registrando que descuento se aplico a que nivel + por quien. Sin esto el margin engine no puede explicar por que la cotizacion quedo debajo del floor.

### Decision 3 — Tax engine LATAM → generico parametrico con override per-pais

Motor base generico con interface `TaxRule(country, rate, scope, exemptions)` + sub-modulos por pais que sobreescriben **solo los matices**:

- Chile: usa el generico (IVA 19% directo)
- Colombia: extiende con retencion en la fuente
- Mexico: extiende con IEPS para ciertos productos
- Peru: usa el generico (IGV 18% directo)

**Racional:** sub-motor por pais desde dia 1 duplica logica que es 80% igual. Solo generico choca en 6 meses con el primer caso colombiano de retencion y refactorizas todo. **Plugin extensible** te da la base generica + extension points donde realmente importa.

**Escalabilidad:** el dia que llegues a Brasil (ICMS+PIS+COFINS+IPI, el mas complejo de LATAM), agregas un sub-modulo Brasil sin tocar los otros 4 paises.

### Decision 4 — Rich text editor → TipTap

**Racional vs alternativas:**

- **TipTap vs Lexical:** TipTap tiene 4 anios de madurez, comunidad React grande, ecosistema de extensions (mentions, slash commands, tables). Lexical es de Meta pero el ecosistema es chico, breaking changes frecuentes.
- **TipTap vs Slate:** Slate es low-level (te da las primitivas, construyes todo encima). TipTap viene con extensions production-ready out-of-the-box.
- **TipTap vs Quill:** Quill es legacy (Delta format propio, no extensible). TipTap output es HTML estandar — clave porque tu sanitizer ya espera HTML.

**Robustez extra:** TipTap output → tu `sanitizeProductDescriptionHtml` (TASK-603) → DB. La cadena ya esta armada, no hay que cambiar el sanitizer.

### Decision 5 — QR del PDF → publico con signed token

Ruta publica `/public/quote/[quotationId]/[versionNumber]/[signedToken]`. El token es HMAC del `quotationId+version+pdfHash+secret`.

**Racional:**

- **UX:** el cliente abre el QR desde su celular sin login. Autenticado requiere que el cliente sea usuario del portal — friction enorme.
- **Seguridad:** el signed token previene URL guessing. Solo quien tiene el PDF (con el QR) puede acceder.
- **Trazabilidad:** registras hits a esa URL → analytics de "el cliente abrio el quote N veces" → senial comercial valiosa.
- **Audit:** el token incluye el hash del PDF. Si el PDF fue alterado offline, el QR muestra "documento invalido" al validar.

**Escalabilidad:** el endpoint publico sirve para verificacion legal en disputa ("este quote es autentico, este no"). Salesforce/HubSpot CPQ lo hacen asi.

### Decision 6 — Sub-brand detection → mayoria de lineas con override en header

Logica en cascada al renderizar el PDF:

1. Si `quotation.business_line_code_override` esta set → usa ese (admin lo seteo manualmente)
2. Si no, mayoria de los `line_items.product.business_line_code` → usa esa BL
3. Si hay empate o todas null → usa `efeonce` (matriz)

**Racional:**

- **Header solo:** no captura quotes mixtas (cada vez mas comunes — "te vendo Globe + Wave en el mismo retainer").
- **Por linea solo:** confuso visualmente — que logo poner en el cover si hay 60% Globe y 40% Wave.
- **Mayoria con override:** respeta la realidad de las quotes mixtas pero da escape hatch al admin para forzar cuando el negocio dice "esta es Globe aunque tenga 1 linea Wave".

**Robustez:** persistir el resultado en `quotation.resolved_business_line_code` al issue para que el PDF siempre renderice consistente (no recalcule cada vez).

### Decision 7 — Legal entity → dinamico desde greenhouse_core.organizations

Query dinamico al render del PDF, con cache de 1 hora.

**Racional:**

- **Hardcoded** parece simple hoy pero es deuda futura: el dia que cambies de "Efeonce Group SpA" a "Efeonce Holding SpA" (M&A, restructuring), todos los quotes nuevos siguen mostrando el viejo nombre hasta que un dev haga deploy. Pesimo legalmente.
- **Dinamico** se autocorrige solo. Y permite multi-entity (operating_entity por pais: Efeonce Chile SpA, Efeonce Colombia SAS, Efeonce Mexico SAPI) cuando expandas LATAM.

**Robustez:** funcion `getOperatingEntityForCountry(country_code)` resuelve la entidad correcta basandose en el pais del cliente. Esto te prepara para que clientes mexicanos reciban factura desde Efeonce Mexico SAPI sin codigo nuevo.

### Resumen de impacto en estimados

Los acuerdos cerrados absorben scope a tasks ya planeadas:

| Task | Cambio de estimado | Motivo |
|---|---|---|
| TASK-624 (renewals) | +1 sprint | Multi-tier 90/30/7 + tabla `service_renewal_alerts` configurable |
| TASK-620 (bundles) | +0.5 sprint | `bundle_discount` + tabla `bundle_discount_audit` |
| TASK-626 (tax) | -1 sprint | Re-formateada como "engine generico + Chile plugin Fase 1"; otros paises entran on-demand |
| TASK-629 (PDF) | +0.5 sprint | Sub-brand resolver + legal entity dinamico + QR signed token |
| TASK-630 (rich text editor) | sin cambio | Especificamente TipTap |

Estimado total P2 Fase 1-2: **+1 sprint neto**.

## Delta 2026-04-24 (v1.4) — PDF: single template con secciones condicionales

### Decision: NO multi-template explicito

Se descarta el approach de tener 3 templates (`compact` / `standard` / `enterprise`) seleccionables manualmente o por reglas. En su lugar, **un solo template con secciones condicionales** que se activan basandose en si los datos existen.

**Racional:**

- **Una sola codebase a mantener** — no hay 3 layouts paralelos que pueden divergir.
- **Sin decision operativa** — el sales rep no elige template, el sistema decide segun la data.
- **Look-and-feel consistente** — el cover, branding, fonts, colores son siempre identicos. Solo varia cuantas secciones aparecen.
- **Validacion empirica primero** — empezamos con 1 template; si en 5-10 quotes reales se valida la necesidad de templates explicitos (ej. "para SaaS bundles necesito un layout diferente al de retainers"), se evoluciona a multi-template en una segunda iteracion. No se sobre-ingenieriza antes de validar.

### Contrato de secciones — always vs conditional

| Seccion | Renderizado | Trigger de activacion |
|---|---|---|
| **Cover** | ✅ Siempre | — |
| **Executive Summary** | ⚠️ Condicional | `quotation.description` tiene >= 200 caracteres O `total > $50M CLP equivalente` O tag `enterprise` |
| **About Efeonce / Sub-brand** | ⚠️ Condicional | `total > $50M CLP equivalente` O tag `enterprise` O cliente en su 1er quote |
| **Scope of Work** | ✅ Siempre | — |
| **Commercial Proposal (tabla)** | ✅ Siempre | — |
| **Investment Timeline** | ⚠️ Condicional | Existe alguna linea con `is_recurring=true` O hay milestones de pago definidos |
| **Terms & Conditions** | ✅ Siempre | — |
| **Signatures + QR** | ✅ Siempre | — |
| **Footer fijo** | ✅ Siempre (todas las paginas) | — |

**Comportamiento esperado:**

- Quote chica (1-3 lineas, < $5M, sin recurring, sin description): **2-3 paginas** (Cover + Scope + Commercial + Terms + Signatures, sin Executive Summary, sin About, sin Timeline).
- Quote estandar (3-10 lineas, retainer o bundle, $5-50M): **4-5 paginas** (agrega Investment Timeline si hay recurring; sin Executive Summary ni About).
- Quote enterprise (> 10 lineas, > $50M o tag enterprise): **6-7 paginas** (todas las secciones activas).

### Triggers detallados de activacion

```ts
interface QuotationPdfFlags {
  showExecutiveSummary: boolean
  showAboutEfeonce: boolean
  showInvestmentTimeline: boolean
}

const computePdfFlags = (quote: Quotation): QuotationPdfFlags => {
  const totalInClp = quote.totalCLP // pre-calculado en outbound
  const isEnterpriseTagged = quote.tags?.includes('enterprise') ?? false
  const isFirstQuoteForClient = quote.clientQuoteCount === 1
  const hasLongDescription = (quote.description?.length ?? 0) >= 200
  const hasRecurringLines = quote.lineItems.some(li => li.isRecurring)
  const hasPaymentMilestones = quote.paymentMilestones?.length > 0

  return {
    showExecutiveSummary: hasLongDescription || totalInClp > 50_000_000 || isEnterpriseTagged,
    showAboutEfeonce: totalInClp > 50_000_000 || isEnterpriseTagged || isFirstQuoteForClient,
    showInvestmentTimeline: hasRecurringLines || hasPaymentMilestones
  }
}
```

**Threshold $50M CLP** es ajustable via env var `GREENHOUSE_PDF_ENTERPRISE_THRESHOLD_CLP`. Permite calibrar segun feedback operativo sin deploy.

### Refinamiento TASK-629

Alcance final del rediseno PDF:

1. **Componentes React-PDF reutilizables**: cada seccion (Cover, ExecutiveSummary, ScopeOfWork, CommercialProposal, InvestmentTimeline, Terms, Signatures) es un componente independiente con su propia data shape.
2. **Orquestador**: `<QuotationPdfDocument>` lee los flags via `computePdfFlags()` y compone las secciones aplicables.
3. **Brand assets**: logo PNG via `<Image>`, fonts DM Sans + Poppins via `Font.register()`.
4. **Sub-brand resolver**: persistir `quotation.resolved_business_line_code` al issue (Decision 6 v1.3).
5. **Legal entity**: query dinamico a `greenhouse_core.organizations` con cache 1h (Decision 7 v1.3).
6. **QR**: signed HMAC token publico (Decision 5 v1.3).
7. **Rich HTML descriptions**: line items leen `product_catalog.description_rich_html` y lo renderizan via parser whitelist (`<p>`, `<strong>`, `<em>`, `<ul>`, `<li>`, `<br>`).
8. **Threshold configurable** via env var.

**Estimado mantenido:** 2 sprints (no cambia vs v1.3 — el modelo single-template con conditionals es comparable en esfuerzo a multi-template explicit, y no agrega ceremonia operativa).

### Migration path si en el futuro se necesita multi-template explicito

Si despues de validar con 5-10 quotes reales se descubre que SaaS bundles requieren un layout estructuralmente distinto (ej. "comparison table vs feature list" o "cover diferente"):

1. Agregar campo `quotation.pdf_template VARCHAR DEFAULT 'universal'`.
2. Crear archivo `quotation-pdf-template-saas.tsx` que reusa los mismos componentes pero los compone diferente.
3. El orquestador switch on `quote.pdf_template`.

Sin breaking change al template universal. La inversion en componentes reutilizables paga el rework futuro.

## Hallazgos principales

### A. Score Greenhouse vs CPQ canon (benchmark mercado)

| Dimension | Score (/10) | Observacion |
|---|---|---|
| Product Catalog | 6 | Falta bundles + tier pricing (engine es flat-only) |
| Quote Configuration | 5 | Falta guided selling + constraint-based config |
| Pricing & Discounting | 8 | Ventajoso: cost-plus + margin floor + FX snapshot |
| Document & Workflow | 6 | Falta eSignature + multi-level approval + i18n |
| CRM Integration | 9 | Drift detection es diferenciador unico |
| Quote-to-Cash | 6 | Falta renewal + rev rec + tax engine externo |
| Analytics | 4 | Gap amplio; no hay dashboards de win/loss o velocidad |
| **Global funcional** | **6.5/10** | Solido para agencia LATAM; gaps esperables |
| **Global arquitectonico** | **7/10** | Moderno (event-driven + projections); con 3 bugs de race condition |

### B. Ventajas unicas de Greenhouse sobre el mercado CPQ

1. **Cost-plus + margin floor como first-class del engine** — Salesforce CPQ lo trata como addon; Greenhouse lo tiene en core.
2. **FX snapshot inmutable per quote** — pocos CPQ lo hacen (Zuora lo hace para subscriptions).
3. **Drift detection bidireccional contra CRM** — nadie lo hace en el mercado. Filosofia mainstream es "CPQ es master, CRM es viewer"; Greenhouse reconoce que HubSpot es CRM canonico y GH es SoT comercial.
4. **Event-driven reactive projections** — el mercado hace ETL batch; pattern comparable a Shopify/Stripe.
5. **Materializer de source catalogs** (sellable_roles, tools, overheads, services → product_catalog) — unico para modelo agency (team-as-product).
6. **IVA explicito con buckets tributarios** (recuperable vs no recuperable) — mas transparente que apoyarse 100% en Avalara.

### C. Gaps criticos (robustez — afectan data consistency)

Estos son **anteriores** a cualquier gap funcional. El mercado CPQ los resolvio hace 10+ anios.

| # | Issue | Severidad | Lugar | Por que es critico |
|---|---|---|---|---|
| R1 | Race condition en quotation repricing | **Critico** | `POST /api/finance/quotes` + `/recalculate` | Dos requests paralelos crean versiones duplicadas (no hay row lock ni unique constraint en `version_number`). Salesforce usa optimistic locking; GH no. |
| R2 | Quote → HubSpot orphaning post-create | **Critico** | `src/lib/hubspot/create-hubspot-quote.ts` | Si `persistHubSpotQuoteState` falla post-API-call, la HS quote existe pero GH no sabe su ID. Sin idempotency key validado en retry, genera duplicados en HS. |
| R3 | Partial line item sync sin rollback | **Critico** | `syncQuoteLineItems()` en `sync-hubspot-quotes.ts` | Si sync de una quote OK pero 1 lineitem falla, la quote HS queda parcial. Salesforce usa transactional bulk API. |
| R4 | Cost override sin idempotency | Alto | `/api/finance/quotes/[id]/lines/[lineItemId]/cost-override` | Double-POST crea registros duplicados. |
| R5 | Anti-ping-pong window 60s sin marca de origen | Moderado | `push-product-to-hubspot.ts:42` | Si GH push + HS edit coinciden en 60s, uno gana arbitrariamente. Mercado CPQ usa `last_modified_by_source_system` explicito. |
| R6 | Drift report bloat sin prune policy | Moderado | `source_sync_runs` | Reconcile semanal persiste para siempre; tabla crece sin limite. |

### D. Gaps funcionales vs mercado CPQ (features)

| # | Feature | Greenhouse | Mercado | Impacto agency |
|---|---|---|---|---|
| F1 | Bundles + configuration rules | ❌ (`bundleType='none'` hardcoded) | ✅ Salesforce CPQ core | Alto si vendes paquetes componibles (ej. "retainer + herramientas") |
| F2 | Tier/volume/graduated pricing | ❌ (engine flat-only) | ✅ Todos | Medio — relevante para retainers con descuento por volumen |
| F3 | eSignature (DocuSign/Adobe) | ❌ | ✅ Tabla de apuestas | Medio — hoy "sent" no rastrea firma |
| F4 | Multi-level approval con escalation | ❌ (single gate por monto) | ✅ Todos | Bajo a medio — por ahora governance basta |
| F5 | Guided selling wizard | ❌ | ✅ Salesforce/DealHub signature | Medio — reduce onboarding de SDRs nuevos |
| F6 | Renewal management (co-term, auto-renew) | ❌ | ✅ Salesforce Subscription | Alto si creces en retainers/SaaS recurrente |
| F7 | Cross-sell / upsell recomendaciones | ❌ | ✅ | Medio — combinable con TASK-609 (AI quote draft) |
| F8 | Price books por segmento/region | ❌ (un price book global) | ✅ Salesforce Price Books | Bajo hoy (FX cubre la mayoria del caso) |
| F9 | Revenue recognition schedule | ❌ | ✅ Zuora RevPro / Salesforce RevRec | Bajo hoy — contabilidad no lo pide |
| F10 | Tax engine externo (Avalara/Vertex) | ⚠️ Chile IVA hardcoded | ✅ 190+ paises | Bajo hoy (LATAM focus), alto si internacionalizas |
| F11 | Amendment / co-term quote | ❌ | ✅ | Bajo hoy |
| F12 | Multi-language doc | ❌ (solo ES) | ✅ | Bajo hoy, alto si Globe clients crecen |
| F13 | Analytics dashboards (win/loss, velocity, discount) | ⚠️ ad-hoc queries | ✅ Builtin | Medio — hoy se hace via BQ manual |

### E. Gaps cosmeticos / deuda tecnica (sin impacto negocio)

| # | Issue | Impacto | Fix |
|---|---|---|---|
| C1 | Duplicacion pricing logic frontend vs backend | Bajo | Consolidar `quote-builder-pricing.ts` como cliente de `/simulate` |
| C2 | Endpoint deprecated `/api/finance/quotes/hubspot` aun accesible | Bajo | Retornar 410 Gone o 301 redirect |
| C3 | `console.error` en lugar de Cloud Logging structured | Bajo | Migrar a logger estructurado |
| C4 | Tests ausentes en API routes (0/23) | Medio | Crear suite de integracion |
| C5 | Tests ausentes en materializer handlers (0/4) | Medio | Unit tests por handler |
| C6 | References hard-coded sin cache | Muy bajo | Agregar memoize simple |

### F. Gaps de datos que NO son codigo (operacion)

Estos son gaps del materializer TASK-546 que no son del scope de TASK-587. Registrados para awareness:

- `sellable_role.business_line_id` null (33 productos) — el source catalog `sellable_roles` no proyecta esta columna.
- `tool.business_line_id` mezclado case (Globe/globe) — inconsistencia de data histórica; parcialmente mitigado por `normalizeBusinessLineCode()` en outbound.
- `commercial_owner_member_id` null (74/74 productos) — requiere asignacion humana via admin UI o default por source_kind.
- `hs_tax_category` null (todos) — requiere habilitar Taxation add-on en HubSpot portal.

## Plan de hardening priorizado

### Criterio de priorizacion

Ordenado por **Impacto × Urgencia / Esfuerzo**:

- **P0 — Unblocker**: afecta data consistency hoy; corrupcion silenciosa o duplicacion en prod. Fix < 2 sesiones.
- **P1 — Robustez estructural**: no hay data corruption hoy pero la probabilidad crece con volumen. Fix 1-3 sesiones.
- **P2 — Funcional relevante**: gap de feature que mercado tiene; habilita nuevo modelo de negocio o reduce friccion operativa. Fix 1-4 sprints.
- **P3 — Polish / deuda**: no bloquea nada; mejora mantenibilidad.

### P0 — Cerrar race conditions antes de escalar volumen

Impacto: datos consistentes hoy. Urgencia: cada duplicado/orfano en prod es debt que crece.

| ID | Spec candidato | Gap | Esfuerzo | Dependencias |
|---|---|---|---|---|
| **P0.1** | TASK-611 — Quote repricing optimistic locking | R1 | 1 sesion | Migration: UNIQUE (`quotation_id`, `version_number`); select `FOR UPDATE` en `/recalculate` |
| **P0.2** | TASK-612 — HubSpot quote idempotency key enforcement | R2 | 1 sesion | Agregar `gh_idempotency_key` validation en `create-hubspot-quote` + check dedup pre-POST |
| **P0.3** | TASK-613 — Quote line items transactional sync | R3 | 1-2 sesiones | Envolver `syncQuoteLineItems` en bulk PATCH transactional o retry granular con telemetry |

### P1 — Robustez estructural (preventiva)

Impacto: previene clase de bugs con volumen. Sin urgencia hoy pero acumula debt.

| ID | Spec candidato | Gap | Esfuerzo |
|---|---|---|---|
| **P1.1** | TASK-614 — Cost override idempotency + conflict detection | R4 | 0.5 sesion |
| **P1.2** | TASK-615 — Anti-ping-pong con `last_modified_by_source_system` | R5 | 1 sesion |
| **P1.3** | TASK-616 — Drift report prune policy (retention 90 dias + archive) | R6 | 0.5 sesion |
| **P1.4** | TASK-617 — API routes integration tests (top-10 rutas criticas) | C4 | 2-3 sesiones |
| **P1.5** | TASK-618 — Structured logging migration | C3 | 1 sesion |

### P2 — Funcionales priorizadas por impacto agency

Re-priorizadas post-Delta v1.1 con business context confirmado (renewal must-have, SaaS bundles, LATAM multi-pais). Ordenadas por ROI estrategico:

| ID | Spec candidato | Gap | Esfuerzo | Por que en este orden |
|---|---|---|---|---|
| **P2.1** | TASK-619 — eSignature DocuSign integration | F3 | 2 sprints | Cierra loop quote-to-signed, mejora cobranza. DocuSign cubre LATAM; Adobe queda opcional cuando un cliente enterprise lo requiera. |
| **P2.2** | TASK-623 — Tier/volume/graduated pricing en engine | F2 | 2 sprints | **Prerequisite para SaaS bundles + renewals maduros.** Hoy engine es flat-only, bloquea vender licencias con commitment discounts. |
| **P2.3** | TASK-620 — Service catalog como bundle CPQ (extension) | F1 | 2 sprints | **NO construir desde cero**: extender `service_modules` con (a) sync a HubSpot como bundle real (desbloquea `hubspot_bundle_type='open'`), (b) bundle-level discount, (c) constraint rules entre role+tool recipes. Aprovecha 70% del modelo ya implementado. |
| **P2.4** | TASK-624 — Renewal engine + co-term | F6 | 3 sprints | **Must-have confirmado.** Base ya existe (`default_duration_months` + `on_going` model). Requiere: cron que detecta expiracion, emite `commercial.service.renewal_due` event, genera renewal quote automatica con opcion de override. Co-term para agrupar renewals en un solo quote date. |
| **P2.5** | TASK-626 — Tax engine LATAM extendido (Colombia IVA + Mexico IVA + Peru IGV) | F10 | 2 sprints | **LATAM confirmado.** Extender buckets tributarios actuales (Chile IVA 19%) a los 4 paises de la matriz FX (CLP/COP/MXN/PEN). Mantener el motor propio; Avalara solo si escalas fuera de LATAM. |
| **P2.6** | TASK-625 — Multi-language doc (ES/EN) | F12 | 1 sprint | LATAM empuja ingles para accounts cross-border (Mexico + Colombia frecuentemente bilingues). |
| **P2.7** | TASK-609 — AI quote draft (ya registrada) | F5 + F7 | 2-3 sprints | Aprovecha bundles (P2.3) + renewal history (P2.4) como input al modelo — si se hace antes de P2.3/P2.4 el AI no tiene features ricas que aprender. |
| **P2.8** | TASK-621 — Analytics dashboards (win/loss + velocity + discount + renewal rate + MRR) | F13 | 2 sprints | Despues de P2.4 hay metricas de MRR/renewal rate que hoy no existen; vale mas hacerlo con data completa. |
| **P2.9** | TASK-622 — Multi-level approval con escalation | F4 | 2 sprints | Postergable: governance actual basta hasta que equipo comercial crezca 3x. |
| **P2.10** | TASK-627 — Service bundle nesting (service → service reference) | F1 ext | 1 sprint | Feature avanzada: permite super-bundles como "Retainer Premium = Retainer Base + Add-on Analytics". Despues de P2.3 estable. |
| **P2.11** | TASK-628 — Amendment / co-term quotes | F11 | 2 sprints | Co-term incluido en P2.4; amendment pura (modificar contrato vigente) puede esperar. |

### P3 — Polish / deuda tecnica

| ID | Spec candidato | Gap | Esfuerzo |
|---|---|---|---|
| P3.1 | Consolidar pricing logic frontend/backend | C1 | 1 sesion |
| P3.2 | Deprecated endpoint → 410 Gone | C2 | <1 hora |
| P3.3 | Materializer handler unit tests | C5 | 1 sesion |
| P3.4 | Cache en `getProductCategoryByCode` | C6 | <1 hora |

### Gaps de datos (operacion, no codigo)

Registrados para ejecucion humana cuando corresponda:

- **OP.1** — Enriquecer materializer TASK-546: proyectar `business_line_id` desde `sellable_roles` al `product_catalog`. SQL migration + update handler.
- **OP.2** — Asignar `commercial_owner_member_id` a los 74 productos (manual via admin UI o default por source_kind).
- **OP.3** — Habilitar Taxation add-on en HubSpot portal 48713323 (si/cuando se justifique tax engine multi-pais).
- **OP.4** — Configurar field permissions HubSpot UI para rol operador (read-only de 21 fields — ver `hubspot-product-catalog-field-permissions.md`).

## Secuenciacion recomendada

### Bloque 1 — P0 (prioridad absoluta, ~1-2 semanas)

TASK-611, TASK-612, TASK-613 juntas — cierran los 3 gaps criticos de data consistency. Baratas, rapidas, previenen corrupcion silenciosa.

### Bloque 2 — P1 (~2-3 semanas)

TASK-614..618 en paralelo donde posible. Habilita escalamiento seguro de volumen.

### Bloque 3 — P2 por fases (actualizado v1.1)

- **Fase 1 — Ciclo comercial completo:** TASK-619 (eSignature) + TASK-623 (tier pricing engine).
- **Fase 2 — Bundles + Renewals (el corazon SaaS):** TASK-620 (service catalog como bundle CPQ) + TASK-624 (renewal engine + co-term). **Orden:** bundles primero, renewals despues, porque renewals necesitan bundles estables como unidad de renovacion.
- **Fase 3 — LATAM expansion:** TASK-626 (tax engine Colombia/Mexico/Peru) + TASK-625 (multi-language ES/EN).
- **Fase 4 — Intelligence + Analytics:** TASK-609 (AI quote draft con bundles + renewals como features) + TASK-621 (dashboards con MRR + renewal rate).
- **Fase 5 — Scale (diferibles):** TASK-622 (multi-level approval) + TASK-627 (bundle nesting) + TASK-628 (amendment).

### Bloque 4 — P3 + OP

Oportunistico — ir resolviendo mientras se ejecutan los bloques 1-3.

## Decisiones abiertas

**Todas las decisiones del brief estan cerradas a partir de v1.3.** Los 3 bloques de decisiones se documentaron con racional para que cualquier futura iteracion entienda el trade-off:

| Bloque | # | Decision | Resolucion | Doc |
|---|---|---|---|---|
| Fundacional | 1 | Bundle model | Extender service_catalog (no replicar Salesforce) | Delta v1.1 |
| Fundacional | 2 | Renewal trigger | Event-based + cliente-driven combinado | Delta v1.1 |
| Fundacional | 3 | Tax engine | Extender Chile IVA a LATAM incrementalmente | Delta v1.1 |
| Fundacional | 4 | Analytics stack | In-portal Next.js + BQ | Delta v1.1 |
| Fundacional | 5 | eSignature | DocuSign only Fase 1 | Delta v1.1 |
| Conceptual | 6 | Constraint rules DSL | TS declarativo Fase 1 | Delta v1.2 |
| Conceptual | 7 | Nesting | 1 nivel + `service.add_ons[]` | Delta v1.2 |
| Conceptual | 8 | Co-term | Paralelo-agrupable | Delta v1.2 |
| Conceptual | 9 | Amendment vs re-quote | Soportar ambos | Delta v1.2 |
| Operativa | 10 | Renewal lead time | Multi-valor 90/30/7 cascada | Delta v1.3 |
| Operativa | 11 | Discount levels | Line + bundle + global jerarquicos | Delta v1.3 |
| Operativa | 12 | Tax engine arquitectura | Generico + plugins per-pais | Delta v1.3 |
| Operativa | 13 | Rich text editor | TipTap | Delta v1.3 |
| Operativa | 14 | QR destino | Publico con signed token HMAC | Delta v1.3 |
| Operativa | 15 | Sub-brand detection | Mayoria lineas + override header | Delta v1.3 |
| Operativa | 16 | Legal entity | Dinamico desde organizations | Delta v1.3 |
| PDF | 17 | Multi-template vs single-template | Single template con secciones condicionales | Delta v1.4 |

**Total:** 17 decisiones cerradas, 0 abiertas. El brief esta listo para generar las TASK-### especificas cuando el owner lo apruebe.

Cualquier nueva decision que surja en la implementacion se documenta como Delta vN+1 a este mismo brief, no como ad-hoc en cada task.

## Criterio "ready for task"

Cada item pasa a `docs/tasks/to-do/TASK-###-...md` cuando:

- Spec tiene **gap claro** (causa raiz + comportamiento actual + comportamiento deseado).
- Spec tiene **acceptance criteria** testeable.
- Spec tiene **rollback plan** si el fix sale mal.
- Spec declara **archivos owned** para detectar impacto cruzado.
- Decisiones abiertas estan resueltas.

## Referencias

- Auditoria interna ejecutada 2026-04-24 con Explore agent (mapeo codigo) + muestreo live portal HubSpot 48713323.
- Contraste CPQ mercado: Salesforce CPQ docs, HubSpot CPQ features, Zuora RevPro, DealHub CPQ, Conga CPQ.
- Backfill report: [backfill-product-catalog-hs-v2-20260424.md](../operations/backfill-product-catalog-hs-v2-20260424.md).
- Architecture context: [GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md](../architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md) v1.5.
