# TASK-1972 — Home de colaboradores (Mi Greenhouse en `/my`) · Wireframe

## Meta

- Task: `TASK-1972` · Flow: compartido en `docs/ui/flows/TASK-1969-portal-chrome-and-greeting-elio-flow.md` · Motion: compartido en `docs/ui/motion/TASK-1969-portal-chrome-and-greeting-elio-motion.md`
- Dirección aprobada por el operador el 2026-10-02: artboard `Colaborador.dc.html` («Home · Colaboradores») del canvas https://claude.ai/artifact/4Qbk74gjXBkBddx1fjQgQU.
- Ruta: `/my` (decisión del operador: la Home de colaboradores sigue donde está hoy; reemplaza `MyDashboardView`).
- Programa: `TASK-1967` (hija H). Chrome, saludo y novedades de `TASK-1969`; datos de `TASK-1970`.
- Modo de dirección: `source-led`. Targets: 1440 × 900 y 390 × 844.

## Desktop (≥ 1024 px)

```
┌ sidebar «Mi Greenhouse» ┬ contenido ───────────────────────────────────────────────────────┐
│ Mi trabajo · Mi ficha   │ topbar + saludo (TASK-1969)                                       │
│ · Recursos              │ «Buenos días, [Nombre].» · «Tienes 2 entregas para hoy y 2 piezas │
│                         │  volvieron con feedback.»                                         │
│                         │ burbujas: ¿Qué tengo para hoy? · ¿Cómo va mi OTD? · …             │
│                         │ Mi desempeño  [Datos …]                         Ver Mi Desempeño  │
│                         │ Métricas ICO · Octubre 2026 · tus piezas                          │
│                         │ ╭ OTD 94 % │ FTR 78 % (bajo) │ RpA 1,4 │ Cycle 3,9 d ╮            │
│                         │ │ Mis piezas entregadas 23 · barras 6 semanas + CT  │            │
│                         │ │ En curso 6 · En revisión del cliente 2 · Utiliz.  │            │
│                         │ ╰───────────────────────────────────────────────────╯            │
│                         │ ┌ principal ───────────────────┐ ┌ derecha 360 ──────┐           │
│                         │ │ Tu foco hoy                   │ │ Novedades          │           │
│                         │ │ ◯60 % [2 entregas vencen hoy] │ │ Mis asignaciones   │           │
│                         │ │ Tu día · 3 de 5 tareas listas │ │ [Cliente] 0,5 FTE  │           │
│                         │ │ [Abrir mis tareas →][Calend.] │ │ Total 1,0 FTE      │           │
│                         │ │ [2 piezas volvieron con …  ›] │ ├────────────────────┤           │
│                         │ ├───────────────────────────────┤ │ Mi ficha (2×2)     │           │
│                         │ │ Mis tareas (por fecha)        │ │ Vacaciones 12 d    │           │
│                         │ │ HOY [pieza] · [Cliente] Abrir │ │ Próx. liquidación  │           │
│                         │ │ R2  [pieza] · feedback  Ver   │ │ Objetivos 2 de 3   │           │
│                         │ │ MAÑ [pieza] · mañana   Abrir  │ │ Evaluación [fecha] │           │
│                         │ └───────────────────────────────┘ └────────────────────┘           │
│                         │ footer (TASK-1969)                                                │
└─────────────────────────┴───────────────────────────────────────────────────────────────────┘
```

- **Menú**: navegación real de `GH_MY_NAV`: Mi Greenhouse (activo); Mi trabajo (Mis Asignaciones, Mi Delivery, Mi Desempeño, Mis Objetivos, Mis Evaluaciones); Mi ficha (Mis Permisos, Mi Nómina, Mi Perfil, Mi Organización); Recursos (Knowledge, Configuración).
- **Mi desempeño**: misma superficie que Performance del equipo con scope persona: cuatro KPIs con estado y meta, «Mis piezas entregadas» por semana con cycle time y una frase que dice qué falta para la meta («Te falta subir 2 puntos de FTR»), franja con piezas en curso, en revisión del cliente y utilización (banda del código: 35–85 % equilibrada).
- **Tu foco hoy**: anillo con el avance de las tareas del día, chip «2 entregas vencen hoy», acciones «Abrir mis tareas» y «Ver calendario», y fila «2 piezas volvieron con feedback».
- **Mis tareas**: lista por fecha de entrega con badge (HOY en rojo, R2 en azul, MAÑ en navy), pieza · cliente · proyecto, estado y acción.
- **Mis asignaciones**: clientes con su dedicación en FTE y total; sin costos por hora ni tarifas.
- **Mi ficha**: 2 × 2 con vacaciones disponibles, próxima liquidación (fecha de la orden de pago si existe; si no, «por confirmar»), objetivos en curso y próxima evaluación con su plazo.

## Mobile (< 760 px)

- Barra superior con el menú; saludo con Elio arriba; Mi desempeño (KPIs en 2 columnas); Tu foco hoy; Mis tareas; Novedades; Mis asignaciones; Mi ficha (2 × 2 se mantiene); footer.

## Regiones y datos

| Región | Bloque (`TASK-1970`) | Notas |
|---|---|---|
| Mi desempeño | `my-performance` | scope persona desde la sesión |
| Tu foco hoy / Mis tareas | `my-focus` / `my-tasks` | estados canónicos de tareas |
| Mis asignaciones | `my-assignments` | sin campos de costo |
| Mi ficha | `my-profile-stats` | sólo lectura de valores materializados; sin montos |
| Novedades | `announcements` | componente de `TASK-1969` |

## Accesibilidad

- Mismas reglas que la Home interna para KPIs, anillo y gráfico (estado con palabra, `aria-label`, tabla accesible del gráfico).
- Tareas como enlaces con el texto completo (pieza, cliente y fecha).
- Si falta la identidad del colaborador (`member_identity_not_linked`): mensaje canónico con CTA «Contactar a People Ops» y sin «Reintentar».

## Implementation Mapping

- Ruta: `src/app/(dashboard)/my/page.tsx` monta la Home nueva (detrás de la variante) en lugar de `MyDashboardView`.
- Shell: Composition Shell con `header` = `GreenhouseGreetingHero`; primary = Mi desempeño, Tu foco hoy, Mis tareas; aside = Novedades, Mis asignaciones, Mi ficha.
- Componentes: `TeamPerformancePanel` y `ThroughputChart` de `TASK-1971` con scope persona; `FocusTodayCard` reutilizado; `MyTasksList`, `MyAssignmentsCard`, `MyProfileStatsCard` (nuevos).
- Copy: `src/lib/copy/home.ts` (sección colaborador) + `GH_MY_NAV`.
- Datos: snapshot de la Home con audiencia `collaborator`; nunca `/api/my/*` directo desde la vista.

## GVC Scenario Plan

- Escenario: `scripts/frontend/scenarios/home-collaborator-role.scenario.ts`
- Ruta: `/my` con usuario agente colaborador y la flag encendida sólo para él.
- Viewports: 1440 × 900 y 390 × 844; `qualityProfile: premium`.
- Pasos: cargar → mark `my-fold` → scroll a Mis tareas → mark `my-tasks` → aside → mark `my-aside`.
- `data-capture`: `my-performance`, `my-focus-today`, `my-tasks`, `my-assignments`, `my-profile-stats`.
- Assertions: ningún costo ni monto visible; scroll-width = viewport; estado `member_identity_not_linked` probado con un usuario sin `memberId`.

## Design Decision Log

- Home en `/my`: decisión del operador del 2026-10-02 (sin cambio de política de inicio).
- Mi desempeño reutiliza el panel de la Home interna con scope persona: una sola primitive, dos alcances.
- Mi ficha muestra fechas y saldos, nunca montos (invariantes de nómina).
- Asignaciones sin costos: `/api/my/assignments` hoy expone costos por hora; la Home no los consume.
