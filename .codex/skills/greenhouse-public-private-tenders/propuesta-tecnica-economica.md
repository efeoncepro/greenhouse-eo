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
(mismos slots → mismo PDF; firma bajo autorización humana específica). El `.md` es la fuente **narrativa + evidencia**;
el `deck-plan.json` es la fuente de **composición**. Comparten el ledger, pero son archivos
independientes y revisables por separado. El autor/agente construye el plan **desde** la
oferta (propose→confirm), eligiendo qué secciones se vuelven lámina y con qué `contentType`
(declara INTENCIÓN, nunca `template`). El mapa sección→contentType vive en la Zona 2 de la
plantilla; el catálogo de content-types, en `deck-visual-system.md`.

```
investigación (INTERNO) → oferta-tecnica.md (ledger + narrativa + mapa) → deck-plan.json (slots) → PDF
```

**Familia de tres, no un archivo:** la técnica es un sobre. La **económica** se costea con
`pricing-garantias-finance.md` y se emite con la plantilla A4 de Efeonce (el Excel sólo si las bases
exigen planilla; ver §Oferta económica); la **administrativa** con `compliance-riesgo-integridad.md`.
No las metas en el `.md` técnico.

## Handoff editorial en Markdown para Claude Design

Cuando el operador pide MD para diseñar después, ése es el entregable de esta etapa. Construir la
propuesta sustantiva antes del diseño: comprensión del negocio, argumento, alcance, entregables,
calendario, operación, perfiles, medición, inversión y condiciones, además de los anexos requeridos.
Un índice de láminas o un prompt genérico no reemplaza esa propuesta. Mantener la técnica, económica
y controles como fuentes revisables; un MD maestro puede reunir el relato dirigido al comprador sin
mezclar en él costos, márgenes, negociación ni investigación interna.

El procedimiento, nombres de artefactos y verificación viven en
[Construir una licitación](../../../docs/manual-de-uso/comercial/construir-una-licitacion.md).
La elección de MD no elimina requisitos de las bases: PDF/planilla, paginación, firmas y anexos se
resuelven al preparar la presentación formal. Las referencias a página se completan con páginas
reales después de diseñar; nunca se inventan para llenar la matriz. No activar Composer ni crear
una Proposal como condición de este handoff; tampoco marcar render, gate o presentación verificados.

Aplicar estos controles al contenido que recibe diseño:

- **Requisito, propuesta y pendiente distinguibles.** A cada obligación del RFP le corresponde su
  fuente exacta; cantidades, cadencias, formatos, límites y revisiones propuestos por Efeonce se
  rotulan como propuesta propia. Definir unidades y sumar fases/ciclos una sola vez. Una matriz vacía,
  lista oculta o ejemplo de una plantilla no agrega requisitos al proyecto.
- **Precio con estado y procedencia.** El monto preliminar proviene de la cotización congelada V3 y
  conserva moneda, base fiscal, alcance y condiciones coherentes en todos los MD. Su existencia no
  aprueba el precio ni confirma capacidad, impuestos, caja o GO. El procedimiento económico pertenece
  a `efeonce-pricing-operator`; la cotización interna no viaja al comprador.
- **Proyecto sin inventar.** Si faltan nombre, producto, ubicación, audiencia, presupuesto o fecha,
  mantener la dependencia y el mecanismo para resolverla. Proyectos públicos de la misma cuenta,
  ofertas históricas y contenidos de demostración no describen automáticamente la nueva licitación.
- **Fuentes y derechos antes de maquetar.** Claims con fuente y fecha; hipótesis identificadas y
  salvedades que cambian alcance visibles en el texto comercial. Logo original con procedencia y
  recursos autorizados; no fabricar renders del proyecto, equipo asignado, resultados ni casos.
  Las notas de diseño no pueden borrar límites, carácter preliminar o condiciones económicas.

Caso de aplicación: [Mattis GRD-1555](../../../docs/commercial/tenders/mattis-branding-marketing-inmobiliario-1555/README.md),
23/10/2026. Sus cantidades, precio y perfiles son un escenario de ese expediente, no un estándar ni
una tarifa para otros compradores.

## Oferta técnica — anatomía que puntúa

Modela cada sección **hacia el criterio ponderado que la evalúa** (lee primero la tabla de ponderaciones en `chile-publico-operativo.md`).

- **Comprensión del requerimiento** — demuestra que entendiste el problema del comprador, no que copiaste las bases. (Craft → `copywriting`.)
- **Metodología / enfoque** — cómo lo harás, por fases, con lógica. Concreto y verificable, no genérico.
- **Plan de trabajo y cronograma** — hitos, entregables, dependencias, holgura. Coherente con el plazo pedido.
- **Equipo** — perfiles con CV, rol, dedicación %, respaldos (títulos/certificados). El evaluador cruza el CV con el requisito. (Armado → `greenhouse-talent-people-operator`.)
- **Experiencia / casos** — trabajos similares con evidencia acreditable (certificados de buena ejecución, órdenes de compra previas). En público, la experiencia se **acredita**, no se afirma.
- **Valor diferencial** — por qué Efeonce y no el commodity: capacidades, resultados medibles, casos del sector. Aquí entra la narrativa (→ `copywriting`; para rubro marketing/SEO/AEO, calibra con `seo-aeo`/`digital-marketing`).
- **Cumplimiento de requisitos técnicos / SLA** — tabla explícita item por item, con las **palabras
  literales de la ficha** y la sección, lámina o anexo donde está cada cosa (operador, 12/10/2026). Un
  requisito que aparece en una respuesta del Centro de mensajes entra a esta tabla con su fecha; ver
  §Foro de aclaraciones.

## Oferta económica — el detalle que descalifica por forma

### Con qué se emite

**Primero, lo que mandan las bases.** Si exigen SU planilla o formato (a veces un Excel específico), se
usa ese: un precio correcto en formato equivocado puede ser inadmisible.

**Si no lo exigen y se está emitiendo el documento formal, la económica que ve el comprador se compone con la plantilla A4 de Efeonce.** Para el handoff MD previo al diseño, conservar el texto económico y su fuente V3 sin forzar ese render (véase «Handoff editorial»).

La plantilla formal resuelve la marca, portada, alcance, inversión y condiciones:

```sh
node scripts/documents/render-cotizacion-a4.mjs --data <caso>/cotizacion/cotizacion.json --out <caso>/cotizacion/<carpeta nueva>
```

- Manual y contrato de datos: `docs/commercial/templates/cotizacion-a4/README.md`. **Versión 2** cuando
  la oferta tiene varias líneas con precio; versión 1 para un único precio.
- Si el precio viene de una cotización congelada del Cotizador V3, los datos los emite
  `pnpm --silent pricing:v3 compose document` y no se digitan. Un precio aprobado por el operador fuera
  de V3 se digita en el JSON, con su fuente y su autoridad anotadas en el expediente (`SKILL.md`,
  §Oferta económica documental rápida).
- La carpeta de salida es nueva en cada versión. Se revisan todas las páginas del PDF y se registran
  `visualReview` y `pdfTextAndPageAudit` en el manifiesto. Trampas medidas en una oferta real (total
  «Por confirmar», unidades largas, totales que saltan de página): sección «Versión 2 en una oferta
  real» del manual.

**El Excel (`pnpm economica:build <caso>/economica.json`) no es la vía por defecto.** Se usa sólo cuando
las bases piden una planilla como documento integrante. Caso fuente, Sika 1164 (12/10/2026): el agente
armó la económica en Excel por el precedente de otra licitación y por el `economica.json` que trae el
expediente; el operador lo corrigió: «¿por qué lo generaste con eso si tenemos un render de Efeonce
armado que funciona bien y tiene todo de Efeonce?». El Excel se revirtió. La regla general que deja:
**antes de usar una herramienta por precedente, buscar la canónica de Efeonce**; que el scaffold
(`pnpm tender:new`) deje un `economica.json` no decide con qué se emite.

Cuando el Excel sí corresponde: se GENERA, no se mantiene a mano. `economica.json` es un input
transitorio del renderer local —no el SSOT— y se reconcilia contra la cotización y el paquete económico
congelado mientras no se genere desde `ProposalEconomicProjection`. Builder reusable:
`scripts/commercial/lib/economic-offer-xlsx.mjs` (banda navy + wordmark, paleta AXIS, zebra, bloque
Neto/IVA/Total, print A4). **Techo:** las fuentes no se embeben en `.xlsx`; la marca exacta vive en el
PDF. 🔴 NUNCA precio unitario por artículo (el schema del builder no tiene ese campo); va en la misma
dirección que la regla del desglose de abajo.

### Cómo se desglosa una oferta creativa

Regla del operador (12/10/2026, Sika 1164), después de ver ocho líneas, una por entregable: «más que
cotizar por pieza se cobra el refresh de marca, la conceptualización creativa y ahí luego entregables;
ahí se justifica más el monto».

- **Se desglosa por componente de valor, en este orden: evolución de marca → conceptualización →
  entregables.** No por pieza suelta. Por qué: el trabajo de marca y de concepto es lo que justifica
  el monto, y una tabla de piezas no lo muestra.
- Ejemplo del caso (mismo total, MXN 64.000 netos por lanzamiento tipo): *Estrategia y concepto* —
  evolución gráfica de la campaña 16.000 · conceptualización creativa y Master Graphic 14.000;
  *Entregables* — adaptaciones para redes (11 piezas) 11.000 · reel de hasta 30 s 14.000 · punto de
  venta e impresos (4 diseños) 9.000. Los entregables se agrupan por familia, con la cantidad en la
  columna de cantidad, sin valor unitario.
- **El reparto entre líneas es un supuesto, no un cálculo.** El cotizador entrega filas por rol, no
  por componente: quien reparte lo declara en el expediente y el operador lo valida antes de
  presentar. El total sí sale del costeo y de la decisión de precio.
- **Riesgo del componente de pago único.** Si la evolución de marca se presenta como un pago que
  ocurre una sola vez, los encargos siguientes quedan en el total menos esa línea. En el caso: 64.000
  − 16.000 = 48.000, bajo el piso de margen calculado para un lanzamiento (≈ 57.650). Antes de
  emitir, calcular el precio de la unidad repetida sin esa línea y compararlo con el piso; cómo se
  presenta (parte de cada encargo o pago único) lo decide el operador y se le avisa con ese número.
- **Si las bases exigen precio unitario o su propia estructura de ítems**, se llena lo que piden
  (`pricing-garantias-finance.md`); esta regla gobierna el desglose que Efeonce elige cuando el
  comprador sólo pide «desglose de costos».

### Lo que no se inventa

- **Forma de pago.** Si el comprador dijo que las condiciones se revisan después, el documento no
  propone plazos. En el caso el agente escribió «30 días» y hubo que cambiarlo por «se acuerdan al
  formalizar el servicio». Vale lo mismo para cuotas e hitos: sólo si las bases los fijan.
- **Lo que el comprador admite como opcional.** Un tarifario de piezas extraordinarias, admitido pero
  no exigido, no se añade por iniciativa propia: en el caso no se incluyó, en línea con la corrección
  del operador de quitar de la propuesta lo defensivo o lo que limita el alcance. Incluirlo es
  decisión del operador.
- **Tratamiento del impuesto y vigencia.** Declarar siempre la base fiscal, pero «IVA: No aplica» es
  una afirmación fiscal que decide Finance o el operador, no el agente; una vigencia propuesta por el
  agente se rotula como supuesto por confirmar.

### Coherencia con el portal y con las bases

- El **total del documento es el monto que se ingresa en el portal**, en la misma moneda y con la
  misma base fiscal. En Wherex el paso «Servicio licitado» puede traer un solo servicio con un monto
  total, selector de moneda y la leyenda «NO considera IVA»: el desglose vive entonces en el documento
  adjunto y debe sumar ese monto (`wherex-radar-chrome-playwright.md`).
- Respeta la **estructura de ítems** pedida (unitarios, totales, con/sin impuestos según lo indicado).
- Cuida **coherencia interna**: que sumas, subtotales e impuestos cuadren. Errores aritméticos dan pie a observaciones.
- Si hay **UF/UTM**, exprésalo como piden (ver indexación en `pricing-garantias-finance.md`).
- Firma/timbre según se exija.

### Cargos de terceros, línea única del portal y documento aparte (Gana GRD-1541, 20/10/2026)

Caso: programática para Gana / Grupo Réditos (Colombia), oferta conjunta Efeonce · Basis DSP, enviada en
Wherex el 20/10/2026. Expediente: `docs/commercial/tenders/gana-programatica-colombia-1541-2026/README.md`.

- **Cuando el RFP pide discriminar «honorarios, comisiones, costos tecnológicos»**, la línea de Efeonce se
  nombra «Fee de gestión Efeonce (honorarios)». Todos los cargos se presentan como contratados y facturados
  por Efeonce: en la lámina al cliente no va «según proveedor» ni «al costo sin recargo». Es un cambio de
  rótulo y presentación; los montos no se tocan.
- **Si el portal pide la «Propuesta económica» como documento aparte**, se genera un PDF de una página con la
  lámina económica del deck.
- **La línea única del portal no siempre puede llevar el total facturable.** Se ofertó sólo el fee mensual
  (COP 4.500.000) y el comentario de la línea declaró los demás cargos al costo: medios (COP 30 M/mes),
  plataforma DSP (5 %) e inventario premium (20 % por deal). Alternativas evaluadas y descartadas: el total
  facturable (quedaba sobre el presupuesto del comprador) y un «todo incluido» dentro del tope (contradecía
  la lámina económica). La elección es del operador; lo que no se transa es que portal, comentario y lámina
  digan lo mismo.

### RFP en Excel del comprador: llenar sólo lo del oferente

Si el comprador entrega un .xlsx de requisitos, se llena **sólo la hoja del oferente** (en el caso
«Requisitos técnicos»: Cumple con la lista CUMPLE/NO CUMPLE, página del PDF donde se acredita y
observación). Se edita el XML interno del .xlsx para conservar logo, comentarios y validaciones de datos:
openpyxl no estaba instalado y exceljs pierde partes del archivo. Se guarda como copia con el nombre del
oferente; el original del comprador no se toca. Cada «CUMPLE» apunta a una página real del PDF entregado
y entra a la matriz de cumplimiento.

## Oferta administrativa — anexos y declaraciones juradas

Los típicos (varían por bases — lee siempre):

- Identificación del oferente / representante legal + **poderes vigentes**.
- **Declaración jurada de inhabilidades** (que no estás afecto a art. 4 Ley 19.886, sin condenas 20.393, sin conflicto de interés).
- Declaración de no tener **deudas laborales/previsionales**.
- **Garantía de seriedad** con vigencia y monto correctos.
- Certificados: ChileProveedores hábil, antecedentes, a veces balances/estados financieros.
- Anexos de **experiencia** y **equipo** en el formato pedido.

**Errores fatales frecuentes:** declaración jurada sin firmar/vencida, poder desactualizado, garantía con vigencia corta, anexo en versión anterior tras una respuesta del foro que cambió las bases.

Completar, firmar con autorización específica, archivar en OneDrive y verificar Word/PDF sigue
`platform-bids-and-administrative-package.md`. Los datos confirmados viven en la ficha comercial enlazada
allí; no volver a preguntar hechos resueltos ni extrapolar declaraciones entre compradores.

## Foro de aclaraciones como arma de propuesta

- Usar el foro/canal de consultas cuando esté disponible y vigente. No exigir interlocutor ni contacto previo
  como gate automático de una licitación por plataforma. Sin canal, conservar la limitación y continuar con
  supuestos explícitos acordados; no inventar cláusulas ni declarar cumplimiento falso.
- Lee las **respuestas a preguntas de otros**: suelen cambiar las bases y revelar la intención del comprador.
  En Sika 1164 fueron respuestas a otros proveedores las que definieron qué cotizar (el «lanzamiento
  tipo» y «el desarrollo del Master Graphic»), que la muestra del reel podía ser storyboard o animatic,
  que para punto de venta sólo se pedía el diseño, que la volumetría era una referencia para comparar
  ofertas y que las condiciones de pago se revisarían con quienes avanzaran.
- Cuidado: cada respuesta puede volver **obsoleto un anexo** que ya tenías armado — re-corre la matriz de cumplimiento tras cada tanda de respuestas.
- **Relee la ficha y el Centro de mensajes completo antes de congelar cada documento, y otra vez antes
  de la económica.** No sólo las preguntas propias. En el mismo caso, la respuesta que pedía una
  propuesta de SLA por niveles de complejidad se leyó el 12/10, con el deck técnico ya cerrado: obligó a
  agregar una lámina y reexportar. Un requisito que nace en una respuesta entra a la matriz de cumplimiento
  con su fecha, igual que uno de las bases.
- **Una pregunta sin respuesta puede estar resuelta en la plataforma.** La de la moneda nunca se
  respondió por mensaje; el selector de moneda del paso donde se ingresa el precio ya la resolvía.
  Antes de dar un dato por pendiente, recorrer también los pasos de la oferta.

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
- [ ] Económica en el **formato exacto**, sumas cuadran, firmada. Sin planilla exigida: plantilla A4, no Excel.
- [ ] Total, moneda y base fiscal del documento **iguales a lo que se ingresa en el portal**.
- [ ] Desglose por **componente de valor**; reparto, impuesto, vigencia y forma de pago validados por el operador o rotulados como supuesto.
- [ ] Declaraciones juradas **firmadas y vigentes**; poderes al día.
- [ ] Garantía con **monto, tipo y vigencia** correctos, ya emitida.
- [ ] Re-corrí la matriz tras la **última respuesta del foro**, leyendo también las respuestas a otros proveedores.
- [ ] Copy visible pasó por `copywriting` / `greenhouse-ux-writing`.
- [ ] Presentación la ejecuta un **humano** con comprobante guardado (regla human-in-control).

## Hand-off

- Redacción persuasiva → `copywriting`; tono es-CL / tokenización → `greenhouse-ux-writing`.
- Equipo/CVs/competencias → `greenhouse-talent-people-operator`.
- Precio y su detalle → `pricing-garantias-finance.md`.
- Proceso privado y negociación → `privado-rfp-lifecycle.md`.
