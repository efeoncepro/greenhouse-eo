# TASK-1672 / Artefacto de auditoría técnica — informe compartible

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1672 — Growth SEO: artefacto de la auditoría técnica (web + print)`
- Product Design asset: sin PNG dedicado — dirección derivada del **artefacto hermano ya
  construido** (`src/components/growth/seo/report-artifact/`, TASK-1310: `ReportArtifactModel`
  + adaptadores `web/` y `print/`) y del artefacto AEO (`components/growth/ai-visibility/report-artifact/`).
  La dirección visual NO se inventa: se hereda del `ReportArtifactModel` que ya rige los dos informes del módulo.
- Visual direction mode: `repo-native-benchmark`
- Intended consumers: **dos audiencias, un documento**. (a) quien DECIDE y reenvía —cliente o
  AM— que necesita magnitud y urgencia; (b) quien EJECUTA —agencia técnica, seamos nosotros u
  otra— que necesita la lista completa y el orden.
- Copy source: `src/lib/copy/growth.ts` → `GH_GROWTH_SEO_AUDIT_REPORT` (nuevo) + reuso de
  `GH_GROWTH_SEO_AUDIT` (severidades, esfuerzo, fichas de los 34 checks) y
  `GH_GROWTH_SEO_AUDIT_ISSUES`.
- Primitive decision: `reuse` — `ReportArtifactModel` + el par `web/` `print/` de TASK-1310;
  `SeoHealthGauge` (`views/.../seo/shared/`) para la salud; `groupAuditIssues` para la
  priorización. `new` acotado: el adapter `modelFromSeoAuditReport` y las dos secciones propias
  (portada ejecutiva, hallazgos de sitio).
- UI ready target: `no`

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
controles. El primer fold es **la portada completa** — dominio, fecha del crawl, salud con su
alcance, y las tres prioridades. Si la portada no cabe en una plana, está mal hecha.

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

- Primary: **ninguna dentro del documento**. Es de lectura. Las acciones viven en la pantalla que
  lo genera (`Compartir informe`) y en el navegador (imprimir / guardar PDF).
- Secondary: en la variante web, un `Imprimir / guardar PDF` discreto en la cabecera, que
  desaparece en `?print=1`.
- Destructive: ninguna.
- Selection vs action: no hay selección. Un documento que invita a clickear enseña a leerlo mal.
- Pending / disabled: n/a — se renderiza con datos ya materializados.

## Visual Fidelity Mapping

| Source cue | Greenhouse token / primitive / recipe | Intent preserved | Literal value rejected |
|---|---|---|---|
| Informe cliente SEO (TASK-1310) | `ReportArtifactModel` + `web/` `print/` | Misma familia visual entre los informes del módulo | No se copia su composición: el lector técnico es otro |
| Gauge de salud del audit | `SeoHealthGauge` (`seo/shared/`) | Misma métrica, mismos umbrales que la pantalla | No se redibuja el arco ni se cambian los cortes |
| Severidad de la lista | `GreenhouseChip` + `SEVERITY_PRESENTATION` | Icono + palabra + color, nunca color solo | No se traduce a un semáforo impreso sin etiqueta |
| Banda proporcional de severidades | ancho proporcional al conteo (TASK-1309) | El reparto se ve, no se lee | No se importa el filtro: en un documento no hay interacción |

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Portada — identidad | Dominio auditado + **fecha del crawl** + marca Efeonce | cabecera del `ReportArtifactModel` | `run.captureDate`, `rootDomain`, SSOT de marca |
| 1 | Portada — salud | Puntaje + su **alcance** ("muestra de N páginas" si tocó el techo) + qué mide el puntaje | `SeoHealthGauge` + texto | `run.healthScore`, `run.crawledPages`, cap |
| 2 | Portada — las tres prioridades | Los 3 primeros grupos del orden canónico, una frase cada uno | lista corta | `groupAuditIssues(...)`.slice(0,3) |
| 3 | Hallazgos de sitio | `robots.txt` / JSON-LD / sitemap, **antes** de la lista: invalidan lo de abajo | bloque propio con estado verificado / no verificado | findings de alcance `site` (TASK-1670) |
| 4 | Reparto por severidad | Banda proporcional: cuánto hay de cada nivel | banda estática (sin filtro) | `totals` |
| 5 | Lista priorizada completa | Todos los grupos: severidad · nombre es-CL · páginas · esfuerzo | filas | `groupAuditIssues` |
| 6 | URLs por grupo | Por cada grupo, sus URLs afectadas con el detalle acotado | tabla (desktop) / lista (móvil) | `findings` por `issueType` |
| 7 | Procedencia | Qué es del proveedor, qué es estimación nuestra, qué es laboratorio, y el as-of | pie del documento | constantes + `captureDate` |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `growth.seo.auditReport.title` | 0 | Auditoría técnica del sitio | — | |
| `growth.seo.auditReport.domain` | 0 | {domain} | `{domain}` | |
| `growth.seo.auditReport.crawledAt` | 0 | Diagnóstico del {date} | `{date}` | **grande**: es lo que caduca |
| `growth.seo.auditReport.healthLabel` | 1 | Salud técnica | — | |
| `growth.seo.auditReport.healthScope` | 1 | Sobre una muestra de {n} páginas, no el sitio completo | `{n}` | sólo si el crawl tocó el techo |
| `growth.seo.auditReport.healthMeaning` | 1 | El puntaje pesa sobre todo lo que rompe la indexación. | — | reconcilia puntaje vs volumen |
| `growth.seo.auditReport.prioritiesTitle` | 2 | Por dónde empezar | — | |
| `growth.seo.auditReport.priorityLine` | 2 | {label}: {n} páginas · esfuerzo {effort} | `{label}`,`{n}`,`{effort}` | |
| `growth.seo.auditReport.siteTitle` | 3 | Hallazgos que afectan a todo el sitio | — | |
| `growth.seo.auditReport.siteIntro` | 3 | Estos condicionan todo lo demás: se revisan primero. | — | |
| `growth.seo.auditReport.siteUnverified` | 3 | No pudimos verificarlo | — | **nunca** "sin problemas" |
| `growth.seo.auditReport.siteUnverifiedWhy` | 3 | {reason} | `{reason}` | la razón viaja del probe |
| `growth.seo.auditReport.breakdownTitle` | 4 | Cómo se reparte | — | |
| `growth.seo.auditReport.issuesTitle` | 5 | Todo lo encontrado, en orden | — | |
| `growth.seo.auditReport.issuesOrder` | 5 | Primero lo crítico; dentro de cada nivel, lo que más mueve la aguja por lo que menos cuesta. | — | mismo criterio que la pantalla |
| `growth.seo.auditReport.urlsTitle` | 6 | Páginas afectadas | — | |
| `growth.seo.auditReport.urlsTruncated` | 6 | Mostramos {shown} de {total}. | `{shown}`,`{total}` | honestidad del techo de render |
| `growth.seo.auditReport.provenanceTitle` | 7 | Cómo leer estos datos | — | |
| `growth.seo.auditReport.provenanceScore` | 7 | El puntaje de salud lo calcula nuestro proveedor de datos con su propia ponderación; el conteo de hallazgos sale de nuestro catálogo. No miden lo mismo. | — | 🔴 sin esto nos citan mal |
| `growth.seo.auditReport.provenanceEffort` | 7 | El esfuerzo es una estimación nuestra, no una medición. | — | |
| `growth.seo.auditReport.provenanceLab` | 7 | Las métricas de carga son de laboratorio; la señal que usan los buscadores viene de datos de campo. | — | |
| `growth.seo.auditReport.provenanceAsOf` | 7 | Diagnóstico del {date}. Un sitio cambia: si pasaron semanas, conviene repetirlo. | `{date}` | |
| `growth.seo.auditReport.print` | 0 | Imprimir / guardar PDF | — | sólo variante web |

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
- Chart/table alternatives: el gauge lleva `role="img"` + `aria-label` con el puntaje, y el
  número va **también** como texto. La banda proporcional lleva su conteo en texto por segmento:
  el ancho es refuerzo, nunca el único portador del dato.
- Aria labels: la banda es un grupo con nombre; los segmentos **no** son interactivos en el
  documento (a diferencia de la pantalla) y por lo tanto no llevan `aria-pressed`.
- Focus notes: documento de lectura — el único elemento focusable de la variante web es
  `Imprimir / guardar PDF`. En `?print=1` no hay ninguno.
- Color-independent state labels: severidad = icono + **palabra** + color; el estado "no
  verificado" es texto, nunca un ícono gris solo. El documento tiene que funcionar impreso en
  blanco y negro, que es como termina en la mitad de las reuniones.

## Implementation Mapping

- Route / surface: `/admin/growth/seo/audit/report` (operador) y la entrada cliente
  `[coordinar con TASK-1310: ruta hermana de /growth/seo/report vs acceso desde su dashboard]`.
  Ambas con `?print=1` para la variante imprimible, igual que 1310.
- Primitives: `ReportArtifactModel` + adaptadores `web/` `print/`; `SeoHealthGauge`;
  `GreenhouseChip` (severidad).
- Variants / kinds: `variant: 'clientPortal' | 'attachment'` — **el mismo contrato de
  `modelFromSeoReport`**. La audiencia la resuelve el entitlement, no una copia del documento.
- Component candidates: `src/components/growth/seo/audit-report/{model,web,print}.ts(x)`,
  espejando la carpeta que 1310 ya creó para el informe de visibilidad.
- Copy source: `GH_GROWTH_SEO_AUDIT_REPORT` (nuevo) + reuso de `GH_GROWTH_SEO_AUDIT`.
- Data reader / command: `readSiteAuditReport(targetId)` (TASK-1304) — **sin reader nuevo**.
  La priorización se reusa de `groupAuditIssues` (TASK-1309); los hallazgos de sitio llegan por
  TASK-1670.
- API parity: el documento es un render del reader canónico. Nada que Nexa o MCP no puedan pedir.
- Access / capability: operador `growth.seo.observation.read`; cliente
  `growth.seo.report.read_client` scope `own` (el mismo gate que 1310).
- Runtime consumers: view runtime + render imprimible.
- Print/email/PDF: `?print=1` como 1310. El PDF se produce imprimiendo esa variante — **no** se
  mantiene un tercer render.
- 🔴 Client-safe por construcción: el documento **nunca** incluye `provider_cost_usd`, tier ni
  cupo del entitlement, `provider_task_id`, ni los ids de máquina de los checks (van con su
  nombre en español). Test de no-fuga, espejando el que 1310 ya tiene.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/growth-seo-audit-report.scenario.ts` +
  `growth-seo-audit-report-print.scenario.ts`.
- Route: `/admin/growth/seo/audit/report?space=<Berel>` y su `?print=1`.
- Viewports: desktop 1440×900 + 390×844.
- Required captures: portada, hallazgos de sitio, lista priorizada, URLs de un grupo, pie de
  procedencia, y la variante print.
- Required `data-capture` markers: `seo-audit-report-cover`, `seo-audit-report-site`,
  `seo-audit-report-issues`, `seo-audit-report-urls`, `seo-audit-report-provenance`.
- Assertions: `noLoginRedirect`, `noErrorBoundary`, portada visible, bloque de procedencia
  visible (es el que evita que nos citen mal), gauge `role=img`.
- Scroll-width checks: `scrollWidth==clientWidth` en desktop y 390px.
- Reduced-motion: el documento **no tiene motion**. No hay nada que degradar.

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
- Decision: PDF por `?print=1` + imprimir del navegador, **no** un tercer render. Why: 1310 ya
  probó ese camino; un render propio se desincroniza del web en la primera iteración.
- Reuse / extend / new: reuse casi total. Nuevo: el adapter `modelFromSeoAuditReport` y las dos
  secciones propias (portada, hallazgos de sitio).
- Open risk: el techo de URLs por grupo. En pantalla el drill corta en 200 con scroll interno;
  en un documento imprimible 200 URLs × varios grupos es un PDF enorme. Hay que declarar un
  techo propio del documento y decir cuántas se omitieron.

## Acceptance Checklist

- [ ] All visible strings are in the copy ledger.
- [ ] Dynamic values are named and bounded (`{domain}`, `{date}`, `{n}`, `{label}`, `{effort}`, `{reason}`).
- [ ] Partial/degraded states are explicit (crawl parcial, hallazgo no verificado, sitio limpio).
- [ ] No copy implies a guarantee when data is estimated/stale (bloque de procedencia + as-of).
- [ ] Charts have text alternatives (gauge con número en texto; banda con conteo por segmento).
- [ ] State and aria copy is ready for implementation.
- [ ] Implementation mapping names primitive, copy source, data contract and route/surface.
- [ ] GVC scenario plan is specific enough for `pnpm fe:capture`.
- [ ] Design decision log explains reuse/extend/new before JSX starts.
- [ ] Client-safe: test de no-fuga declarado (costo de proveedor, tier, cupo, ids de máquina).
