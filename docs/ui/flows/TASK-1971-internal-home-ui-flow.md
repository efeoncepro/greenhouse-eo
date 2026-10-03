# TASK-1971 — Home interna · Flow

## Meta

- Task: `TASK-1971` · Wireframe: `docs/ui/wireframes/TASK-1971-internal-home-ui.md`
- Fuente: artboard `Main.dc.html` del canvas aprobado (https://claude.ai/artifact/4Qbk74gjXBkBddx1fjQgQU), interacciones probadas en el canvas el 2026-10-02.
- Flow del saludo y la conversación con Nexa: `docs/ui/flows/TASK-1969-portal-chrome-and-greeting-elio-flow.md` (no se repite aquí).

## Nodos

| Nodo | Qué ve la persona |
|---|---|
| H0 Home | fold con Performance (Todo el equipo), Tu foco hoy, Señales (Todas) y columna derecha |
| H1 Filtro abierto | panel flotante bajo «👥 Todo el equipo ▾» con buscador, Equipos y Por cliente |
| H2 Alcance aplicado | Performance y su subtítulo con el equipo o cliente elegido |
| H3 Señales filtradas | lista de señales del tipo elegido (AEO, SEO o Comercial) |
| H4 Destino de dominio | ruta canónica de la acción elegida |

## Transiciones

- H0 → H1: clic en el botón de alcance. H1 → H0: Escape, clic fuera o volver a clicar el botón; el foco vuelve al botón.
- H1 → H2: elegir una opción; el panel se cierra, el botón muestra la selección y el subtítulo cambia («Métricas ICO · Octubre 2026 · equipo creativo»). La selección vive en el estado de la vista y en la URL (`?scope=team:creative` o `?scope=client:<id>`) para compartir y volver.
- H1 «Cambiar período» → selector de mes (mismo panel); el período también va a la URL (`?period=2026-10`).
- H0/H2 → H3: tab de señales; el conteo de cada tab no cambia con el filtro de Performance (son ejes distintos).
- H0/H2/H3 → H4 (enlaces):
  - KPI → `/agency` ICO con el mismo alcance.
  - «Ver ICO» → vista ICO de agencia.
  - «Abrir cierre» → cierre de período; «Definir fecha límite» → la misma vista con el foco en la fecha (acción gobernada por su dominio).
  - «Aprobar 4 pendientes» → bandeja de aprobaciones.
  - Acción de una señal → vista del cliente correspondiente (AEO, SEO o la cuenta/deal en el CRM interno).
  - Persona en Capacidad → ficha de la persona; «Ver equipo» → capacidad de agencia.
  - Reciente → su entidad.
- Ninguna acción escribe desde la Home: todas navegan a la ruta dueña o pasan por el loop de acción gobernada de Nexa.

## Fallbacks

- Bloque sin datos (`empty`): mensaje de vacío propio del bloque desde copy, sin cifras.
- Bloque degradado (`degraded`) o con métrica `suppressed`/`low_confidence`: la cifra se reemplaza por «Sin datos confiables» con la fecha `asOf`.
- Bloque caído (`unavailable`): el `fallback` del registro (ocultar o tarjeta de error sin detalle técnico).
- Alcance sin datos (equipo o cliente sin piezas en el período): Performance muestra el vacío y mantiene el filtro visible para cambiarlo.
