# EPIC-054 — Greenhouse: desacople por dominios de producto

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Épica registrada el 2026-10-12 tras aprobar el operador destinos y orden. 0 tasks hijas registradas, 0 cortes ejecutados, 0 repositorios o paquetes creados.`
- Rank: `TBD`
- Domain: `cross-domain`
- Owner: `Operador (destinos, orden y go de cada corte) · Platform / Architecture (contratos, cortes y medición)`
- Branch: `Greenhouse develop; checkout compartido; sin rama de épica ni worktrees`
- GitHub Issue: `none`
- Created: `2026-10-12`

Priority, Impact y Effort son inferencias de planificación; el operador no fijó prioridad relativa frente a otras
épicas. Registrar la épica no autoriza crear repositorios, paquetes ni deployables, ni mover código: cada corte tiene
su puerta en la task que lo entrega.

## Summary

Coordina la salida de cuatro dominios de Greenhouse hacia el producto al que pertenecen: el Design System Lab y la
composición de marca a AXIS, Growth y Search Visibility 360 a Marketing Studio, y Efeonce Insights a un dominio
propio. Greenhouse queda como portal cliente y backoffice de la agencia.

## Why This Epic Exists

Greenhouse nació como la plataforma operativa de la agencia y terminó hospedando todo lo que se construyó después.
Hoy existen productos con identidad propia y cada dominio encaja mejor donde están su usuario y su razón de ser. A
eso se suma un dolor concreto: el build y el paso a producción de Greenhouse llevan todos los dominios en un solo
tren.

No cabe en una task. Son cuatro cortes hacia tres destinos, cada uno con interfaz, API, procesos asíncronos, schema y
señales propias, y con dependencias entre sí: Insights consume Growth y el compositor, así que no puede salir antes
que ellos. `EPIC-027` ataca el costo de build con unidades dentro de un repositorio; esta épica coordina el cambio de
hogar de los dominios, que es otra cosa.

## Outcome

- Greenhouse ya no hospeda el design system ni el contenido de marca; un cambio de catálogo no pide build ni release
  del portal.
- Growth y Search Visibility 360 operan completos desde Marketing Studio, con sus tools MCP y scopes sin renombrar.
- Insights opera como dominio propio y consume Growth, ICO y el compositor por contrato, sin SQL cruzado.
- El motor del compositor es un paquete versionado con dueño, consumido por `artifact-worker` y por cada producto.
- Cada corte deja un número: build del portal antes y después, y la ruta de retorno que se probó.

## Architecture Alignment

- [`GREENHOUSE_PRODUCT_DOMAIN_DECOUPLING_DECISION_V1.md`](../../architecture/GREENHOUSE_PRODUCT_DOMAIN_DECOUPLING_DECISION_V1.md): decisión
  que esta épica ejecuta. Destinos, orden, reglas duras y lo que quedó sin decidir.
- [`GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md`](../../architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md):
  evidencia exigida por frontera (costo, routing/auth, rollback, ownership); su cláusula de un repositorio está
  enmendada.
- [`MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`](../../operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md):
  el trabajo nuevo sigue naciendo extraction-ready donde vive hoy su dominio.
- [`EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md`](../../architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md):
  AXIS como plataforma de paquetes versionados y Lab independiente.
- [`EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md`](../../architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md):
  destino de Growth y Search Visibility 360.
- [`EFEONCE_INSIGHTS_ARCHITECTURE_V1.md`](../../architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md): contrato de
  Insights que se conserva al salir.
- [`GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`](../../architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md) y
  [`EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`](../../architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md): los
  contratos entre productos son los mismos que ya consumen UI, CLI y MCP.

## Child Tasks

**Ninguna task hija registrada aún.** Los códigos D01–D10 son unidades de planificación locales a esta épica, no IDs
`TASK` ni trabajo iniciado. Se materializan con la plantilla y los addenda vigentes al preparar cada corte, declaran
esta épica y actualizan esta tabla con su ID real. No se reservan números por anticipado. Una unidad puede dividirse
si su discovery revela contratos independientes.

| Unidad | Entrega prevista | Perfil | Depende de | Evidencia de salida |
| --- | --- | --- | --- | --- |
| D01 | **Cierre del Design System Lab en Greenhouse**: retirar las 43 páginas y 15 rutas de `/design-system` a medida que el Lab de AXIS alcanza paridad, página por página; destino para lo que hoy depende de datos (vínculo superficie↔nodo de Figma) | standard / Platform + AXIS | `TASK-1590` (paridad ruta por ruta) | Build del portal medido antes y después; rutas viejas redirigen o responden con intención; ruta de retorno probada |
| D02 | **Compositor listo para extraerse**: cortar el ciclo con `brand-surfaces`, sacar del motor el test que importa de Insights y hacer que el motor reciba el catálogo como entrada | backend-data / Platform | — | Motor sin imports de dominio ni de catálogos concretos; gate visual a cero píxeles sin rebaseline |
| D03 | **Composición de marca a AXIS**: catálogos `graphic-line-*`, `deck-axis`, `brand-packs/axis`, `brand-surfaces`, Glitch y Manzanitas, con sus baselines visuales | standard / AXIS + Brand | D02 | Una pieza de marca se compone y se renderiza desde AXIS con el mismo resultado; Greenhouse ya no contiene esos catálogos |
| D04 | **Motor del compositor como paquete de AXIS**: versión exacta consumida por `artifact-worker` y por los consumidores que queden en Greenhouse | backend-data / Platform + AXIS | D02, D03 | Render real de propuesta e Insights con el paquete fijado; un bump y su reversión ensayados |
| D05 | **Growth y Search Visibility 360: inventario y contratos del corte**: superficies, rutas, crons, consumers reactivos, tools MCP, lecturas del portal cliente; decisión de ownership del schema y de dónde viven sus migraciones | backend-data / Platform + Growth | — | Inventario completo con dueño por pieza; decisión de migraciones registrada como ADR o delta; nada movido |
| D06 | **Runtime de Growth y Search Visibility 360 en Marketing Studio**: API, procesos asíncronos y ownership del schema | backend-data / Marketing Studio + Platform | D05 | Capturas y crons reales corriendo desde Studio; tools MCP con los mismos nombres y scopes; el portal cliente lee por API |
| D07 | **Interfaz de Growth y Search Visibility 360 en Marketing Studio y retiro en Greenhouse** | ui-ux / Marketing Studio | D06 | Flujos reales operados en Studio; rutas, flags y señales retirados de Greenhouse; build del portal medido antes y después |
| D08 | **Insights sin acoplamiento directo**: las 32 referencias SQL a `greenhouse_growth` y los imports de `src/lib/growth` pasan por readers o API del dueño; lo mismo para ICO | backend-data / Insights | D06 | Cero referencias al schema de Growth dentro de Insights; una edición real generada sobre los contratos nuevos |
| D09 | **Insights como dominio propio**: decisión de hospedaje y salida de API, entrega, recurrencia y catálogos `insights-*` | backend-data / Insights + Platform | D04, D08 | Una edición real emitida de punta a punta desde su nuevo hogar; retiro en Greenhouse; build medido antes y después |
| D10 | **Cierre del programa**: números por corte, routers de agentes, skills, ledger de flags y manuales al día | standard / Platform + Docs | D01–D09 | Todos los Exit Criteria con evidencia; `CLAUDE.md`, `AGENTS.md` y las skills de dominio apuntan al hogar real de cada cosa |

Dos hilos pueden avanzar en paralelo: D01–D04 (AXIS) y D05–D07 (Marketing Studio). D08 y D09 esperan a ambos.
D01 es el único que depende de trabajo ajeno ya en curso: su ritmo lo marca la paridad de `TASK-1590`, así que D02
puede empezar antes.

## Existing Related Work

- [`EPIC-027`](../in-progress/EPIC-027-greenhouse-build-cost-recovery-decomposition.md): costo de build y fronteras
  por excepción. Conserva la medición de costo y `TASK-1382`, que sigue sin sujeto formal; D01 aporta el número que
  esa task no pudo producir.
- [`EPIC-049`](../in-progress/EPIC-049-efeonce-marketing-studio-platform.md): Marketing Studio, destino de D06 y D07.
- [`EPIC-045`](../in-progress/EPIC-045-efeonce-insights-multiformat-intelligence.md): Insights sigue construyéndose
  aquí mientras tanto. Sus tasks no esperan a esta épica; lo nuevo nace sin SQL cruzado para no agrandar D08.
- [`EPIC-022`](../to-do/EPIC-022-growth-seo-search-visibility-360-module.md), `EPIC-034`, `EPIC-035` y `EPIC-040`:
  programas de Growth (SEO, promociones, runtime embebible, formularios) cuyo código entra en el inventario de D05.
- [`EPIC-052`](../to-do/EPIC-052-efeonce-rooms-sales-enablement-platform.md) y
  [`EPIC-053`](../in-progress/EPIC-053-quoter-v3-platform-promotion.md): Rooms y cotizador V3. Fuera de esta épica;
  Commercial quedó diferido.
- `TASK-1590` (`in-progress`): construye el Lab en el repositorio y el Vercel de AXIS. El Lab existe y está
  desplegado, pero **su paridad con `/design-system` está lejos de completa** y la task no autoriza retirar ni
  redirigir rutas de Greenhouse hasta tenerla, ruta por ruta. D01 empieza donde esa task entrega paridad; no la
  duplica ni la apura.
- `services/artifact-worker`: Cloud Run Job ya separado; se queda y pasa a consumir el paquete del motor.

## Exit Criteria

- [ ] `/design-system` ya no existe en Greenhouse y el build del portal quedó medido antes y después de retirarlo.
- [ ] Greenhouse no contiene catálogos de marca ni `brand-surfaces`; AXIS los compone y los renderiza.
- [ ] El motor del compositor se consume como paquete con versión exacta, con un bump y su reversión ensayados.
- [ ] Growth y Search Visibility 360 corren completos desde Marketing Studio: interfaz, API y procesos asíncronos.
- [ ] Las tools MCP de Growth conservan nombre y scope, verificadas por una sesión real contra producción.
- [ ] Insights no tiene referencias SQL a schemas ajenos y emitió una edición real desde su dominio propio.
- [ ] Cada dominio movido se llevó sus señales de reliability y su runbook; ninguno quedó sin dueño.
- [ ] Quedó decidido y documentado dónde viven las migraciones de un schema cuyo dueño no es Greenhouse.
- [ ] Ningún corte borró datos ni tablas.
- [ ] Routers de agentes y skills de dominio apuntan al hogar real de cada dominio.

## Non-goals

- Mover Commercial o la interfaz del cotizador V3: diferido por el operador.
- Tocar Knowledge o Hiring: se quedan en Greenhouse por decisión del operador.
- Dividir la instancia de PostgreSQL o mover datos entre bases.
- Decidir el destino de Nexa, Admin o los lanes de API Platform.
- Pausar producto mientras avanzan los cortes, o hacerlos en un solo movimiento.
- Construir Rooms o completar Marketing Studio: esos programas tienen su propia épica.
