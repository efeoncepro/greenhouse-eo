# TASK-1672 / Edición Insights de auditoría técnica SEO

## Meta

- Status: `draft`
- Owner task: `TASK-1672 — Efeonce Insights: especialización de auditoría técnica SEO` (EPIC-045).
- Product Design asset: catálogos Insights A4/deck y web vigentes; adaptación técnica pendiente de mapping de slots/contrato y aprobación. No hay referencia específica de auditoría aprobada todavía.
- Visual direction mode: `repo-native-benchmark`
- Intended consumers: quien decide/reenvía y quien ejecuta; una edición con dos densidades.
- Copy source: `src/lib/copy/insights.ts` + vocabulario canónico de severidad/hallazgos SEO. Ledger de abajo es propuesta, no strings implementados.
- Primitive decision: `reuse` — contratos de evidencia/edición, catálogos `insights-report`/`insights-deck`, figuras y consumer Think existentes. `extend` sólo para slots técnicos que falten; sin ReportArtifactModel/rutas print paralelos.
- UI ready target: `no`
- Historical reference: [wireframe anterior íntegro](../../audits/insights/history/2026-10-04-seo-specialization/wireframe-TASK-1672-growth-seo-audit-report-artifact.md), superseded el 2026-10-04. El mapping vigente reemplaza las instrucciones de renderer SEO y `?print=1`.

## Brief

- Primary user: el lector del documento **fuera** de Greenhouse. La pantalla de auditoría ya
  resuelve al operador que explora; esto resuelve a quien lo recibe por correo tres semanas
  después, sin contexto y sin nosotros al lado.
- User moment: el cliente abre el informe, entiende que hay trabajo que hacer, y lo reenvía a
  su agencia. La agencia lo abre y decide por dónde empezar.
- Job to be done: convertir un diagnóstico que hoy muere en la pantalla en **algo que sale de
  la plataforma y sigue siendo verdadero**.
- Primary decision signal: **las tres cosas que atacar primero**, en la portada, en una frase
  cada una. Todo lo demás es respaldo de eso.
- Non-goals: no es un plan de ejecución ni una cotización (el *cómo* y el esfuerzo cotizado son
  el SOW); no reemplaza la pantalla operador; no es un editor.

## Desktop Target — 1440×1000

Documento de **lectura lineal**, no superficie exploratoria: sin filtros, sin drill, sin
controles. El A4 tiene **resumen de una página**; en web el primer fold destaca el resumen — dominio, fecha del crawl, salud con su
alcance, y las tres prioridades. El resumen no desborda la página A4; web respeta su superficie live existente.

La región dominante es la **fecha del crawl junto a la salud**, no la salud sola: un puntaje sin
fecha es la forma más fácil de que alguien nos cite mal en noviembre un diagnóstico de agosto.

Debajo del fold arranca el detalle, y su primer bloque son los **hallazgos de sitio**. Van antes
que la lista priorizada porque la invalidan: no tiene sentido discutir títulos si el `robots.txt`
tiene cerrado el sitio a los motores de respuesta.

## Mobile Target — 390×844

El documento **no cambia de estructura**, cambia de densidad — es un documento, no una app: el
orden de lectura es su contrato y reordenarlo en móvil rompería el reenvío ("mira la página 2").

La portada se apila: fecha → salud → las tres prioridades. La tabla de URLs de cada grupo pasa a
lista (una URL por fila con su detalle debajo), porque una tabla de dos columnas a 390px obliga a
scroll horizontal y el documento se lee de arriba abajo.

## Action Hierarchy

- Primary: leer el resumen y consultar detalle técnico en la edición Insights.
- Secondary: descarga/revisión/compartir actuales, con permisos; distribución especializada en TASK-1673.
- Destructive: retiro/revocar sólo en el consumer autorizado, nunca embebidos en el documento.
- Selection vs action: el contenido técnico no dispara un crawl ni una publicación.
- Pending / disabled: estados existentes de edición/render/emisión; no afirmar éxito sin outputs validados.

## Visual Fidelity Mapping

| Source cue | Token / primitive / recipe | Intent preserved | Literal value rejected |
|---|---|---|---|
| Insights A4/deck vigente | Catálogos y slots actuales | Misma edición/identidad y export validado | No copiar el renderer legacy SEO |
| Web Insights Think | InsightWebModelV1/proyección existente | Resumen y detalle responsive | No nueva ruta pública SEO |
| Salud y severidades SEO | Hechos/labels del reader dueño; representación Insights | Método, umbrales, severidad con texto | No scoring/gauge recalculado |
| Reparto por severidad | Familia elegible y alternativa textual | Conteos observados por alcance | No convertir hallazgo de sitio en una página |

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Portada — identidad | Dominio auditado + **fecha del crawl** + marca Efeonce | cover/summary de Insights | `run.captureDate`, `rootDomain`, SSOT de marca |
| 1 | Portada — salud | Puntaje + su **alcance** ("muestra de N páginas" si tocó el techo) + qué mide el puntaje | figura/card Insights + alcance textual | `run.healthScore`, `run.crawledPages`, cap |
| 2 | Portada — las tres prioridades | Los 3 primeros grupos del orden canónico, una frase cada uno | lista corta | `groupAuditIssues(...)`.slice(0,3) |
| 3 | Hallazgos de sitio | `robots.txt` / JSON-LD / sitemap, **antes** de la lista: invalidan lo de abajo | bloque propio con estado verificado / no verificado | findings de alcance `site` (TASK-1670) |
| 4 | Reparto por severidad | Banda proporcional: cuánto hay de cada nivel | banda estática (sin filtro) | `totals` |
| 5 | Lista priorizada completa | Todos los grupos: severidad · nombre es-CL · páginas · esfuerzo | filas | `groupAuditIssues` |
| 6 | URLs por grupo | Por cada grupo, sus URLs afectadas con el detalle acotado | tabla (desktop) / lista (móvil) | `findings` por `issueType` |
| 7 | Procedencia | Qué es del proveedor, qué es estimación nuestra, qué es laboratorio, y el as-of | pie del documento | evidence source/method/asOf + `captureDate` |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `insights.seoAudit.title` | 0 | Auditoría técnica del sitio | — | |
| `insights.seoAudit.domain` | 0 | {domain} | `{domain}` | |
| `insights.seoAudit.crawledAt` | 0 | Diagnóstico del {date} | `{date}` | **grande**: es lo que caduca |
| `insights.seoAudit.healthLabel` | 1 | Salud técnica | — | |
| `insights.seoAudit.healthScope` | 1 | Sobre una muestra de {n} páginas, no el sitio completo | `{n}` | sólo si el crawl tocó el techo |
| `insights.seoAudit.healthMeaning` | 1 | El puntaje pesa sobre todo lo que rompe la indexación. | — | reconcilia puntaje vs volumen |
| `insights.seoAudit.prioritiesTitle` | 2 | Por dónde empezar | — | |
| `insights.seoAudit.priorityLine` | 2 | {label}: {n} páginas · esfuerzo {effort} | `{label}`,`{n}`,`{effort}` | |
| `insights.seoAudit.siteTitle` | 3 | Hallazgos que afectan a todo el sitio | — | |
| `insights.seoAudit.siteIntro` | 3 | Estos condicionan todo lo demás: se revisan primero. | — | |
| `insights.seoAudit.siteUnverified` | 3 | No pudimos verificarlo | — | **nunca** "sin problemas" |
| `insights.seoAudit.siteUnverifiedWhy` | 3 | {reason} | `{reason}` | la razón viaja del probe |
| `insights.seoAudit.breakdownTitle` | 4 | Cómo se reparte | — | |
| `insights.seoAudit.issuesTitle` | 5 | Todo lo encontrado, en orden | — | |
| `insights.seoAudit.issuesOrder` | 5 | Primero lo crítico; dentro de cada nivel, lo que más mueve la aguja por lo que menos cuesta. | — | mismo criterio que la pantalla |
| `insights.seoAudit.urlsTitle` | 6 | Páginas afectadas | — | |
| `insights.seoAudit.urlsTruncated` | 6 | Mostramos {shown} de {total}. | `{shown}`,`{total}` | honestidad del techo de render |
| `insights.seoAudit.provenanceTitle` | 7 | Cómo leer estos datos | — | |
| `insights.seoAudit.provenanceScore` | 7 | El puntaje de salud lo calcula nuestro proveedor de datos con su propia ponderación; el conteo de hallazgos sale de nuestro catálogo. No miden lo mismo. | — | 🔴 sin esto nos citan mal |
| `insights.seoAudit.provenanceEffort` | 7 | El esfuerzo es una estimación nuestra, no una medición. | — | |
| `insights.seoAudit.provenanceLab` | 7 | Las métricas de carga son de laboratorio; la señal que usan los buscadores viene de datos de campo. | — | |
| `insights.seoAudit.provenanceAsOf` | 7 | Diagnóstico del {date}. Un sitio cambia: si pasaron semanas, conviene repetirlo. | `{date}` | |
| `insights.seoAudit.download` | consumer | Descargar informe | — | acción existente, según output/permiso |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | — | documento completo | — | default |
| sin auditoría | Todavía no hay diagnóstico | Aún no corrimos un crawl para {domain}. | — (el operador lo corre desde la pantalla) | el artefacto NO se genera; no existe documento vacío |
| crawl en curso | El diagnóstico se está generando | Estamos revisando {domain}. | — | no se emite un informe a medias |
| crawl parcial (`degraded`) | — | banner: "El crawl terminó parcialmente: esto describe lo que alcanzamos a revisar, no el sitio completo." | — | viaja EN el documento, no sólo en pantalla |
| sitio limpio | Sin hallazgos | El crawl terminó y no encontró problemas de los que revisamos. | — | buena noticia, no error |
| hallazgo de sitio no verificado | — | "No pudimos verificarlo: {reason}" | — | **jamás** se presenta como sano |
| sin acceso | — | 404/401 según superficie | — | el gate lo resuelve la ruta, no el documento |

## Accessibility Contract

- Heading order: `h1` título del informe → `h2` por región (Salud, Por dónde empezar, Hallazgos
  que afectan a todo el sitio, Cómo se reparte, Todo lo encontrado, Cómo leer estos datos) →
  `h3` por grupo de issue en la región 6.
- Chart/table alternatives: la figura lleva alternativa accesible y, donde aplique, `role="img"` + `aria-label` con el puntaje, y el
  número va **también** como texto. La banda proporcional lleva su conteo en texto por segmento:
  el ancho es refuerzo, nunca el único portador del dato.
- Aria labels: la banda es un grupo con nombre; los segmentos **no** son interactivos en el
  PDF y por lo tanto no llevan `aria-pressed`. En web se conservan los controles existentes de Insights.
- Focus notes: navegación y acciones del consumer Insights; orden de lectura/foco coherente y reduced motion existente. PDF estático sin controles propios.
- Color-independent state labels: severidad = icono + **palabra** + color; el estado "no
  verificado" es texto, nunca un ícono gris solo. El documento tiene que funcionar impreso en
  blanco y negro, que es como termina en la mitad de las reuniones.

## Implementation Mapping

- Route / surface: edición Insights en biblioteca/portal TASK-1849 y web Think actual; definir el entrypoint técnico en Discovery. No se crea `/admin/growth/seo/audit/report` ni un reader público SEO.
- Primitives: EvidenceFactV1/snapshot/plan/outputs/audiencia actuales, catálogos Insights y proyección web. El detalle técnico requiere mapping verificable antes de ready.
- Variants / kinds: audiencias `client`/`internal` y profundidad de Insights, no `variant` legacy ni documentos paralelos.
- Component candidates: adapters/editorial/render/catálogos actuales de Insights; extensión acotada de findings/URLs si faltan slots.
- Copy source: `src/lib/copy/insights.ts`, ledger propuesto `insights.seoAudit.*`.
- Data reader / command: `readSiteAuditReport(seoTargetId, auditRunId)`; binding exacto autorizado y sellado. Nunca reemplazar por latest una edición emitida. Taxonomía/prioridades del reader/grouping SEO.
- API parity: command/readers canónicos de Insights, con matriz actual de audiencia/carril; generar/leer no concede emitir/distribuir.
- Access / capability: módulo/capabilities/audiencia Insights más autorización del target/run SEO; compartir/enviar en 1673→1848.
- Runtime consumers: generación Insights Vercel/worker, render Artifact Worker y web Think existentes.
- Print/email/PDF: output `report_pdf` del motor existente; distribución 1848/1673. Sin `?print=1` ni PDF de navegador como requisito.
- Client-safe: no costos proveedor, tier/cupo, IDs proveedor/check internos. No-leak también en outputs/proyección; IDs de binding quedan en evidencia interna autorizada.

## GVC Scenario Plan

- Scenario file: especializado en los escenarios Insights existentes; path/route/markers finales pendientes de mapping implementable.
- Route: edición especializada autenticada y la misma edición en web Think con grant autorizado, sin tokens en capturas/logs.
- Viewports: desktop 1440×900 + 390×844.
- Required captures: resumen con fecha/alcance, hallazgos de sitio, grupos/URLs, procedencia, estados sin auditoría/partial/no verificado. PDF A4 final en color y gris.
- Proposed `data-capture` markers: `insights-seo-audit-summary`, `insights-seo-audit-site`, `insights-seo-audit-issues`, `insights-seo-audit-urls`, `insights-seo-audit-provenance`; fijar reales en Discovery.
- Assertions: no error boundary, fecha y procedencia visibles, severidades textuales y alternativa de figura, mismo run/versión en todas las salidas.
- Scroll-width checks: sin overflow horizontal desktop/390; URLs partidas sin cambiar evidencia.
- Reduced-motion: fallback del consumer Insights; PDF estático.
- Readiness: pendiente; esta guía no certifica superficie construida ni mapping final de catálogo.

## Design Decision Log

- Decision: **un documento con dos densidades**, no dos documentos. Alternatives: uno ejecutivo
  y otro técnico (rechazado — se desincronizan, y el reenvío obliga a elegir cuál mandar). Why:
  se reenvía entero y cada lector encuentra su parte.
- Decision: **los hallazgos de sitio van antes que la lista priorizada**. Why: la invalidan. Un
  `robots.txt` cerrado a los motores de respuesta vuelve irrelevante la discusión de títulos.
- Decision: **la fecha del crawl es región de portada, no metadato al pie**. Why: el documento se
  lee semanas después; sin fecha visible es una cita futura equivocada con nuestro nombre.
- Decision: **el bloque de procedencia es obligatorio**, no opcional. Why: en pantalla esas notas
  son contexto; en un PDF reenviado son lo único que impide que alguien atribuya a nuestro juicio
  lo que es medición del proveedor, o a medición lo que es estimación nuestra.
- Decision: **sin interacción**. Alternatives: llevar el filtro por severidad al documento
  (rechazado — un documento que invita a clickear enseña a leerlo mal, y el PDF no clickea).
- Decision: la estructura **no se reordena en móvil**, sólo cambia densidad. Why: el orden de
  lectura es el contrato del documento; reordenarlo rompe "mira la segunda sección".
- Decision: reutilizar outputs A4/deck y web de Insights. La decisión anterior de imprimir `?print=1` queda superseded; no otro renderer ni snapshot.
- Reuse / extend / new: reuse del motor y catálogos; extend sólo semántica/evidencia/slots técnicos, sin biblioteca ni distribución paralelas.
- Open risk: el techo de URLs por grupo. En pantalla el drill corta en 200 con scroll interno;
  en un documento imprimible 200 URLs × varios grupos es un PDF enorme. Hay que declarar un
  techo propio del documento y decir cuántas se omitieron.

## Acceptance Checklist

- [ ] All visible strings are in the copy ledger.
- [ ] Dynamic values are named and bounded (`{domain}`, `{date}`, `{n}`, `{label}`, `{effort}`, `{reason}`).
- [ ] Partial/degraded states are explicit (crawl parcial, hallazgo no verificado, sitio limpio).
- [ ] No copy implies a guarantee when data is estimated/stale (bloque de procedencia + as-of).
- [ ] Charts have text alternatives (cifra en texto; reparto con conteo por segmento).
- [ ] State and aria copy is ready for implementation.
- [ ] Implementation mapping names primitive, copy source, data contract and route/surface.
- [ ] GVC scenario plan is specific enough for `pnpm fe:capture`.
- [ ] Design decision log explains reuse/extend/new before JSX starts.
- [ ] Client-safe: test de no-fuga declarado (costo de proveedor, tier, cupo, ids de máquina).
