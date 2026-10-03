# TASK-1971 — Home interna (equipo interno y admin) · Wireframe

## Meta

- Task: `TASK-1971` · Flow: `docs/ui/flows/TASK-1971-internal-home-ui-flow.md` · Motion: compartido en `docs/ui/motion/TASK-1969-portal-chrome-and-greeting-elio-motion.md`
- Dirección aprobada por el operador el 2026-10-02: artboard `Main.dc.html` («Home · Equipo interno (admin)») del canvas https://claude.ai/artifact/4Qbk74gjXBkBddx1fjQgQU.
- Programa: `TASK-1967` (hija F). Chrome, saludo y novedades vienen de `TASK-1969`; los datos de `TASK-1970`.
- Audiencias: `admin` e `internal` en `/home`. Modo de dirección: `source-led`. Targets: 1440 × 900 y 390 × 844.

## Desktop (≥ 1024 px)

```
┌ chrome + saludo (TASK-1969) ─────────────────────────────────────────────────────────────────────────┐
│ Performance del equipo  [Datos …]                                   [👥 Todo el equipo ▾]  Ver ICO     │
│ Métricas ICO · Octubre 2026 · todo el equipo                                                         │
│ ╭────────────────────────────────────────────────────────────────────────────────────────────────╮ │
│ │ OTD %   ✓ En meta │ FTR %  ⓘ Bajo la meta │ RPA    ✓ En meta │ CYCLE TIME  ✓ En meta           │ │
│ │ 92 %              │ 76 %                  │ 1,4              │ 4,2 d                           │ │
│ │ ▬▬▬▬▬▬▬▬▬|        │ ▬▬▬▬▬▬▬|  (rojo)      │ ▬▬▬▬|            │ ▬▬▬▬|                           │ │
│ │ Meta ≥ 90 % · …   │ Meta ≥ 80 % · …       │ Meta ≤ 1,5 · …   │ Meta ≤ 5 d · brief → entrega    │ │
│ ├────────────────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ THROUGHPUT   64 piezas entregadas      │  barras por semana (6) + línea de cycle time encima   │ │
│ │ Últimas 6 semanas · 10,7 por semana…    │  31 ago … Oct (semana actual en azul pleno)           │ │
│ │ ■ Piezas entregadas  — Cycle time       │  bajo cada barra: «5,1 d» …                           │ │
│ ├────────────────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ Piezas trabadas 3 · Utilización 84 % · rango equilibrado 35–85 % · Personas 18 · Fuente … hace │ │
│ ╰────────────────────────────────────────────────────────────────────────────────────────────────╯ │
│ ┌──────────── columna principal (flex 999) ────────────┐ ┌──── columna derecha (360) ────┐          │
│ │ Tu foco hoy                       2 acciones sugeridas│ │ Novedades (TASK-1969)          │          │
│ │ ◯60 %  [Crítico · sin fecha límite]                   │ │ foto 16:9 · línea · título…    │          │
│ │        Cierre Finanzas · Octubre 2026                 │ │ ━━ ── ──  (pestañas)           │          │
│ │        [Abrir cierre →] [Definir fecha límite]        │ ├────────────────────────────────┤          │
│ │ [✓ Aprobar 4 pendientes                     ›]        │ │ Capacidad del equipo [Datos…]  │          │
│ ├───────────────────────────────────────────────────────┤ │ 2 en carga alta · 1 con espacio│          │
│ │ Señales de tus clientes                  Ver todas   │ │ [Persona] Diseño      96 % ▬▬▬ │          │
│ │ (Todas 6)(AEO 2)(SEO 2)(Comercial 2)                  │ │ … banda 35–85 % sombreada      │          │
│ │ AEO [Cliente] · ACR … ↘ −n %  [Ver respuestas]        │ ├────────────────────────────────┤          │
│ │ SEO [Cliente] · PVR … ↗ +n    [Ver keywords]          │ │ Continúa donde lo dejaste      │          │
│ │ CRM [Cliente] · Renovación …   [Agendar]              │ │ [nombre real] · tipo · hace…   │          │
│ └───────────────────────────────────────────────────────┘ └────────────────────────────────┘          │
│ footer (TASK-1969)                                                                                     │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Performance del equipo**: una sola superficie (sin card-on-card) con cuatro KPIs, throughput y franja de contexto. Cada KPI: etiqueta, estado con ícono y palabra (En meta / Bajo la meta), cifra Bricolage 40/620 con `tabular-nums`, barra con marca de meta y línea «Meta … · significado». Bajo la meta, la barra es roja (`#b8232d`).
- **Throughput**: es el momento visual dominante de la página. dos paneles alineados en el mismo eje de semanas, sin doble eje: arriba barras de piezas por semana con su cifra (última semana completa en `#0375db`, anteriores al 30 %, semana en curso con borde punteado y relleno rayado porque es parcial); abajo, una franja propia «Cycle time · días» con línea, puntos y cifra bajo cada punto, escala propia (3,0–5,5 d) y la meta ≤ 5 d como línea punteada; el tramo hacia la semana en curso va punteado y su punto hueco. Etiquetas de semana por fecha de inicio (lunes) y «en curso» en la actual; tabla accesible con los datos en `sr-only`. El texto compara contra la última semana completa, nunca contra la parcial (corrección del operador 2026-10-03).
- **Filtro**: botón «👥 <alcance> ▾» abre un panel flotante (ver flow) con buscador, Equipos (Todo el equipo, Creativo, Contenido, Estrategia y SEO) y Por cliente; al pie «Período: Octubre 2026 · Cambiar período». La selección cambia el subtítulo y los datos de toda la sección.
- **Tu foco hoy**: anillo de avance (arco navy + esfera azul en la punta, cifra en el centro) para el cierre de período; chip de estado; dos acciones; fila de aprobaciones pendientes.
- **Señales de tus clientes**: tabs segmentados con conteo; filas con badge del tipo (AEO azul, SEO verde, CRM navy), cliente · métrica, detalle, tendencia con flecha y palabra, y acción directa.
- **Capacidad del equipo**: resumen, cinco personas con barra (alta ≥ 85 % roja, equilibrada 35–85 % verde, baja < 35 % azul), banda equilibrada sombreada, leyenda y «Ver equipo». Banda del código (decisión del operador 2026-10-02).
- **Continúa donde lo dejaste**: nombres reales resueltos en el servidor, avatar con `resolveAvatarUrl`, tiempo relativo.

## Mobile (< 760 px)

- Una columna: saludo → Performance (KPIs en 2 columnas, cifras 30 px; throughput apila texto arriba y gráfico abajo) → Tu foco hoy → Señales → Novedades → Capacidad → Continúa → footer.
- El filtro abre el mismo panel con ancho `calc(100vw - 32px)`.
- Tabs de señales con wrap; filas con la acción bajo el texto si no cabe.

## Regiones y datos

| Región | Bloque (`TASK-1970`) | Audiencia / capability |
|---|---|---|
| Performance del equipo | `team-performance` | admin, internal · capability de lectura ICO de agencia |
| Tu foco hoy | `focus-today` | admin, internal |
| Señales de tus clientes | `client-signals` | admin, internal · lectura comercial/growth |
| Novedades | `announcements` | todas |
| Capacidad del equipo | `team-capacity` | admin, internal |
| Continúa donde lo dejaste | `recents-rail` | admin, internal |

## Accesibilidad

- KPIs: el estado se comunica con palabra además del color; barras `aria-hidden`; anillo con `role="img"` y `aria-label` («Cierre Finanzas octubre 2026: 60 % de avance»); medidor de cierre con `role="meter"`.
- Gráfico: `figure` con `aria-label` y la tabla de datos accesible (semana, piezas, cycle time) en `sr-only`.
- Filtro: botón con `aria-haspopup="listbox"` y `aria-expanded`; opciones `role="option"` con `aria-selected`; Escape cierra y devuelve el foco.
- Tabs de señales: `role="tablist"`, `aria-selected`; filas como enlaces con texto completo.

## Implementation Mapping

- Ruta: `/home` (Home v2) con la variante de Homes por rol activa para `admin|internal`.
- Shell: Composition Shell con `header` = `GreenhouseGreetingHero` (`TASK-1969`), `regions.primary` = Performance + Tu foco + Señales, `regions.aside` = Novedades + Capacidad + Continúa.
- Componentes: `TeamPerformancePanel` (KPI tiles + `ThroughputChart` + franja), `ScopeFilterPopover` (sobre la Floating Surface canónica), `FocusTodayCard` (anillo + acciones), `ClientSignalsList` (tabs + filas), `TeamCapacityCard`, `RecentsRail` (existente, con nombres reales).
- Gráfico: ECharts vía `echarts-for-react` (barras + línea en eje propio), lazy-load por ruta; alternativa aceptada: composición CSS como en el canvas si el rendimiento lo exige.
- Copy: `src/lib/copy/home.ts` (etiquetas, estados, vacíos, aria) y glosario ICO para nombres de métricas.
- Datos: bloques de `TASK-1970` vía el snapshot; ningún fetch directo a dominios.

## GVC Scenario Plan

- Escenario: `scripts/frontend/scenarios/home-internal-role.scenario.ts`
- Ruta: `/home` con usuario agente admin y la flag encendida sólo para él.
- Viewports: 1440 × 900 y 390 × 844; `qualityProfile: premium`.
- Pasos: cargar → mark `internal-fold` → abrir filtro → mark `scope-popover` → elegir «Creativo» → mark `scope-creative` → tab «AEO» en señales → mark `signals-aeo` → scroll al aside → mark `aside`.
- `data-capture`: `home-team-performance`, `home-throughput`, `home-focus-today`, `home-client-signals`, `home-team-capacity`, `home-recents`.
- Assertions: subtítulo cambia con el alcance; ninguna cifra `suppressed` se muestra como número; scroll-width = viewport.

## Design Decision Log

- Performance del equipo en lugar del pulse (Reliability, Margen, Cierre, Pendientes): pedido del operador; Reliability pasa al footer.
- Throughput como momento visual dominante: el operador pidió ver «piezas entregadas por cycle time».
- Throughput en dos paneles y no en doble eje (2026-10-03): la primera versión superponía la línea de cycle time sobre las barras sin escala, exageraba la pendiente, desalineaba los puntos de las barras y contaba la semana en curso (parcial) como si fuera completa con una etiqueta «Oct» que se solapaba con la semana del 28 sep.
- Señales de clientes en lugar de «Tu día»: el operador dijo que Tu día no le aportaba y pidió señales AEO/SEO y acciones comerciales.
- Novedades + capacidad en la columna derecha: pedido del operador («publicidad como el login» primero, luego capacidad).
- Banda de capacidad del código (35–85 % equilibrada): decisión del operador del 2026-10-02.
