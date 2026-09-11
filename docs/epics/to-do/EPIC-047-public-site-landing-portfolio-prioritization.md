# EPIC-047 — Portafolio de landings del sitio público: orden de prioridad

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Status real: `Orden fijado 2026-09-11; 20 tasks reancladas desde EPIC-019; 3 cerradas el mismo día`
- Rank: `TBD`
- Domain: `commercial|marketing-ops|public-site|cross-domain`
- Owner: `Julio Reyes`
- Branch: `epic/EPIC-047-public-site-landing-portfolio`
- GitHub Issue: `none`

## Summary

Agrupa las landings del sitio público (`efeoncepro.com`) en un solo portafolio y fija **en qué orden se
ejecutan**. El orden vive en el campo `Rank` de cada task (`EPIC-047-01` … `EPIC-047-11`) y en la tabla de
`## Child Tasks`; ambos se mueven juntos.

Este epic ordena **qué superficie comercial se construye primero**. La infraestructura para gobernar el sitio
(bridge WordPress, manifest, publish pipeline, drift, attribution) sigue en
[EPIC-019](EPIC-019-public-website-landing-control-plane.md).

## Why This Epic Exists

Hasta el 2026-09-11 las landings colgaban de EPIC-019, cuyo programa es el **control plane técnico**, no el
portafolio comercial. Resultado: 20 tasks de landing con `Rank: TBD` (una con `32` global), prioridades `P1`/`P2`
sin desempate y ninguna fuente que dijera cuál sigue. Con muchas superficies y capacidad para pocas a la vez, el
orden es la decisión que faltaba.

## Criterio de priorización

Tres criterios, en este peso:

1. **Pull comercial vivo:** ¿la landing acompaña una cuenta ancla o un deal en curso? La expansión de cuentas
   (Motor 1, 70%) se vende en relación directa; la landing es material de venta, no el cierre. Fuente:
   `docs/context/08_estrategia-comercial.md`.
2. **Demanda real de búsqueda:** volumen y dificultad medidos (Semrush) en la task o su PDR.
3. **Costo de terminar:** lo publicado o casi terminado va primero; ya costó y todavía no rinde.

Una landing publicada que **daña** (URL duplicada indexable, promesa sin prueba) sube por encima de su criterio.

## Outcome

- Una sola fuente del orden de ejecución de las landings del sitio público.
- Ninguna URL de servicio compite consigo misma en el índice.
- Las decisiones del operador que bloquean varias landings a la vez quedan explícitas y con dueño.

## Architecture Alignment

- `docs/public-site/PRODUCT_ROADMAP.md` — secuencia narrativa del sitio (este epic es su orden ejecutable)
- `docs/public-site/decisions/` — PDR-004/005/006/008/010/011/013/021/022/023 (posicionamiento por landing)
- `docs/context/08_estrategia-comercial.md` — cuentas ancla y motores comerciales
- `docs/epics/to-do/EPIC-019-public-website-landing-control-plane.md` — control plane técnico
- `docs/architecture/agent-invariants/PUBLIC_SITE_KINSTA_ACCESS_AGENT_INVARIANTS.md`

## Child Tasks

### Orden de ejecución

| Rank | Task | Superficie | Estado al 2026-09-11 | Por qué este lugar | Qué la destraba |
| --- | --- | --- | --- | --- | --- |
| `01` | [TASK-1350](../../tasks/to-do/TASK-1350-landing-agencia-creativa.md) | Agencia Creativa | `/agencia-creativa-v2/` **y** `/agencia-creativa/` ambas `index, follow` con canonical propio | Dos URLs indexables compiten por el mismo término; creatividad es la línea del retainer base | Decidir URL final + 301 de la otra; dirección de arte del hero y motion |
| `02` | [TASK-1401](../../tasks/to-do/TASK-1401-landing-hubspot-precios.md) | HubSpot · Precios | Diseño | Única página del hub con demanda real (~1.500/mes en el bloque hispano); F1 de PDR-013 | — |
| `03` | [TASK-1352](../../tasks/to-do/TASK-1352-landing-hubspot-agentic-platform.md) | HubSpot · Pillar | Definición; landing no implementada | F1 de PDR-013 junto a Precios; cuentas CRM ancla (ANAM/Aguas Andinas, Réditos) | Dossiers VoC/CRO, SEO/AEO y claims/proof aprobados |
| `04` | [TASK-1403](../../tasks/to-do/TASK-1403-landing-hubspot-agentes.md) | HubSpot · Agentes | Diseño; bloqueo F0 parcialmente resuelto | La que más diferencia; su prueba es el caso ANAM | Confirmar que la aprobación ANAM (2026-07-17) cubre esta página; publicar sigue sin autorización |
| `05` | [TASK-1812](../../tasks/to-do/TASK-1812-salesforce-services-landing.md) | Salesforce | Oferta, wireframe, flow y motion listos | La práctica no tiene superficie pública; oportunidad SGS observada. **Sube a `02` si SGS está en pitch activo** | Readback de partnership/derechos, first fold, CTA binding |
| `06` | [TASK-1865](../../tasks/to-do/TASK-1865-landing-performance-marketing.md) | Performance Marketing | Diseño | Mejor demanda pura de las nuevas: 480–590/mes en Chile, KD 11–13, Efeonce no rankea; retira la legacy `242862` con 301 | Validar PDR-022 |
| `07` | [TASK-1860](../../tasks/to-do/TASK-1860-landing-trade-marketing-btl.md) | Trade Marketing & BTL | Diseño | ~880/mes, pero SERP informativo y laboral; el modificador comercial tiene ~10/mes | Validar PDR-021 |
| `08` | [TASK-1803](../../tasks/to-do/TASK-1803-landing-branding-studio-sistema-marca.md) | Branding Studio | Estrategia y contratos UI listos | La ruta de Réditos incluye branding, pero está bloqueada | CTA/Brand Diagnostic, casos y derechos, SEO/canonical |
| `09` | [TASK-1369](../../tasks/to-do/TASK-1369-about-us-identidad.md) | About Us | Diseño | Identidad y E-E-A-T, no captura | Bios reales del equipo + arte del hero |
| `10` | [TASK-1859](../../tasks/to-do/TASK-1859-landing-product-design-360.md) | Product Design 360 | Diseño | Publicación por fases atada al business model | Aprobación comercial del modelo |
| `11` | [TASK-1862](../../tasks/to-do/TASK-1862-landing-aso.md) | ASO | Diseño | ~20/mes; depende de la extensión Search & App Visibility, hoy `Proposed` | Validar PDR-023 + aprobar la extensión |

### Habilitador transversal

| Rank | Task | Superficie | Por qué importa | Qué la destraba |
| --- | --- | --- | --- | --- |
| `H1` | [TASK-1801](../../tasks/to-do/TASK-1801-contacto-multistakeholder-form-agenda.md) | Contacto | Es a donde llegan los CTA de todas las landings | Owners y SLA por motivo (decisión del operador) + rollout de TASK-1509/1510 |

### Artículos del hub HubSpot (fuera del ranking de landings)

Son posts del blog (`/hubspot/...`), no landings: decisión del operador 2026-09-11 y de sus propias tasks. Viven
aquí porque cierran el hub HubSpot de PDR-013, pero no compiten con las landings por prioridad.

| Rank | Task | Superficie | Cuándo |
| --- | --- | --- | --- |
| `A1` | [TASK-1402](../../tasks/to-do/TASK-1402-landing-hubspot-cuando-no-usar.md) | Artículo «Cuándo NO usar HubSpot» | Fase F2b de PDR-013: después de Precios y Pillar. Esfuerzo bajo y la pieza más citable del hub |
| `A2` | [TASK-1404](../../tasks/to-do/TASK-1404-landing-hubspot-vs-salesforce.md) | Artículo «HubSpot vs Salesforce» | Sin urgencia: menos de 100 búsquedas/mes en español |

### Cierre operativo en curso (fuera del ranking)

Ya están en ejecución; no compiten por prioridad, sólo tienen que cerrarse.

| Rank | Task | Superficie | Qué falta |
| --- | --- | --- | --- |
| `cierre` | [TASK-1345](../../tasks/in-progress/TASK-1345-desarrollo-sitios-web-landing.md) | Desarrollo de sitios web | Follow-ups de IA, formulario y ruta legacy |
| `cierre` | [TASK-1374](../../tasks/in-progress/TASK-1374-web-agentica-ebook-landing.md) | Ebook «El fin de la web» | Slice del formulario, bloqueado por TASK-1375 |
| `cierre` | [TASK-1387](../../tasks/in-progress/TASK-1387-surround-discovery-ebook-landing.md) | Ebook Surround Discovery | Smoke humano de envío, descarga, correo y `generate_lead` |

### Cerradas

| Task | Superficie | Cierre |
| --- | --- | --- |
| [TASK-1799](../../tasks/complete/TASK-1799-landing-content-marketing-content-ops-partner.md) | Content Marketing (`/servicio-marketing-de-contenidos/`) | 2026-09-11 por decisión del operador; publicada e indexable; 8 criterios de QA sin verificar registrados |
| [TASK-1358](../../tasks/complete/TASK-1358-landing-agencia.md) | Home | 2026-09-11 por decisión del operador; publicada e indexable; QA de editor/teclado y claims sin verificar |
| [TASK-1351](../../tasks/complete/TASK-1351-landing-redes-sociales.md) | Redes Sociales (`/servicios/redes-sociales/`) | 2026-09-11 por decisión del operador; publicada e indexable; follow-ups de HubSpot delivery, guía Think y auditoría |

## Decisiones del operador que desbloquean varias landings

- [ ] Validar el posicionamiento de PDR-021 (Trade Marketing), PDR-022 (Performance) y PDR-023 (ASO): los tres
      siguen en borrador pendiente de validación y ninguna de esas landings se construye antes.
- [ ] Definir owners y SLA por motivo de Contacto (TASK-1801).
- [ ] Elegir la URL final de Agencia Creativa y aprobar el 301 de la otra.
- [ ] Confirmar si la aprobación ANAM del 2026-07-17 cubre la página de Agentes (TASK-1403).
- [ ] Cerrar TASK-1322 como superseded: TASK-1369 la reemplazó el 2026-07-08 y sigue abierta en el backlog.

## Cómo se mantiene el orden

- Reordenar = editar esta tabla **y** el `Rank` de las tasks afectadas en el mismo commit.
- Este epic no sobrescribe `Priority`/`Impact` de las tasks: el desempate vive en `Rank`.
- Una landing nueva entra como child con `Rank` explícito; nunca con `TBD`.
- Al cerrar una landing, su fila pasa a `### Cerradas` y su `Rank` queda en `EPIC-047-cerrada`.
- Revisar el orden cuando cambie el estado de un deal que lo sostiene (Sky, SGS, Réditos en HubSpot), cuando
  Search Console muestre datos de una landing publicada o cuando se valide o descarte un PDR.

## Existing Related Work

- [EPIC-019](EPIC-019-public-website-landing-control-plane.md) — control plane técnico del sitio; conserva
  TASK-1802 (Content Hub `/blog`) y TASK-1326 (control plane Astro multi-repo).
- Landings cerradas antes de este epic: TASK-1343 (`/servicios/posicionamiento-seo`), TASK-1598 (Influencer
  Marketing, Creators & UGC).
- [EPIC-024](EPIC-024-hubspot-portal-grader.md) — HubSpot Portal Grader, el diagnóstico que remata el hub HubSpot.
- [EPIC-040](EPIC-040-growth-public-forms-engine.md) y TASK-1509/1510 — formularios y agenda nativa que usan los CTA.
- `docs/public-site/HUBSPOT_HUB_LANDINGS_SPEC.md` — SSOT de contenido del hub HubSpot.

## Exit Criteria

- [ ] Cada child task está `complete` o descartada explícitamente con razón.
- [ ] Ninguna URL de servicio queda duplicada e indexable (Agencia Creativa resuelta con 301).
- [ ] PDR-021, PDR-022 y PDR-023 validados o descartados antes de construir sus landings.
- [ ] Contacto recibe los CTA de las landings publicadas con owner y SLA definidos.
- [ ] `docs/public-site/PRODUCT_ROADMAP.md` refleja el orden de este epic.

## Non-goals

- Reemplazar EPIC-019 ni su control plane técnico.
- Autorizar publicaciones, cambios de indexación, redirects o escrituras en WordPress: cada una sigue su gate.
- Cambiar `Priority`, `Impact` o el alcance de las tasks hijas.
- Crear landings nuevas: una superficie nueva nace como task propia y entra acá con `Rank`.

## Delta 2026-09-11

Epic creado a pedido del operador para ordenar las landings pendientes. Las 20 tasks cambiaron `Epic: EPIC-019`
→ `EPIC-047` y recibieron `Rank`; TASK-1812 tenía `Rank: 32` (global).

El mismo día, por decisión del operador: se cerraron TASK-1799 (Content Marketing), TASK-1358 (Home) y TASK-1351
(Redes Sociales) porque están publicadas, y TASK-1402 salió del ranking de landings porque es un artículo. TASK-1404
recibió el mismo trato porque su propia task ya la había reclasificado como artículo («es un artículo, no una
landing — y lo forzó el dato»). El ranking se renumeró de 16 a 11 posiciones.

Verificado por HTTP el 2026-09-11 (`meta robots` + canonical de la respuesta pública):

- `/servicio-marketing-de-contenidos/`, `/` y `/servicios/redes-sociales/` responden `200` e `index, follow`.
- `/agencia-creativa-v2/` sirve `index, follow` con canonical propio, aunque TASK-1350 decía `noindex`.
- `/agencia-creativa/` (título «Agencia Creativa en LATAM») también sirve `index, follow` con canonical propio.

**No verificado:** si Google ya indexó ambas URLs de Agencia Creativa (sólo se leyó el HTML servido), el estado
actual de los deals de Sky, SGS y Réditos en HubSpot, ni tráfico en Search Console. El orden asume la estrategia
comercial Q2–Q3 2026 (última verificación 2026-06-09); si una de esas cuentas se enfrió, cambia el tramo 02–06.
