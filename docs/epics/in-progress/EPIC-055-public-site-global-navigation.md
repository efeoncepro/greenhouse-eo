# EPIC-055 — Navegación global del sitio público, portable entre sitios

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Status real: `En curso. TASK-2040 completa (AXIS v0.7.7, 2026-10-22). TASK-2041: slices 1 a 3 construidos y probados en local, y 51 fotos subidas y verificadas en el bucket; faltan deploy del plugin, apply en vivo y la pantalla del admin. TASK-2042 sin empezar. WordPress sin cambios`
- Rank: `TBD`
- Domain: `cross-domain`
- Owner: `Operador (alcance, piloto y go a todo el sitio) · Sitio público / WordPress (plugin y adaptador) · AXIS (contrato y primitive)`
- Branch: `Greenhouse develop; checkout compartido; sin rama de épica ni worktrees. El código vive en efeonce-public-site-runtime y axis-design-system, cada uno con su propio contrato de rama.`
- GitHub Issue: `none`
- Created: `2026-10-18`

Priority, Impact y Effort son inferencias de planificación. Registrar la épica no autoriza mutar WordPress, publicar
AXIS ni subir fotos: cada paso tiene su puerta en la task que lo entrega.

## Summary

Lleva a producción la nueva navegación de `efeoncepro.com` diseñada y aprobada en el canvas «Mega menú efeoncepro.com»:

- Una cápsula de vidrio con mega menús de Soluciones y Recursos y un desplegable de Nosotros.
- Una hamburguesa que abre un onepage a pantalla completa.
- Una cabecera que se oculta al bajar y vuelve fija al subir.
- Variantes de tableta y teléfono.
- El agendador nativo en «Agenda tu diagnóstico».

Se construye para que Think u otro sitio la use después sin rehacerla: el mecanismo vive en AXIS, el contenido en un
solo documento que editan personas y agentes, y cada sitio tiene un adaptador delgado.

## Why This Epic Exists

El trabajo cruza tres sistemas con contratos de rama y de despliegue distintos:

| Sistema | Qué recibe | Cómo se entrega |
|---|---|---|
| AXIS (`axis-design-system`) | Contrato y primitive | Release de paquete |
| Runtime del sitio (`efeonce-public-site-runtime`) | Plugin y adaptador | Release acotado por SSH a Kinsta |
| Bucket público de AXIS en GCP | Fotos | Subida con credenciales de GCP |

Además, cambia una regla vigente del sitio: conservar el encabezado de Ohio. Una sola task mezclaría tres releases con
riesgos distintos; seis se pierden. La épica los ordena en **tres tasks robustas**:

1. El mecanismo.
2. El contenido.
3. La puesta en el sitio.

Cada una absorbe lo que surja dentro de su frontera, en vez de abrir tasks nuevas.

## Outcome

- `efeoncepro.com` muestra la navegación nueva en todas sus páginas, con el encabezado de Ohio apagado y recuperable en
  un paso.
- El menú se edita desde el admin de WordPress y por comandos para agentes, sobre un solo documento con historial y vuelta
  atrás.
- Cualquier sitio nuevo (Think primero) puede usar el mismo menú con un adaptador delgado y su propia superficie de
  agendador.

## Architecture Alignment

- `docs/architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md` (arquitectura de este programa)
- `docs/public-site/decisions/PDR-027-navegacion-global-del-sitio-portable.md` (decisión)
- `docs/public-site/decisions/PDR-024-axis-en-el-sitio-publico-composicion-agentica.md` (AXIS en WordPress)
- `docs/public-site/decisions/PDR-026-cada-landing-deriva-su-patron-de-diseno.md` (mecanismos, no estéticas)
- `docs/architecture/public-site/PRIMITIVES.md` (precedente `EfeonceMention`)
- `docs/architecture/GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md` (agendador)
- `docs/architecture/agent-invariants/PUBLIC_SITE_KINSTA_ACCESS_AGENT_INVARIANTS.md` (acceso y despliegue)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` (admin y agentes sobre el mismo command)

## Child Tasks

Orden de ejecución: `TASK-2040` y `TASK-2041` pueden avanzar en paralelo hasta el punto en que el plugin necesita el
esquema del contrato. `TASK-2042` depende de ambas.

- `TASK-2040` — **Mecanismo.**
  - Contrato `efeonce.site-nav` con el esquema `site-nav.v1`.
  - Primitive en `@efeoncepro/axis-ui-primitives`: render de servidor, CSS con la receta de vidrio en tokens y JS
    liviano.
  - Página del Lab y release del paquete.
  - Cubre cabecera, megas, desplegable, onepage, tableta, teléfono, teclado, foco, movimiento reducido y medición.
  - **Estado 2026-10-22: completa.** Publicada en AXIS v0.7.7: `axis-tokens` 0.6.8, `axis-ui-contracts` 0.7.7,
    `axis-ui-registry` 0.7.4 y `axis-ui-primitives` 0.7.0, con la instalación privada verificada. `TASK-2041` fija el
    esquema de esa versión (sha256 `10a6a55…`).
- `TASK-2041` — **Contenido.**
  - Plugin «EO Navegación»: documento validado, revisiones, admin, WP-CLI `wp eo-nav` y REST pública.
  - Resolución de los datos dinámicos de Recursos.
  - Fotos al bucket de AXIS en `site-nav/v1/`, coordinadas con quien esté tocando AXIS.
  - Carga del documento inicial con el contenido aprobado del canvas.
  - **Estado 2026-10-22:** slices 1 a 3 en local (runtime, sin push). Fotos subidas y verificadas en `site-nav/v1/`.
    Faltan el deploy del plugin, el `apply` en vivo y el diseño del admin.
- `TASK-2042` — **Puesta en el sitio.**
  - Adaptador de encabezado en `ohio-child`, con interruptor `off`/`pilot`/`on`.
  - Inventario y resolución de las variantes de encabezado de Ohio.
  - Superficie del agendador para el encabezado global y piel compartida del diálogo.
  - Eventos de medición.
  - Piloto en una página y después todo el sitio.
  - Actualización de la doctrina de navegación y de la documentación funcional y el manual.

- `TASK-2043` — **Dock inferior de las landings** (agregada 2026-10-23).
  - Primitive `efeonce.landing-dock` en AXIS con el vidrio de la isla del menú, esquema `landing-dock.v1` y Lab.
  - Módulo único del dock en el plugin de landings, con el agendador nativo (`cta-location="landing_dock"`).
  - Migración de los siete docks (Redes Sociales, Influencers, Inicio, SEO, Inbound, HubSpot y Performance), con
    snapshot y vuelta atrás por página.
  - No cabe en las tres hijas: es cromo de las landings, no del encabezado; la aprobó el operador en el canvas v80.
  - **Estado 2026-10-23: completa.** AXIS v0.7.12–v0.7.14 (primitives 0.7.14) y plugin `eo-landing-dock` en vivo;
    las siete landings usan el dock, cada una aprobada en vivo por la sesión de fidelidad.

**Regla de la épica:** lo que aparezca durante el trabajo entra como slice o criterio en la task cuya frontera toca. Una
task nueva sólo se crea si el trabajo no cabe en ninguna de las tres.

## Existing Related Work

- Canvas «Mega menú efeoncepro.com»: [claude.ai/artifact/FiyK4Uqrt8vqnSMw6qvgMj](https://claude.ai/artifact/FiyK4Uqrt8vqnSMw6qvgMj) (versión 67).
- Fotos del menú producidas el 2026-10-18 en `ai-generations/2026-10-18_menu-sitio/` (fichas, compuestas y `web/`).
- `EfeonceMention` (contrato `efeonce.mention`): primer mecanismo portable del sitio.
- Agendador elegante de `/agencia-inbound-marketing/` (`scripts/public-website/inbound-source/page.css`): piel que
  `TASK-2042` sube a primitive compartida.
- `TASK-1510`: agendador nativo portable, dueño del agendador, no del menú.
- `EPIC-035`: Efeonce Embed Runtime, distribución de Forms, CTAs y Meetings.
- `EPIC-047`: portafolio de landings; sus landings heredan el encabezado nuevo.
- `efeonce-web/src/lib/nav.ts`: menú escrito a mano en el sitio Astro antiguo. No es fuente; queda como referencia
  histórica.

## Exit Criteria

- [ ] El contrato `efeonce.site-nav` y su primitive están publicados en AXIS con versión fijada y página en el Lab.
- [ ] El plugin guarda el menú como un documento `site-nav.v1` validado, con revisiones, admin, WP-CLI y REST pública
  de sólo lectura.
- [ ] Las fotos del menú se sirven desde `site-nav/v1/` del bucket de AXIS, con caché inmutable y texto alternativo en
  cada una.
- [ ] `efeoncepro.com` sirve la navegación nueva en todo el sitio con el interruptor en `on`. Volver a `off` devuelve el
  encabezado de Ohio, verificado al menos una vez.
- [ ] «Agenda tu diagnóstico» abre el agendador nativo desde la cabecera, el mega y el onepage, y devuelve el foco al
  cerrar.
- [ ] Los eventos de medición llegan a GA4 sin PII.
- [ ] La doctrina `native-navigation.md`, la documentación funcional y el manual del sitio reflejan el nuevo modelo.

## Non-goals

- Migrar el sitio a Astro o introducir React en el sitio público.
- Rediseñar el pie de página.
- Cambiar el contenido de las páginas o landings.
- El adaptador de Think: queda como follow-up de esta épica y se crea cuando el operador lo pida.
- Cloud CDN con dominio propio para las fotos; se evalúa sólo si aparece una necesidad medida.
- Integración Greenhouse/MCP para editar el menú: la puerta WP-CLI ya da paridad a los agentes; la herramienta MCP es
  follow-up.

## Follow-ups

- Adaptador Think: envoltura Astro que lee la copia pública y monta su propio agendador. Requiere la superficie de
  Growth CTA de Think.
- Publicar también la copia pública en el bucket de AXIS (PDR-027, punto abierto 3).

## Open Questions

- ~~Alcance en todo el sitio y piloto primero~~: decididos por el operador el 2026-10-18 (PDR-027, Accepted).
- Pendientes de contenido de la nota «Por confirmar» del canvas:
  - Orden de servicios por línea.
  - Respuestas por línea.
  - URL de YouTube.
  - Títulos de lecturas.
  - Lectura propia de Influencer y Performance.

  Se resuelven dentro de `TASK-2041` al cargar el documento inicial.
