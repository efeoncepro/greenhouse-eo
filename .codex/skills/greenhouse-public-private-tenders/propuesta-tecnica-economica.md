# Armado de la Oferta — Técnica, Económica y Administrativa

Cómo ensamblar el paquete que gana. La skill decide **qué va y con qué estructura**; el **craft de redacción** se delega a `copywriting`, y la **tokenización/tono de copy visible** a `greenhouse-ux-writing`. El staffing/CVs a `greenhouse-talent-people-operator`.

## Los tres sobres (público) / tres bloques (privado)

1. **Oferta administrativa** — que seas admisible: identificación, poderes, declaraciones juradas, garantía de seriedad, anexos formales.
2. **Oferta técnica** — que ganes en calidad: metodología, equipo, experiencia, plan de trabajo, entregables, SLA.
3. **Oferta económica** — el precio, en el formato exacto que piden.

**Regla estructural #1:** existe una **matriz de cumplimiento** que mapea cada requisito de las bases a la sección/anexo de tu oferta que lo satisface. Si un requisito no tiene fila que lo cubra, tienes un hueco de admisibilidad.

## Matriz de cumplimiento (la herramienta que evita el descarte)

| Req. bases | ¿Excluyente o puntúa? | Dónde lo cumplo | Evidencia | Estado |
|---|---|---|---|---|
| Inscripción ChileProveedores hábil | Excluyente | Anexo 1 | Certificado | ✅ |
| Experiencia ≥ 3 trabajos similares | Puntúa (20%) | Sección Experiencia | 3 certificados + casos | ✅ |
| Garantía de seriedad UF X, vigencia N días | Excluyente | Sobre admin | Póliza N° … | ⏳ emisión |
| Jefe de proyecto con título + 5 años | Puntúa (15%) | Anexo Equipo | CV + título | ✅ |
| Formato oferta económica (planilla) | Excluyente | Sobre económico | Planilla firmada | ⛔ falta |

Nada se declara "listo" hasta que todos los excluyentes están ✅.

## La oferta técnica se ITERA en Markdown, y el deck es su PROYECCIÓN (método canónico)

**Antes del deck va el Markdown, y antes del Markdown va el WORKSPACE.** El deal vive en una carpeta
canónica (el "DSR interno"): `pnpm tender:new <slug>` la scaffoldea con `bases/` (RFP), `research/`
(investigación INTERNA), `oferta-tecnica.md` (copiada del template), `artifact-manifest.json` (piezas
vivas por enlace) y `anexos/`. Contrato: `docs/commercial/tenders/TENDER_WORKSPACE_TEMPLATE.md`. La
oferta técnica se escribe/itera —idea, investigación, evidencia, narrativa— en ese `.md` con taxonomía
canónica (`TECHNICAL_OFFER_TEMPLATE.md`), y el deck se compone **desde** ahí.

Regla híbrida de la plantilla: las **secciones son GUÍA** (cada RFP ordena distinto hacia
sus criterios ponderados), pero la **evidencia es CONTRATO** — toda cifra vive primero en el
**Ledger de evidencia** (Zona 0) con fuente googleable + as-of, mapeable 1:1 a
`proposal_evidence`. Es el mismo gate que el composer ya aplica en el deck
(`missing_evidence_ref` rompe el build), pero atrapado **antes**, en el Markdown.

**El deck NO auto-deriva del Markdown.** SSOT del deck = los **slots del `deck-plan.json`**
(mismos slots → mismo PDF; un humano firma). El `.md` es la fuente **narrativa + evidencia**;
el `deck-plan.json` es la fuente de **composición**. Comparten el ledger, pero son archivos
independientes y revisables por separado. El autor/agente construye el plan **desde** la
oferta (propose→confirm), eligiendo qué secciones se vuelven lámina y con qué `contentType`
(declara INTENCIÓN, nunca `template`). El mapa sección→contentType vive en la Zona 2 de la
plantilla; el catálogo de content-types, en `deck-visual-system.md`.

```
investigación (INTERNO) → oferta-tecnica.md (ledger + narrativa + mapa) → deck-plan.json (slots) → PDF
```

**Familia de tres, no un archivo:** la técnica es un sobre. La **económica** se arma con
`pricing-garantias-finance.md` + el generador de Excel; la **administrativa** con
`compliance-riesgo-integridad.md`. No las metas en el `.md` técnico.

## Oferta técnica — anatomía que puntúa

Modela cada sección **hacia el criterio ponderado que la evalúa** (lee primero la tabla de ponderaciones en `chile-publico-operativo.md`).

- **Comprensión del requerimiento** — demuestra que entendiste el problema del comprador, no que copiaste las bases. (Craft → `copywriting`.)
- **Metodología / enfoque** — cómo lo harás, por fases, con lógica. Concreto y verificable, no genérico.
- **Plan de trabajo y cronograma** — hitos, entregables, dependencias, holgura. Coherente con el plazo pedido.
- **Equipo** — perfiles con CV, rol, dedicación %, respaldos (títulos/certificados). El evaluador cruza el CV con el requisito. (Armado → `greenhouse-talent-people-operator`.)
- **Experiencia / casos** — trabajos similares con evidencia acreditable (certificados de buena ejecución, órdenes de compra previas). En público, la experiencia se **acredita**, no se afirma.
- **Valor diferencial** — por qué Efeonce y no el commodity: capacidades, resultados medibles, casos del sector. Aquí entra la narrativa (→ `copywriting`; para rubro marketing/SEO/AEO, calibra con `seo-aeo`/`digital-marketing`).
- **Cumplimiento de requisitos técnicos / SLA** — tabla explícita item por item.

## Oferta económica — el detalle que descalifica por forma

> **El Excel brandeado se GENERA, no se mantiene a mano.** Hay clientes que exigen Excel (documento
> integrante). Las cifras + condiciones viven en `economica.json` (fuente única) y el `.xlsx` profesional
> se emite con `pnpm economica:build <caso>/economica.json` (builder reusable
> `scripts/commercial/lib/economic-offer-xlsx.mjs`: banda navy + wordmark, paleta AXIS, zebra, bloque
> Neto/IVA/Total, print A4). **Techo:** las fuentes no se embeben en `.xlsx`; brand pixel-perfect = PDF
> del composer, con el Excel como planilla editable. 🔴 NUNCA precio unitario por artículo.
> **Confirmá primero si las bases exigen SU planilla** — formato equivocado = inadmisible.


- Usa **exactamente el formato/planilla** que exigen (a veces un Excel específico). Un precio correcto en formato equivocado puede ser inadmisible.
- Respeta la **estructura de ítems** pedida (unitarios, totales, con/sin impuestos según lo indicado).
- Cuida **coherencia interna**: que sumas, subtotales e impuestos cuadren. Errores aritméticos dan pie a observaciones.
- Si hay **UF/UTM**, exprésalo como piden (ver indexación en `pricing-garantias-finance.md`).
- Firma/timbre según se exija.

## Oferta administrativa — anexos y declaraciones juradas

Los típicos (varían por bases — lee siempre):

- Identificación del oferente / representante legal + **poderes vigentes**.
- **Declaración jurada de inhabilidades** (que no estás afecto a art. 4 Ley 19.886, sin condenas 20.393, sin conflicto de interés).
- Declaración de no tener **deudas laborales/previsionales**.
- **Garantía de seriedad** con vigencia y monto correctos.
- Certificados: ChileProveedores hábil, antecedentes, a veces balances/estados financieros.
- Anexos de **experiencia** y **equipo** en el formato pedido.

**Errores fatales frecuentes:** declaración jurada sin firmar/vencida, poder desactualizado, garantía con vigencia corta, anexo en versión anterior tras una respuesta del foro que cambió las bases.

## Foro de aclaraciones como arma de propuesta

- Úsalo para **cerrar ambigüedades** que afectan tu precio o admisibilidad (mejor preguntar que asumir).
- Lee las **respuestas a preguntas de otros**: suelen cambiar las bases y revelar la intención del comprador.
- Cuidado: cada respuesta puede volver **obsoleto un anexo** que ya tenías armado — re-corre la matriz de cumplimiento tras cada tanda de respuestas.

## Diferencias público ↔ privado en la propuesta

| | Público | Privado (RFP corporativo) |
|---|---|---|
| Forma | Rígida, formato/anexos obligatorios, admisibilidad dura | Más flexible, pero igual con requisitos de forma |
| Diferenciación | Dentro de los criterios ponderados; poco espacio a "vender" | Mucho más espacio para narrativa de valor, casos, ROI |
| Interacción | Solo por foro público | Reuniones, presentaciones orales, Q&A, a veces **BAFO** |
| Precio | Fórmula explícita | Negociable, a veces subasta inversa |

Detalle del proceso privado (RFI/RFP/RFQ, evaluación, negociación, BAFO) → `privado-rfp-lifecycle.md`.

## Checklist de "listo para presentar"

- [ ] Matriz de cumplimiento con **todos los excluyentes** ✅.
- [ ] Técnica modelada hacia las **ponderaciones**, no genérica.
- [ ] Económica en el **formato exacto**, sumas cuadran, firmada.
- [ ] Declaraciones juradas **firmadas y vigentes**; poderes al día.
- [ ] Garantía con **monto, tipo y vigencia** correctos, ya emitida.
- [ ] Re-corrí la matriz tras la **última respuesta del foro**.
- [ ] Copy visible pasó por `copywriting` / `greenhouse-ux-writing`.
- [ ] Presentación la ejecuta un **humano** con comprobante guardado (regla human-in-control).

## Hand-off

- Redacción persuasiva → `copywriting`; tono es-CL / tokenización → `greenhouse-ux-writing`.
- Equipo/CVs/competencias → `greenhouse-talent-people-operator`.
- Precio y su detalle → `pricing-garantias-finance.md`.
- Proceso privado y negociación → `privado-rfp-lifecycle.md`.
