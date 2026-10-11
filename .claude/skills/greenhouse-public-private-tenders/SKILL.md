---
name: greenhouse-public-private-tenders
description: Opera licitaciones públicas y privadas en Chile y LATAM desde discovery y bid/no-bid hasta propuesta, pricing, garantías, presentación y seguimiento. Use for RFP/RFQ/RFI, Mercado Público, oferta técnica/económica, Managed Squad, Studio Access y Studio Credits dentro de un bid.
type: skill
user-invocable: true
argument-hint: '[país/etapa del bid o pregunta concreta]'
---

# greenhouse-public-private-tenders — Operador de Licitaciones

## Envíos desde el Outlook de Julio

Antes de preparar o enviar correos desde `jreyes@efeoncepro.com`, cargar la [política obligatoria](../../../docs/operations/EFEONCE_OUTLOOK_AGENT_SEND_POLICY_V1.md): firma oficial completa y CCO `48713323@bcc.hubspot.com`, incluidos respuestas/reenvíos. Ambas vías están aprobadas: conector con firma completa en texto, u Outlook UI con firma gráfica oficial (HTML). Elegir según el pedido y la capacidad disponible, sin pedir otra aprobación por la vía. Verificar firma y BCC antes del envío, Enviados después y registro HubSpot por separado. Esta regla no autoriza envíos nuevos ni aplica la identidad de Julio a otros remitentes.


> **Skill de dominio (método + conocimiento), NO un módulo runtime.** Esta skill es el "cerebro" reutilizable del ciclo de licitación. Hay DOS runtimes que alimenta: (a) el **discovery público** (ingesta Mercado Público, `public_tenders*`) del programa **RESEARCH-007** (TASK-673/675–687), y (b) el **Proposal Studio SHIPPED** (TASK-1392/1393/1391 + 1412/1413/1415, 2026-07-12→16): aggregate `Proposal` + Artifact Composer + render pipeline gobernado + versionado derivado de artefactos + superficie de portal para ver/descargar (`/admin/commercial/proposals`) + **motor de chapter-authors** (TASK-1415: autoría agéntica de láminas servicio-agnóstica, propose→confirm, flag OFF — `proposals/authoring/**`) — su manual de uso/evolución es el companion **`proposal-studio-runtime.md`**. Esta skill _alimenta y opera_ esos módulos; **no los reimplementa**. Si te piden construir/extender runtime, carga también `arch-architect` (overlay Greenhouse) y `greenhouse-backend`.

> 🏆 **Hito 2026-09-23 — primera licitación GANADA con el flujo agéntico de licitaciones.** La propuesta SKY Blog (Wherex) se construyó con el método de la skill `greenhouse-public-private-tenders` (bases → admisibilidad → diagnóstico → oferta) y se compuso con el **Artifact Composer**: deck desde catálogo, oferta técnica y económica y Excel generados desde fuente versionada, y evidencia viva (AI Visibility Grader y Radiografía AEO). La operó el operador junto a un agente. La adjudicación **no se atribuye sólo al flujo**: pesaron la relación existente con SKY, las reuniones de ronda 2, la negociación humana y el ajuste económico por alcance. Pero es la **primera validación en el mercado** de lo construido: una oferta producida con este flujo compitió contra ~15 propuestas y ganó, y lo hizo en una **cuenta de talla enterprise** (SKY Airline, aerolínea), no en un piloto menor.

## Cuándo invocar

- Descubrir/filtrar oportunidades de compra pública o privada (radar comercial).
- Calificar una solicitud pública de proveedor y preparar su abordaje según fecha, estado y rol →
  `prospect-intent-segmentation.md`; la operación de cohortes/segmentos pertenece a `hubspot-as-a-service`.
- Decidir si Efeonce participa: screening + **bid/no-bid con margen sobre loaded cost**.
- Leer/entender bases (administrativas, técnicas, económicas), plazos, criterios y garantías.
- Preparar el paquete de oferta (técnica + económica + administrativa) y su matriz de cumplimiento.
- Cotizar, dimensionar garantías y evaluar cashflow/factoring del pago estatal.
- Presentar, responder foro de aclaraciones, seguir evaluación, y gestionar adjudicación/impugnación.
- Mapear un portal LATAM nuevo o un RFP corporativo privado.
- Buscar y analizar **licitaciones públicas** en LicitaLAB con la CLI `pnpm licitalab` (search → opportunity →
  documents → ask-docs; receta 0 de `licitalab-mcp.md`) → `licitalab-mcp.md` y `licitalab-radar-playwright.md`.
  LicitaLAB no es una fuente de RFP/RFQ privados.
- Consultar el estado rápido de bid, CRM y postulación →
  `docs/commercial/tenders/LICITATION_CRM_REGISTER.md`; es un índice operativo, no una fuente de verdad.
- Para otro RFP de una cuenta ya registrada, cargar `crm-portfolio-operating-model.md` → «Nuevo proceso de una cuenta ya registrada»: Deal por proceso, contactos reutilizados con autoridad explícita y handoff trazable.
- Para una licitación ya promovida a Deal, consultar también `docs/commercial/CRM_DEAL_REGISTER.md`, la vista
  transversal de negocios activos.
- Revisar Wherex mediante la CLI Playwright protegida, leyendo ficha y adjuntos antes de clasificar el fit → `wherex-radar-chrome-playwright.md`.

**Cuándo NO:** decisiones legales definitivas (esta skill orienta y cita norma; **la validación legal la hace un humano**); construir el schema/ingesta del módulo (eso es `arch-architect` + `greenhouse-backend` sobre RESEARCH-007).

## Árbol de decisión — qué companion cargar

```
¿En qué estás?
├─ Arrancar un deal (workspace/carpeta canónica: bases/research/ofertas/deck/manifiesto)  `pnpm tender:new <slug>` → TENDER_WORKSPACE_TEMPLATE.md
├─ Construir la propuesta COMPLETA end-to-end (director de orquesta) . bid-construction-playbook.md
├─ Marco legal / norma / inhabilidades / recursos (Chile) ...... chile-publico-marco-legal.md
├─ Cómo opera ChileCompra: modalidades, códigos, bases,
│  criterios, garantías, plazos, apertura, adjudicación ......... chile-publico-operativo.md
├─ Decidir participar / priorizar / scoring bid-no-bid ......... bid-lifecycle-go-no-go.md
├─ Precio, garantías (boleta/póliza), cashflow, factoring ...... pricing-garantias-finance.md
├─ Armar la oferta técnica/económica/administrativa ............ propuesta-tecnica-economica.md
├─ Plataformas, contacto, originales, OneDrive y anexos ........ platform-bids-and-administrative-package.md
├─ Oferta económica urgente de licitación, HTML→PDF A4 ........ docs/commercial/templates/cotizacion-a4/README.md
├─ Producir el DECK de la propuesta: catálogo de plantillas,
│  molde visual, selector, 3D icons, fotos del equipo ......... deck-visual-system.md
├─ Otro país LATAM (portal, registro, umbrales) ............... latam-portales-matriz.md
├─ Tender privado: proceso RFI/RFP/RFQ, evaluación,
│  negociación/BAFO, cómo ganar (vendor-side) ................. privado-rfp-lifecycle.md
├─ Tender privado: plataformas (Ariba/Coupa/Fieldglass),
│  sectores (minería/energía/retail/banca) y precalificación .. privado-plataformas-sectores.md
├─ Admisibilidad, probidad, conflicto de interés, sanciones ... compliance-riesgo-integridad.md
├─ API Mercado Público, POC, conexión al módulo, MCP .......... data-sources-apis.md
├─ MCP LicitaLAB público: OAuth, tools, límites y recetas ..... licitalab-mcp.md
├─ Radar público LicitaLAB: Playwright → MCP → HubSpot ....... licitalab-radar-playwright.md
├─ Estado rápido CRM/bid/postulación compartido .............. docs/commercial/tenders/LICITATION_CRM_REGISTER.md
├─ Vista transversal de deals activos ........................ docs/commercial/CRM_DEAL_REGISTER.md
├─ Promoción CRM común + priorización de cartera .............. crm-portfolio-operating-model.md
├─ Señal explícita/histórica, comprador y abordaje por cohorte .. prospect-intent-segmentation.md
├─ Radar Wherex con CLI Playwright protegida .................. wherex-radar-chrome-playwright.md
└─ OPERAR/EVOLUCIONAR el runtime SHIPPED (Proposal aggregate,
   render jobs, artifact-worker, agentes propose→confirm) ..... proposal-studio-runtime.md
```

Carga **solo** el/los companions relevantes a la etapa. No cargues los 9 de una.

### 🔴 La Radiografía AEO — la muestra de trabajo que ya existe (no la reinventes)

En una licitación de contenidos **todas las ofertas dicen lo mismo** ("optimizamos para SEO y AEO") y **ninguna lo muestra**. Ya tenemos la herramienta que cierra esa distancia: escribe un artículo **real** para el cliente y lo **abre en canal** en cuatro pantallas (el hueco · el artículo · la capa de máquina acoplada · dónde más vive). Live: `think.efeoncepro.com/muestras/<slug>-<token>` (primer caso: SKY, Wherex 2026).

**Es una CAPACIDAD con dos trabajos, no un anexo del bid:** _(1)_ **educar** al cliente/prospecto que no entiende qué significa "aparecer en ChatGPT" —sirve **sin venta en curso**— y _(2)_ **habilitar la venta** (enlace + lámina de deck + demo en vivo + prueba verificable por el comité).

- **Un cliente nuevo NO requiere código:** el cliente es un **payload** JSON. Cero componentes.
- **Runtime en el repo `efeonce-think`**, NO en `greenhouse-eo`.
- **En el deck va por ENLACE, no por captura** (el catálogo del composer no tiene plantilla para capturas de UI, y la pieza es **interactiva**: un PNG estático mata justo lo que demuestra). Ver la lámina `muestra` (`contentType: highlight`) del deck de SKY.
- 🔴 **NUNCA** dejar que la muestra cite **nuestra propia oferta** ni narre su interfaz: **se defiende sola** (invariante 12c + assert 34b).
- 🔴 **Gate humano:** el operador elige el ángulo del artículo. El agente no lo elige.
- 🔴 **CERO cifras sin fuente googleable.** Auditoría 2026-07-14: **de las 6 cifras que la pieza
  exhibía, 3 no resistían una verificación** — y una tenía un **nombre de estudio que no existe**. En
  una licitación, el evaluador **va a buscar la fuente**: si no la encuentra, **se cae todo lo demás**.
  El schema ahora rompe el build ante cualquier cifra sin `source`+`asOf`. ⚠️ Y **una prevalencia no es
  un lift** (ver `seo-aeo` → `ANTIPATTERNS`).
- 🔴 **Pásale `axe` antes de mandarla.** El fallo de accesibilidad va a aparecer **en la línea que
  prueba el cumplimiento** (el crédito de foto —que demuestra el requisito de «imagen con licencia
  verificable»— daba 3,3:1). En una agencia que vende rigor, eso no es un bug: es el titular.
- ⚠️ **Si invitas al comité a verificar el schema, mándalo a `validator.schema.org` — NUNCA al Rich
  Results Test de Google.** Ese reportaría el `FAQPage` como _«no elegible para resultado
  enriquecido»_, que es exactamente el autogol que la pieza evita (Google restringió esa cajita en
  2023 a gobierno y salud), **con el evaluador de testigo**.

**Antes de tocarla, cargar:** `docs/think/radiografia-aeo-architecture.md` (los invariantes) + `docs/think/radiografia-aeo-manual.md` (cómo se crea la del siguiente cliente). Encuadre comercial: `docs/documentation/comercial/radiografia-aeo-muestra-de-trabajo.md`.

## Reglas duras (hard rules)

1. **Nada de norma/umbral/plazo/monto como verdad eterna.** El derecho de compras cambia (Chile: **Ley 21.634/2023** modernizó la 19.886; Compra Ágil pasó de 30 a **100 UTM**; LATAM reforma seguido). Cita la fuente y su año, y recomienda verificar la versión vigente antes de actuar. Si no puedes verificar, dilo explícito.
2. **Admisibilidad primero.** Antes de invertir horas en la oferta, corre el checklist de requisitos excluyentes + inhabilidades (`compliance-riesgo-integridad.md`). El error #1 que deja a Efeonce fuera es un anexo/declaración jurada faltante o una garantía mal constituida — no el precio.
3. **Nunca un GO sin margen proyectado sobre loaded cost.** Alinea con el ASaaS Manifesto (`commercial-expert` overlay: "nunca SOW sin loaded cost + margen"). Un score de fit alto con margen negativo es un NO-BID.
4. **No identidades paralelas.** La oportunidad extiende el modelo canónico 360: `public_opportunity → deal → quote → SOW → delivery`. El comprador público mapea a `organization/account`. Ver `data-sources-apis.md` + `arch-architect`.
5. **Señales no canónicas ≠ servicios.** Los hits de medios/PR/influencers/staff-aug que aún no son servicio canónico del catálogo se guardan como `signals`, **nunca** dentro de `servicios_matched` (hallazgo TASK-673).
6. **Human-in-control en la presentación.** La skill/agente **prepara** el paquete; **nunca** envía una oferta ni firma sin confirmación humana explícita. No almacenar credenciales ni cookies de los portales, salvo los runners locales autorizados expresamente de Wherex y LicitaLAB: `.auth/` ignorado, `0600`, perfil aislado y sin exponer valores.
   Una autorización específica vigente no se solicita otra vez: aplicar su alcance y comprobar hechos antes
   de insertar firma. Carpeta, originales, anexos y criterio general de contacto por plataforma:
   `platform-bids-and-administrative-package.md`.
   **Frontera LicitaLAB: sólo discovery público.** Toda oportunidad obtenida desde su UI o MCP se clasifica como
   `public_tender`/`public_opportunity`, su comprador es un organismo público y su evidencia debe contrastarse con
   las bases y la fuente oficial de contratación. Nunca uses LicitaLAB para inferir cobertura de RFP/RFQ privados,
   nunca marques una oportunidad LicitaLAB como `private_rfp` y nunca mezcles su radar con Wherex, Ariba, Coupa u
   otro canal privado. LicitaLAB puede exponer distintas modalidades y países; eso no cambia su naturaleza pública.
   La promoción a HubSpot es un upsert human-gated, no un create ciego: deduplica por ID normalizado + llave de
   idempotencia, reutiliza la Company canónica, conserva por separado plazo de postulación y cierre comercial,
   asocia sólo contactos reales y relee propiedades/asociaciones. En `pipeline_bucket`, la relación con la cuenta
   manda: cliente existente → `Core Pipeline`; negocio nuevo con `modalidad_de_venta='Licitación'` →
   `Strategic Bets`. Compra Ágil nueva permanece `policy_required` hasta decisión del operador.
7. **Evidence-first.** Toda clasificación (fit, monto, plazo, riesgo) cita el campo/documento que la sustenta (nombre vs bases técnicas vs items). Nombre pesa menos que bases técnicas.
   Antes de responder dónde está una licitación, lee `docs/commercial/tenders/LICITATION_CRM_REGISTER.md` y
   confirma el estado vivo en HubSpot/LicitaLAB o la fuente oficial. Tras presentar, aplicar evidencia, preservación del paquete y conciliación CRM del companion `platform-bids-and-administrative-package.md` (§Después de presentar); no repetir el envío. Después de cualquier cambio de bid, CRM,
   plazo, postulación o resultado, actualiza el registro; nunca lo trates como source of truth.
   Si ya existe un Deal HubSpot, sincroniza también `docs/commercial/CRM_DEAL_REGISTER.md` usando el mismo
   `deal_id`; una oportunidad todavía en radar no entra al registro comercial general.
   La revisión amplia cubre todas las categorías pedidas y el universo `all`, no sólo recomendadas; no descartar
   licencias Claude/OpenAI por etiqueta. El análisis autorizado no requiere otra selección previa.
   7 bis. **Fit, petición y vigencia son datos distintos.** Una contratación histórica, un cargo público o un
   correo enriquecido no prueban compra abierta, autoridad ni permiso para enviar. Conserva fecha de señal,
   fecha de verificación, plazo y estado por separado; no conviertas una petición CRM/Zoho/SEO/IA en demanda
   HubSpot/AEO/GEO sin evidencia expresa. Para preparar personalización, delimita primero la cohorte autorizada
   y después usa atributos; coordina una sola entrada por cuenta y entrega dudas/limitaciones al operador.
   Método: `prospect-intent-segmentation.md`.
8. **es-CL neutro, tuteo.** Sin voseo ni modismos rioplatenses. Copy visible pasa por `copywriting` / `greenhouse-ux-writing`.
9. **Creative Studio se cotiza por capas, no por una falsa tarifa por pieza.** Si el bid incluye producción generativa, separa acceso/gobernanza, capacidad humana, Studio Credits, implementación/IP y derechos/licencias/pass-through. El precio total exigido por las bases puede consolidarse hacia afuera, pero la hoja económica interna conserva las cinco líneas y su margen.

10. **El deal vive en un workspace canónico (el "DSR interno").** Arráncalo con `pnpm tender:new <slug>`: carpeta con `bases/` (RFP) · `research/` (investigación 🔒) · `oferta-tecnica.md` (fuente + ledger de evidencia) · `deck-plan.json` · `artifact-manifest.json` (piezas vivas por enlace) · `anexos/` · `*-INTERNO`. El discriminador que manda es **audiencia**: `research/` + `*-INTERNO` **nunca** cruzan al cliente. Las fuentes son archivos git (NO `proposal_assets`); el aggregate `Proposal` referencia la carpeta por `proposal_id`. Contrato: `docs/commercial/tenders/TENDER_WORKSPACE_TEMPLATE.md`.
    10 bis. **El PDF local no cierra el deal.** Todo workspace con deck debe conservar `proposal-studio.json` y pasar `pnpm tender:canonical-gate <slug>` con `status=verified`. El gate exige `proposalId`, render job gobernado completado, PDF/previews versionados en `proposal_assets` y verificación autenticada en Proposal Studio. `pnpm deck:compose` es taller/exploración; `.captures/` nunca es evidencia suficiente de cierre. El schema y la secuencia viven en `docs/commercial/tenders/PROPOSAL_STUDIO_CLOSURE_SCHEMA.md`.

### Reglas generales aprendidas para la propuesta y el deck

10. **Separa la fuente y gobernanza técnica/económica; no impongas separación física.** Según las bases y
    la etapa, el paquete puede ser técnico solo, económico solo, separado, combinado o mixto. Todo monto
    embebido deriva de la misma cotización aprobada; si existen artefactos independientes, cada uno conserva
    narrativa, `deck-plan`, output, manifest y capturas propios. Nunca reemplaces el deck de otra licitación
    ni mezcles sus assets.
11. **En el deck, usa `PricingFull` para presentar la inversión.** La lámina económica debe mostrar la opción
    recomendada, el desglose cotizado y las condiciones comerciales desde una cotización aprobada;
    no autorices una lámina libre que omita la estructura del catálogo. La oferta documental A4 independiente
    sigue su plantilla aprobada, descrita abajo; no se convierte en una lámina del deck.
12. **Declara siempre la base fiscal.** Cada monto client-facing debe indicar de forma visible si es
    neto y si el IVA está excluido o incluido. La propuesta económica y el deck deben decir lo mismo.
13. **Cuando aplique, presenta HubSpot CRM como beneficio incluido.** Especifica la configuración
    inicial obsequiada, sus límites y las licencias o módulos pagados que quedan a cargo del cliente;
    no lo confundas con una licencia ilimitada ni con una implementación enterprise.
14. **Cierra con revisión visual completa.** Después de componer, inspecciona todos los frames
    exportados de cada deck y verifica recortes, legibilidad, jerarquía, condiciones fiscales, assets
    y consistencia. Los tests técnicos no bastan para declarar la oferta lista.

### Oferta económica documental rápida para licitación

Ante una licitación o Compra Ágil urgente que requiere HTML para PDF, con **alcance, precio y condiciones ya aprobados para ese proceso**, usar la [plantilla A4 y su manual](../../../docs/commercial/templates/cotizacion-a4/README.md). Produce una oferta económica formal de cuatro páginas para incorporar al paquete de presentación; sólo el ejemplo carece de validez comercial. Su origen es la cotización UTEM aprobada, no una nueva modalidad de pricing.

Desde la raíz del repo, copiar el JSON de ejemplo al expediente, reemplazar todos los datos y generar en una carpeta nueva o vacía:

```sh
node scripts/documents/render-cotizacion-a4.mjs --data ruta/cotizacion.json --out ruta/cotizacion-v1
```

`status: draft` es preparación documental; no es un estado de quote persistida ni prueba falta de aprobación del precio. Los data slots y el JSON son datos del documento. El generador calcula neto/IVA/total, pero **no crea `quoteId`, valida costos/margen, aprueba el precio, ejecuta maker-checker, registra CRM/facturación ni envía la oferta**. Registrar por separado fuente y autoridad del alcance/precio y cada acción posterior. Revisar todos los folios del PDF final; conservar los bytes de documentos firmados o presentados.

Si el pedido es operar el **sistema de cotizaciones Greenhouse**, cargar [Cotizador](../../../docs/documentation/finance/cotizador.md) y [Pricing Comercial](../../../docs/documentation/finance/pricing-comercial.md) y el contrato de Quote Builder/catálogo/engine/snapshots/aprobaciones, verificando su disponibilidad real. No sustituir ese trabajo por este HTML ni tratar su manifiesto local como snapshot del sistema. Tampoco satisface el `quotation_id` ni el GO de Proposal Studio: no inventar IDs o margen para pasar esos gates. El deck y Proposal Studio conservan sus propios catálogos, identidades y gates; emitir este documento no cierra una Proposal ni exige recrear el paquete UTEM ya aprobado/presentado.

La plantilla documental tiene [soporte multimoneda](../../../docs/commercial/templates/cotizacion-a4/MULTIMONEDA.md): conservar moneda/precio base, usar snapshot FX explícito con par, fecha y fuente, y revisar el PDF convertido completo. Moneda de presentación e impuestos son independientes; no inferir tasas, exenciones ni soporte runtime de Finance/pricing desde el renderer.

Para entregar varias monedas, identificar cada HTML/PDF con su código ISO en el nombre y guardar ambas versiones en la carpeta del cliente autorizada, según el manual anterior. Conservar fuente, versionado y snapshot FX en el expediente; verificar las copias por hash. Una copia local no acredita sincronización remota, envío, cambio CRM ni aprobación.

## Sinergias — tabla de hand-off

Esta skill **decide y estructura**; delega el craft especializado. Declara siempre a quién pasas la posta:

| Necesitas…                                                        | Delega en                                                                         | Frontera                                                                                                                                        |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Estrategia de deal, pricing/packaging, ASaaS doctrine, ICP Globe  | `commercial-expert` (+ overlay Efeonce)                                           | Esta skill trae la oportunidad; commercial-expert decide el motion comercial                                                                    |
| Qué servicios puede ofertar Efeonce, matching de rubro/línea      | `efeonce-agency`                                                                  | El catálogo de servicios y las líneas de negocio (incluida Media & Distribution; Reach es product brand) son de agency; acá se usan para el fit |
| Redacción persuasiva de la propuesta                              | `copywriting`                                                                     | Esta skill define QUÉ va y la estructura; copywriting el CÓMO se escribe                                                                        |
| Garantías, costeo, cashflow, factoring, indexación UF/UTM, margen | `greenhouse-finance-accounting-operator`                                          | Loaded cost y tesorería son de finance; acá se consumen para el precio/garantía                                                                 |
| Creative Studio, Studio Credits y estimaciones por pieza          | `efeonce-agency` + `creative-practice` + `greenhouse-finance-accounting-operator` | El bid traduce el alcance; el modelo canónico define créditos y Finance aprueba equivalencias/margen                                            |
| Equipo, CVs, competencias para la oferta técnica                  | `greenhouse-talent-people-operator`                                               | El staffing/competencias es de talent; acá se ensamblan en el anexo técnico                                                                     |
| Convertir un "GO" en trabajo operable                             | `greenhouse-task-planner`                                                         | Un GO genera un capture plan/TASK-### con plazos y owners                                                                                       |
| Pipeline comercial y bid desk                                     | `hubspot-greenhouse-bridge` + `notion-platform`                                   | La oportunidad vive como deal (HubSpot) y como ficha de bid (Notion/módulo)                                                                     |
| Frontera del runtime (schema, ingesta, objeto canónico)           | `arch-architect` (overlay) + `greenhouse-backend`                                 | Esta skill NO diseña tablas; declara el contrato y delega                                                                                       |
| Rubro de servicios de marketing/SEO/AEO en la licitación          | `seo-aeo` / `digital-marketing`                                                   | Solo si la licitación pide esos servicios; para calibrar fit y propuesta técnica                                                                |

## Postura y estilo de salida

- **Opinada y accionable.** No listas académicas de opciones: recomienda la jugada, con el porqué.
- **Estructura por etapa.** Si el usuario está en discovery, no le des el manual de adjudicación; responde a su etapa y ofrece el siguiente paso.
- **Checklist antes que prosa** para admisibilidad, anexos y plazos (son binarios y load-bearing).
- **Cierra con el hand-off.** Termina indicando qué skill/owner toma la siguiente posta.

## Mapa de companions

| Archivo                             | Contenido                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bid-construction-playbook.md`      | **Método end-to-end (director de orquesta):** las 10 fases para construir una propuesta completa (intake→admisibilidad→bid/no-bid→contexto→alcance→squad→pricing→redacción→económica→export→presentación) + qué skill entra en cada fase + regla de documentación viva                                                                                                                                                                                                                                                                                                                                                                                                |
| `chile-publico-marco-legal.md`      | Ley 19.886 + reforma 21.634, Reglamento DS 250, DCCP/ChileCompra, inhabilidades art. 4, ChileProveedores, Contraloría/toma de razón, Tribunal de Contratación Pública, recursos                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `chile-publico-operativo.md`        | Modalidades y códigos (L1/LE/LP/LS, privadas, trato directo, Convenio Marco, Compra Ágil COT), bases admin+técnicas, criterios ponderados, foro, apertura, evaluación, adjudicación, garantías                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `bid-lifecycle-go-no-go.md`         | Pipeline canónico discovered→screened→triage→evaluate→plan-bid→submit→reconcile; scoring explicable (10 componentes) + decision bands; matcher hygiene (falsos positivos)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `pricing-garantias-finance.md`      | Costeo (cost-plus vs valor) sobre loaded cost, indexación UF/UTM, instrumentos de garantía y su costo/cashflow, plazos de pago del Estado, factoring                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `propuesta-tecnica-economica.md`    | Estructura de la oferta (técnica/económica/administrativa), matriz de cumplimiento, anexos y declaraciones juradas, armado del equipo/casos                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `deck-visual-system.md`             | **Sistema visual del deck:** el deck se **compone** desde un catálogo cerrado de **28 plantillas** (2026-07-14: +TeamGalleryFull — roster de fotos reales, resolver `squad-person` allowlist cerrada; enlaces `https://` clickeables en el PDF; agenda con páginas derivadas) (nunca freehand) + las 5 reglas del molde (degradado vibrante — **nunca navy plano** · tipografía sin Black/900 · safe-area · íconos Solar · glass milky) + el **selector determinista** (`registry.json`, 1 content-type → 1 plantilla) + **3D icons clay** (curar > generar; 3 filtros) + **guardrail de fotos del equipo** (fotos reales, **nunca caras IA**) + render HTML→Chromium |
| `latam-portales-matriz.md`          | Por país (CL, CO, PE, BR, MX, AR, PA, CR, EC, UY): portal, órgano rector, ley, registro de proveedor, particularidades, madurez de API                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `privado-rfp-lifecycle.md`          | Tenders corporativos vendor-side: RFI/RFP/RFQ y cuándo es cuál, sourcing events, evaluación por el comprador, shortlist, negociación/BAFO, reverse auction, cómo ganar, diferencias con lo público                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `privado-plataformas-sectores.md`   | E-procurement (SAP Ariba, Coupa, Jaggaer, GEP, Oracle, SAP Fieldglass/VMS), precalificación y registros (Achilles, SICEP, REPRO, TVEC privado), y playbooks por sector (minería, energía, retail, banca, telco, salud privada)                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `compliance-riesgo-integridad.md`   | Checklist de admisibilidad, inhabilidades, probidad/conflicto de interés, subcontratación, PI/confidencialidad, multas y sanciones                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `data-sources-apis.md`              | API Mercado Público v1 (ticket DCCP) + Compra Ágil v2 Beta, adjuntos WebForms, POC `scripts/research/mercadopublico-poc/`, conexión al módulo RESEARCH-007, MCP Legal Data Hunter, HubSpot/Notion                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `licitalab-mcp.md`                  | Conexión OAuth al MCP oficial de LicitaLAB para contratación pública, inventario live de tools, recetas read-only por oportunidad/proveedor/documentos, estados RAG y límites verificados; nunca usar como fuente privada                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `licitalab-radar-playwright.md`     | Discovery autenticado exclusivamente público en LicitaLAB con perfil Chrome aislado; códigos → análisis MCP evidence-first → promoción `public_tender` y HubSpot bajo confirmación humana y readback                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `crm-portfolio-operating-model.md`  | Contrato común LicitaLAB/Wherex para identidad, idempotencia, deadline separado de `closedate`, asociaciones, segundo readback tras automatizaciones, HOLD/NO-BID/Expirada y priorización de cartera en top bids, RFI livianos y gates                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `wherex-radar-chrome-playwright.md` | Radar privado de Wherex con `pnpm wherex:radar`: Chrome aislado en `.auth/`, estados Nueva + Editando, lectura de ficha y adjuntos, clasificación evidence-first y límite read-only; continuidad de adjuntos originales en OneDrive y empresa/deal/asociación verificados por MCP HubSpot                                                                                                                                                                                                                                                                                                                                                                             |
| `proposal-studio-runtime.md`        | **El runtime SHIPPED (TASK-1392/1393/1391 + 1415, 2026-07-12→16)**: cómo USAR el pipeline completo (Proposal → evidencia → manifest → render job gobernado → `artifact-worker` → PDF versionado en asset store → ver/descargar en el portal) y cómo EVOLUCIONARLO (costuras: catálogo nuevo, outputTarget, brand pack, fase agéntica con el molde propose→confirm→execute, **un chapter-author nuevo** — implementar la interface de `proposals/authoring/`, jamás tocarla —, failure codes, constraints del RFP) — lo primero que lee un agente nuevo que va a tocar el motor                                                                                        |

## Propuestas SEO/AEO desde discovery

Para una propuesta SEO/AEO con caso de negocio, cargar
[caso de negocio y propuesta](../seo-aeo/references/caso-negocio-y-propuesta.md): investigación interna,
requisitos frente a forecast, alcance costeado y dependencias explícitas. Aplicar los companions de bid
cuando existan bases; una propuesta directa no requiere inventar RFP, criterios o admisibilidad.

Si la propuesta técnica de una licitación SEO/AEO se lee **sin presentador** (comité, gerencia, compras), usar la
alternativa aprobada el 2026-10-07 (caso fuente: Pibank 2027) y pasar su checklist «Antes de entregar» antes de
enviarla: [propuesta-tecnica-seo-sin-presentador.md](../deck-studio/references/propuesta-tecnica-seo-sin-presentador.md).
No reemplaza al brochure ni a la propuesta compuesta con las recetas de La órbita.

## Costeo reproducible de una demanda con Cotizador V3

Si el operador pide una simulación local desde perfiles/alcance del expediente, cargar
[contrato operativo V3](../efeonce-pricing-operator/references/cotizador-v3-agent-workflow.md) y
[manual](../../../docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md).
El expediente aporta demanda, tareas, dedicación, países, plazo y supuestos explícitos; el catálogo versionado
aporta salario/provisiones/tools/factores/FX. No reemplazar costos centrales con totales del deck ni inventar cero
para faltantes. Mantener variantes/país del talento/mercado del cliente independientes. Seleccionar baseNotion/M365,
tools específicas y presupuesto IA por proveedor/mes; repartir plataforma por capacidad declarada con interno y
sin asignar separados. Plantilla o escenario Pibank no es rate card ni roster disponible.
Usar las versiones vigentes con `--current` (no nombrar catálogo/política a mano). El salario del catálogo es el
nivel objetivo del Excel de pricing, no la nómina actual: el margen real en personas es mayor que el simulado y no
se propone conectar payroll. Cotizar en la moneda que piden las bases (FX de política del CEO y redondeo por moneda;
nunca convertir a mano; en EUR aún no se emite). Precio y excepción bajo el piso los decide el CEO.

Quote congela inputs; explain es desglose interno y replay prueba reproducibilidad. `compose assess` conserva
gaps económicos/SOW/impuestos y preview redactado sigue simulación no vinculante. managed_service proyecta fee,
no vende por defecto las horas internas. Este carril no genera quotation_id remoto ni satisface GO de Proposal
Studio: emisión, precio aprobado, garantías/caja y presentación del expediente conservan contratos propios.
No adjuntar el artifact interno al cliente ni tratar exit3 como aprobación. Sólo promover al canon mediante
[handoff formal](../../../docs/documentation/finance/cotizador-v3-promocion-canonica.md).
