# Greenhouse Vuexy Component Catalog V1

## Objetivo
Listar el subconjunto de patrones Vuexy/MUI que Greenhouse considera candidatos directos para reutilizacion.

Este catalogo no enumera todo `full-version`.
Enumera lo que hoy conviene consultar primero.

## Como leer el catalogo

### Estado
- `shared`: ya existe una primitive o adaptacion reusable en `starter-kit`
- `adapted-local`: ya se reutilizo en una surface puntual
- `reference-only`: existe en `full-version`, pero aun no se porto
- `avoid-copying`: solo sirve como referencia compositiva, no para copiar tal cual

### Target
- `shared`: mover o mantener en `src/components/greenhouse/*`
- `route-local`: mantener en `src/views/greenhouse/**`

## Hero y first-fold executive

### `website-analytics-slider`
- Estado: `avoid-copying`
- Familia: `hero`
- Cuando usar:
  - primera fila de dashboard ejecutivo
  - una lectura dominante con 2 a 4 supporting stats
- Cuando no usar:
  - admin list
  - detail pages de identidad
  - surfaces con data parcial y sin mensaje dominante
- Referencia:
  - `../full-version/src/views/dashboards/analytics/WebsiteAnalyticsSlider.tsx`
- Target Greenhouse:
  - composicion en `src/views/greenhouse/dashboard/*`
  - primitives en `src/components/greenhouse/ExecutiveHeroCard.tsx`

## KPI compactos

### `horizontal-with-subtitle`
- Estado: `shared`
- Familia: `mini-stat`
- Cuando usar:
  - KPI compacto con valor, subtitulo y tendencia corta
  - admin counters
  - resumenes de governance
- Cuando no usar:
  - narrativa larga
  - comparaciones multiserie
- Referencia:
  - `src/components/card-statistics/HorizontalWithSubtitle.tsx`
- Target Greenhouse:
  - `src/components/greenhouse/*` cuando el contrato sea de producto

### `horizontal-with-avatar`
- Estado: `reference-only`
- Familia: `mini-stat`
- Cuando usar:
  - KPI compacto donde el icono o identidad importa
- Cuando no usar:
  - cards con demasiada densidad textual
- Referencia:
  - `../full-version/src/components/card-statistics/HorizontalWithAvatar.tsx`
- Target Greenhouse:
  - evaluar port selectivo solo si el caso repite

### `horizontal-with-border`
- Estado: `reference-only`
- Familia: `mini-stat`
- Cuando usar:
  - metrics que necesitan contenedor mas fuerte sin llegar a card compleja
- Cuando no usar:
  - first-row hero
- Referencia:
  - `../full-version/src/components/card-statistics/HorizontalWithBorder.tsx`

## Tendencias cortas y charts ejecutivos

### `line-area-daily-sales-chart`
- Estado: `reference-only`
- Familia: `trend-card`
- Cuando usar:
  - una sola serie corta con numero dominante
- Cuando no usar:
  - series largas con mucho detalle
  - solo un punto de historico
- Referencia:
  - `../full-version/src/views/dashboards/analytics/LineAreaDailySalesChart.tsx`

### `sales-overview`
- Estado: `reference-only`
- Familia: `trend-card`
- Cuando usar:
  - comparacion corta y ejecutiva
  - un chart principal con framing claro
- Cuando no usar:
  - surfaces que solo necesitan mini-stats
- Referencia:
  - `../full-version/src/views/dashboards/analytics/SalesOverview.tsx`

## Salud y completitud

### `support-tracker`
- Estado: `reference-only`
- Familia: `health-card`
- Cuando usar:
  - on-time
  - first-time-right
  - score de calidad
- Cuando no usar:
  - inventarios
  - tablas de detalle
- Referencia:
  - `../full-version/src/views/dashboards/analytics/SupportTracker.tsx`

## Listas ejecutivas

### `source-visits`
- Estado: `reference-only`
- Familia: `executive-list`
- Cuando usar:
  - top blockers
  - tooling inventory
  - mix por modulo o categoria
- Cuando no usar:
  - datasets con acciones por fila
- Referencia:
  - `../full-version/src/views/dashboards/analytics/SourceVisits.tsx`

### `sales-by-countries`
- Estado: `reference-only`
- Familia: `executive-list`
- Cuando usar:
  - listas comparativas compactas con icono, valor y delta
- Cuando no usar:
  - tablas con filtros
- Referencias:
  - `../full-version/src/views/dashboards/analytics/SalesByCountries.tsx`
  - `../full-version/src/views/dashboards/crm/SalesByCountries.tsx`

## Admin list y governance tables

### `user-list-cards`
- Estado: `adapted-local`
- Familia: `summary-strip`
- Cuando usar:
  - totales y counters arriba de una tabla admin
- Cuando no usar:
  - primer fold de dashboard cliente
- Referencias:
  - `../full-version/src/views/apps/user/list/UserListCards.tsx`
  - `src/views/greenhouse/admin/users/UserListCards.tsx`

### `user-list-table`
- Estado: `adapted-local`
- Familia: `table`
- Cuando usar:
  - filas con filtros, export, acciones secundarias y paginacion
  - listas admin de usuarios, tenants o futuras scopes
- Cuando no usar:
  - menos de 5 filas y sin acciones
- Referencias:
  - `../full-version/src/views/apps/user/list/UserListTable.tsx`
  - `src/views/greenhouse/admin/users/UserListTable.tsx`

### `table-pagination-component`
- Estado: `shared`
- Familia: `table-primitive`
- Cuando usar:
  - tablas repetibles con paginacion consistente
- Referencia:
  - `src/components/TablePaginationComponent.tsx`

## Detail pages y contexto de identidad

### `user-details`
- Estado: `adapted-local`
- Familia: `detail-shell`
- Cuando usar:
  - pagina detalle de usuario
  - pagina detalle de tenant cuando exista overview lateral y contexto operativo a la derecha
- Cuando no usar:
  - dashboard ejecutivo
- Referencias:
  - `../full-version/src/views/apps/user/view/user-left-overview/UserDetails.tsx`
  - `src/views/greenhouse/GreenhouseAdminUserDetail.tsx`

### `user-activity-timeline`
- Estado: `adapted-local`
- Familia: `timeline`
- Cuando usar:
  - eventos reales de acceso o actividad
- Cuando no usar:
  - placeholders sin timestamps reales
- Referencias:
  - `../full-version/src/views/apps/user/view/user-right/overview/UserActivityTimeline.tsx`
  - `src/views/greenhouse/admin/users/UserActivityTimeline.tsx`

## Primitives Greenhouse ya existentes

### `executive-card-shell`
- Estado: `shared`
- Familia: `card-shell`
- Uso:
  - contenedor base para secciones ejecutivas
- Referencia local:
  - `src/components/greenhouse/ExecutiveCardShell.tsx`

### `executive-hero-card`
- Estado: `shared`
- Familia: `hero`
- Uso:
  - hero ejecutivo reusable del dashboard
- Referencia local:
  - `src/components/greenhouse/ExecutiveHeroCard.tsx`

### `executive-mini-stat-card`
- Estado: `shared`
- Familia: `mini-stat`
- Uso:
  - KPI ejecutivo compacto con tono y soporte corto
- Referencia local:
  - `src/components/greenhouse/ExecutiveMiniStatCard.tsx`

### `brand-logo`
- Estado: `shared`
- Familia: `brand-identity`
- Uso:
  - tooling, vendors, AI tools y logos de marca
- Referencia local:
  - `src/components/greenhouse/BrandLogo.tsx`

## Overflow y secondary actions

### `option-menu`
- Estado: `reference-only`
- Familia: `overflow-actions`
- Cuando usar:
  - acciones secundarias
  - menus de fila o de card
- Cuando no usar:
  - CTA principal
- Referencia:
  - `src/@core/components/option-menu/*`

## Reglas de consulta

1. Consultar primero las primitives locales `shared`
2. Si no alcanza, consultar una sola familia `reference-only`
3. Si el patron ya tiene adaptacion local, reusar esa adaptacion antes de volver a `full-version`
4. Si un patron requiere mucha reinterpretacion semantica, documentar el port en `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md` antes de expandirlo

## Proximo trabajo recomendado

- agregar entradas para patrones de `/admin/tenants`
- registrar tablas y detail shells futuros para `/admin/scopes` y `/admin/feature-flags`
- registrar futuras primitives de `/equipo` y `/campanas` solo cuando su modelo semantico exista
