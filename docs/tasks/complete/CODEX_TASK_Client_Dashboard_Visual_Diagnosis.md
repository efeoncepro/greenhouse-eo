# CODEX TASK ADDENDUM — Diagnóstico Visual del Dashboard Cliente (Pulse)

## Contexto

Este documento complementa `docs/tasks/complete/CODEX_TASK_Client_Dashboard_Redesign.md` con un diagnóstico preciso de los problemas estéticos y de UI/UX visibles en la implementación actual del dashboard cliente (vista "Ver como cliente" / Pulse). El Codex task principal define la arquitectura objetivo; este addendum señala qué está roto HOY para que el agente priorice las correcciones.

**Leer primero:** `docs/tasks/complete/CODEX_TASK_Client_Dashboard_Redesign.md` (spec completa), `docs/tasks/to-do/CODEX_TASK_Typography_Hierarchy_Fix.md` (tipografía), `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md` (nomenclatura + colores).

---

## Diagnóstico por zona

### ZONA 1: Header / Hero banner

**Estado actual:** El hero banner con gradiente azul oscuro → negro existe y tiene buena base conceptual. Pero tiene problemas:

| Problema | Descripción | Fix |
|----------|-------------|-----|
| Banner admin visible para el cliente | "Volver al space" e "Ir a spaces" son botones admin que NO deben ser visibles en vista cliente. Son contexto de admin, no del producto. | Condicionar a `role === 'admin'`. En vista "Ver como cliente", ocultarlos completamente. |
| CRM ID visible | `EO-SPACE-EFEONCE` aparece como badge en el header. Es un identificador interno — el cliente no necesita verlo. | Ocultar si `role !== 'admin'`. |
| Chips de capabilities demasiados y con ruido | Hay ~7 chips (CRM Solutions, Globe, AI, Agencia creativa, Consultoría CRM, Onboarding CRM, Web Delivery) todos al mismo nivel, todos con el mismo estilo. No hay jerarquía: la línea de servicio (Globe) tiene el mismo peso que un servicio específico (Consultoría CRM). | Mostrar solo las **líneas de servicio activas** como chips primarios (Globe, CRM Solutions, Wave) con sus colores de `GH_COLORS.service`. Los servicios específicos NO son chips — son detalle interno. |
| Metadata sobreexplicada | "Última actividad: hace 3 días. 57 proyectos activos. Relación activa: 23 meses." — el "57 proyectos activos" suena exagerado si es el space demo Efeonce con data interna. Es correcto como dato pero necesita el formato de la nomenclatura: "Última actividad hace 3 días · 57 proyectos activos · Relación activa: 23 meses." en una línea, sin saltos. | Unificar en una línea de metadata con separadores `·`. DM Sans 400 13px. |
| "Datos actualizados: 13 mar 2026, 3:01 a.m." | Posición correcta (esquina superior derecha del hero). Pero el formato incluye hora con excesiva precisión. | Simplificar a "Datos actualizados: hoy, 3:00 a.m." si es del mismo día. |

### ZONA 2: KPI Cards (fila de 4)

**Estado actual:** Las 4 KPI cards existen y tienen estructura correcta (RpA, Deliveries, OTD%, Feedback pendiente). Es la sección mejor lograda. Problemas puntuales:

| Problema | Descripción | Fix |
|----------|-------------|-----|
| Semáforo OTD% en rojo sin contexto | OTD% muestra 54% con badge "Alerta" y color rojo. El número y el semáforo están correctos, pero el badge "Promedio del portafolio visible" suena extraño. ¿Visible para quién? | Cambiar copy a "Entregas dentro de plazo" (como dice el spec). El subtexto actual es lenguaje interno, no lenguaje de cliente. |
| Trend de deliveries sin contexto | "82 (-56)" — el -56 es un delta negativo, pero ¿respecto a qué período? | Agregar "vs. mes anterior" como subtexto del trend, o cambiar a "82 · Últimos 30 días" si no hay período comparativo. |
| Feedback card: "19 (0)" | El "(0)" sin contexto no comunica nada. | Cambiar a "19 assets · 4 comentarios abiertos" con el conteo de open_frame_comments como subtexto informativo, como dice el spec. |
| Botones debajo de KPIs | "Actividad mensual" y "Feedback pendiente" como chips/botones debajo de las cards. No está claro qué hacen — ¿son links? ¿filtros? | Si son links a secciones del dashboard, convertir en links discretos de texto (`text.secondary`, underline on hover). Si no hacen nada, eliminarlos. Los KPI cards de Vuexy no tienen botones debajo. |
| Ícono de cada KPI card | Los íconos (persona, calendario, porcentaje, mensaje) están bien conceptualmente pero se ven como genéricos de MUI. | Mantener pero verificar que usan Tabler Icons (el set de Vuexy), no los íconos genéricos de MUI. Vuexy usa Tabler. |

### ZONA 3: Charts (2 filas de 2)

**Estado actual:** Hay 4 charts implementados. La estructura de 2x2 es correcta. Problemas:

| Problema | Descripción | Fix |
|----------|-------------|-----|
| **Donut chart demasiado grande** | El donut de "Status de assets" ocupa demasiado espacio vertical. El número "750" en el centro es útil pero el chart es desproporcionado respecto a su card container. | Reducir el tamaño del donut. En ApexCharts: `chart: { height: 220 }` en vez del actual que parece ~300+. El número central debe ser 24px Poppins 500, no más grande. |
| Leyenda del donut debajo | La leyenda "En progreso · En curso · Cambios cliente · En revisión" está debajo del chart con dots de color. Es correcta pero los labels son inconsistentes con la nomenclatura: "En progreso" y "En curso" suenan como el mismo estado. | Unificar labels con el spec de nomenclatura v3: "En curso", "Listo para revisión", "Cambios solicitados", "Listo". Si hay más estados en la data, agrupar los menores en "Otros". |
| **Cadencia de entregas: barras verdes sin variación visual** | Todas las barras son del mismo color verde. No hay distinción ni contexto visual. | Mantener un solo color (verde = completado es correcto). Pero agregar la línea de tendencia (moving average) como overlay para dar contexto de si la cadencia sube o baja. ApexCharts soporta `type: 'line'` como serie adicional sobre barras. |
| **RpA por proyecto: barra roja sobresale demasiado** | "Content Q1 - 2026" tiene un RpA de ~3.0 que sale del chart como barra roja gigante. Visualmente alarma más de lo necesario. | La línea de referencia en 2.0 (máximo ICO) ya existe — bien. Pero las barras que superan el máximo no deben ser rojo intenso. Usar el color de semáforo de `GH_COLORS.semaphore`: verde si ≤1.5, naranja (Sunset Orange) si ≤2.5, rojo (Crimson Magenta) si >2.5. Actualmente parece rojo genérico, no el Crimson Magenta de marca. |
| **OTD% mensual: línea sin area fill** | El chart de OTD% es correcto pero la línea se pierde visualmente. | Agregar area fill sutil debajo de la línea (opacity 0.1 del color primario). Agregar la línea de referencia horizontal en 90% (meta ICO) como dashed line gris con label. |
| Ejes X de los charts con fechas | Los ejes muestran "12 dic", "28 dic", "3 ene", etc. en formato correcto. Pero en OTD% mensual las fechas del eje X parecen ser semanas, no meses — inconsistente con el título "mensual". | Si es OTD% **mensual**, el eje X debe mostrar meses ("dic", "ene", "feb", "mar"). Si la data es semanal, cambiar el título a "OTD% semanal" o agregar tooltip explicativo. |

### ZONA 4: Capacidad del equipo

**Estado actual:** Esta sección es la que más problemas tiene. Muestra 7 personas con nombre, cargo, dedicación y progress bar de utilización individual.

| Problema | Descripción | Fix (según spec) |
|----------|-------------|------------------|
| **Progress bars individuales al 100% en TODOS** | Cada persona muestra "100%" en rojo. Si todo el equipo está al 100%, el dato pierde significado — o es data incorrecta (default a 100 cuando no hay cálculo real), o el equipo está realmente saturado. En ambos casos, 7 barras rojas al 100% es alarmante sin contexto. | Si la data de utilización no es real (no hay tracking de horas por persona), NO mostrar la progress bar individual. Mostrar solo nombre + cargo + dedicación ("100% · 160h/mes"). Las barras rojas son ruido cuando no hay data granular. |
| **"Dedicación: 100% · 160h/mes" en todos** | Si todos tienen 100% de dedicación, el dato es redundante. No aporta información diferenciadora. | Mostrar dedicación solo si varía entre personas (ej: uno al 50%, otro al 100%). Si todos están al 100%, mostrar solo FTE total en la zona derecha y eliminar el dato por persona. |
| **"Carga del space" como subtítulo** | "Carga operativa basada en proyectos y tareas activas" — el subtítulo es correcto pero la sección completa mezcla datos que no existen (utilización individual real) con datos que sí existen (asignación de horas). | Separar: la lista de personas es la **Vista 1 (Dossier)** del spec de equipo — solo nombre, cargo, foto. La capacidad es la **zona derecha** — solo FTE total contratado vs utilizado. |
| **Sin ghost slot** | No hay ghost slot de "Ampliar equipo" al final de la lista. | Agregar según spec del Codex task principal (círculo punteado + "+" + "Ampliar equipo"). Solo visible si hay ≥1 persona asignada. |
| **Capacidad contratada (zona derecha)** | Muestra "1.0 FTE de 1.0 FTE contratados" y "Utilización: 100%" con barra completa en rojo, más "1.120 horas de 1.120 horas mensuales utilizadas". | **1.120 horas mensuales para 7 personas es 160h × 7 = 1.120h.** El dato es correcto (7 FTE). Pero la card dice "1.0 FTE de 1.0 FTE" — este es un bug: debería decir 7.0 FTE, no 1.0. Verificar el cálculo de FTE total en la API. |
| **CTA de capacidad: "Tu equipo está al 100%..."** | El CTA rojo con "Ampliar capacidad" es agresivo visualmente. Ocupa demasiado espacio y el rojo comunica emergencia. | Rediseñar según spec: usar Sunset Orange como base (no rojo), reducir a un chip discreto: "Tu equipo está cerca de su capacidad máxima. ¿Necesitas más horas?" Solo visible si utilización real >85% por 2+ meses, no como elemento permanente. |

### ZONA 5: Tu ecosistema (Tu stack + AI)

**Estado actual:** Dos columnas con empty states — "Tu stack está en configuración" y "Las herramientas AI se activarán con tu primer proyecto creativo."

| Problema | Descripción | Fix |
|----------|-------------|-----|
| Empty states correctos pero con CTA innecesario | Los links "¿Necesitas una herramienta adicional? Solicitar" y "¿Necesitas otra capacidad AI? Solicitar" aparecen incluso en empty state. No tiene sentido ofrecer "más" de algo cuando no hay nada configurado. | Los links PLG de solicitar solo deben aparecer cuando ya hay al menos 1 herramienta/AI configurada. En empty state, solo mostrar el mensaje sin CTA. |
| Iconos genéricos | El ícono del empty state es un círculo con un ícono genérico de settings/AI. | Usar íconos de Tabler que representen mejor: `IconTool` para stack, `IconSparkles` o `IconBrain` para AI. |

### ZONA 6: Salud del portafolio

**Estado actual:** Sección con "7 proyectos saludables, 29 bajo observación" y badges "7 saludables · 19 bajo observación · 4 comentarios abiertos".

| Problema | Descripción | Fix |
|----------|-------------|-----|
| **29 bajo observación de 36 total** | Esto significa que el 80% del portafolio está bajo observación. Si es data real, es una situación crítica que merece más que un badge naranja. Si es data de prueba o cálculo incorrecto, necesita revisión del backend. | Verificar la lógica de "bajo observación" en la API. ¿Qué criterio usa? Si cualquier proyecto con al menos 1 tarea con RpA > 2 cuenta como "bajo observación", el threshold puede ser demasiado agresivo. Documentar el criterio en la UI (tooltip en el badge). |
| KPIs de esta sección (OTD% 54%, Deliveries 82, Feedback 4) | Son duplicados de los KPI cards de Zona 2. | Eliminar estos KPIs de aquí — ya están arriba. Esta sección solo necesita el resumen de proyectos saludables vs bajo observación + la lista. |

### ZONA 7: Proyectos bajo atención

**Estado actual:** Tabla con 5 proyectos, cada uno con badges de estado, badges de alerta ("10 bloqueadas", "1 en revisión", "OTD 50%", "OTD 0%").

| Problema | Descripción | Fix |
|----------|-------------|-----|
| **OTD 0% en múltiples proyectos** | "Operaciones - H1-2025", "Marketing de contenidos Q1-2025", "Paid Media - Marzo 26", "Webinar CRM Solutions" — todos muestran OTD 0%. Si tienen entregas listas pero ninguna fue dentro de plazo, es un problema real. Si no tienen entregas aún, el OTD debería ser "N/A" o "—", no 0%. | El OTD% de un proyecto sin entregas completadas debe mostrar "—" (guión), no "0%". El 0% implica que hubo entregas pero ninguna fue on-time, lo cual es diferente a "no hubo entregas". Corregir la lógica: `if (total_delivered === 0) return '—'`. |
| Badges inconsistentes | "10 bloqueadas" y "1 en revisión" son badges rojos con diferente semántica. "Bloqueadas" es un estado crítico, "en revisión" es un estado normal de workflow. No deberían tener el mismo tratamiento visual. | "Bloqueadas" = badge rojo (danger). "En revisión" = badge azul (info) o naranja (warning). "OTD X%" = badge con color de semáforo (verde ≥90%, naranja ≥70%, rojo <70%). |
| Link "Abrir proyecto" | Cada proyecto tiene un link "Abrir proyecto" que presumiblemente navega al detalle. El link es correcto pero está en azul genérico. | Mantener el link pero convertir a `text.secondary` con hover effect — es una acción secundaria, no un CTA. |

---

## Problemas transversales

### Tipografía

El diagnóstico completo está en `docs/tasks/to-do/CODEX_TASK_Typography_Hierarchy_Fix.md`, pero en resumen: Poppins se usa para demasiadas cosas. En este dashboard específico:

- **KPI numbers (1.4, 82, 54%, 19):** Poppins 500/600 — **correcto**, son números hero.
- **KPI labels ("RpA promedio", "Deliveries del período"):** Poppins 500/600 — **incorrecto**, deberían ser DM Sans 400/500 13px.
- **Chart titles ("Status de assets", "Cadencia de deliveries"):** Poppins 600 — **aceptable** como heading, pero debería ser Poppins 500 14px, no 600.
- **Nombres de personas ("Andres Carlosama", "Daniela Ferreira"):** Poppins 600 — **incorrecto**, deberían ser DM Sans 500 14px.
- **Cargos ("Senior Visual Designer"):** Parece Poppins 400 — **incorrecto**, debería ser DM Sans 400 12px.
- **Datos de dedicación ("100% · 160h/mes"):** Parece Poppins 400 — **incorrecto**, debería ser DM Sans 400 12px.

### Espaciado

- Las cards de KPI tienen buen spacing interno.
- La sección de equipo tiene demasiado espacio vertical — 7 filas de persona con progress bar individual crea un bloque de ~600px de altura que empuja todo lo demás muy abajo.
- El hero banner tiene buen spacing pero podría perder ~20px de padding top/bottom sin perder legibilidad.

### Colores

- Los colores del donut chart NO son los colores de estado definidos en la nomenclatura. Parecen colores genéricos de ApexCharts (azul, naranja, verde, rojo). Deben mapear a los colores de estado de `GH_COLORS`.
- Las barras de RpA por proyecto usan rojo genérico para las que superan el límite. Deben usar Crimson Magenta (`#bb1954`) de `GH_COLORS.semaphore.red`.
- Los progress bars de capacidad individual usan rojo genérico. Si se mantienen (ver diagnóstico de Zona 4), deben usar `GH_COLORS.semaphore`.

---

## Orden de prioridad de correcciones

### P0 — Correcciones que cambian la percepción del producto

1. **Ocultar botones admin en vista cliente** (Volver al space, Ir a spaces, CRM ID).
2. **Reducir chips de capabilities** a solo líneas de servicio (Globe, CRM Solutions, Wave) con colores de marca.
3. **Fix del FTE total** — actualmente muestra "1.0 FTE" cuando debería ser "7.0 FTE". Es un bug de cálculo.
4. **Eliminar progress bars individuales al 100%** si no hay data real de utilización. Las 7 barras rojas son lo más alarmante de la vista.
5. **OTD 0% → "—"** en proyectos sin entregas. El 0% parece un producto roto.

### P1 — Correcciones de jerarquía y legibilidad

6. **Tipografía:** aplicar DM Sans en labels, descripciones, cargos, datos de equipo (ver `docs/tasks/to-do/CODEX_TASK_Typography_Hierarchy_Fix.md`).
7. **Donut chart:** reducir tamaño, unificar labels de estado con nomenclatura.
8. **RpA por proyecto:** usar colores de semáforo de marca, no rojos genéricos.
9. **OTD% mensual:** agregar línea de referencia en 90% y area fill sutil.
10. **Badges de proyectos bajo atención:** diferenciar "bloqueadas" (rojo) de "en revisión" (azul/naranja).

### P2 — Mejoras de experiencia

11. **Ghost slot de equipo** — agregar al final de la lista de personas.
12. **CTA de capacidad** — rediseñar de rojo agresivo a Sunset Orange sutil.
13. **Empty state de Tu ecosistema** — ocultar links PLG cuando no hay nada configurado.
14. **Eliminar KPIs duplicados** de la sección Salud del portafolio.
15. **Hacer colapsables** las secciones Salud del portafolio y Proyectos bajo atención.

### P3 — Polish

16. Verificar que la sección "Cadencia de entregas" tenga barras verdes + trend overlay.
17. Verificar formato de fechas consistente (12 mar 2026).
18. Verificar responsive en 3 breakpoints.
19. Agregar skeleton loaders con crossfade.
20. Agregar error boundaries por zona.

---

## Microcopy funcional — Tabla maestra

Este es el diccionario definitivo de todo texto visible en el dashboard cliente. Si un string no está en esta tabla, el agente no debe inventarlo — debe escalarlo aquí primero.

**Principio:** Cada texto tiene un solo trabajo. Si un label necesita explicación, el tooltip la da. Si un estado necesita acción, el subtexto la indica. Nunca el label hace ambas cosas. Nunca hay un texto que no le sirva al cliente para tomar una decisión o entender un dato.

**Anti-patrones que el agente debe eliminar en esta pasada:**
- "Promedio del portafolio visible" → ¿visible para quién? Lenguaje interno.
- "Actividad recientemente visible en la cuenta" → redundante, el dashboard ya es la vista.
- "Todavía no hay suficiente data para renderizar" → lenguaje de desarrollador.
- "Error: Failed to fetch" / "TypeError" / "undefined" → nunca llega al cliente.
- "Estimados: 1" / "82 (-56)" / "19 (0)" → números sin contexto = ruido.

---

### M1. Hero banner / Header

| Elemento | Copy exacto | Regla |
|----------|-------------|-------|
| Título de sección | **Pulse** | Siempre. No "Dashboard", no "Panel". |
| Subtítulo | **El ritmo de tu operación creativa** | Fijo, no dinámico. |
| Metadata inline | **Última actividad hace [N] días · [X] proyectos activos · Relación activa: [N] meses** | Una sola línea, separadores `·`. Si actividad < 24h: "Última actividad: hoy". Si no hay proyectos: omitir ese segmento, no mostrar "0 proyectos activos". |
| Timestamp de datos | **Datos actualizados: hoy, 3:00 a.m.** | Si mismo día: "hoy, H:MM a.m.". Si ayer: "ayer, H:MM a.m.". Si > 1 día: "12 mar 2026, 3:00 a.m.". Redondear minutos a :00/:15/:30/:45. |
| Chips de capabilities | **[Nombre de línea de servicio]** | Solo líneas activas (Globe, CRM Solutions, Wave). Con color de `GH_COLORS.service`. No mostrar servicios específicos como chips. |

**Textos que se eliminan del hero:**
- "Volver al space" → solo si `role === 'admin'`
- "Ir a spaces" → solo si `role === 'admin'`
- Badge con Space ID (ej: `EO-SPACE-EFEONCE`) → solo si `role === 'admin'`
- Cualquier referencia a CRM ID → solo si `role === 'admin'`

---

### M2. KPI Cards

Cada KPI card tiene 5 slots de texto. El agente debe mapear cada slot exactamente:

```
┌─────────────────────────────────┐
│ [ícono]          [título] (i)   │  ← título + tooltip icon
│                                 │
│         [número]                │  ← dato principal
│         [trend]                 │  ← delta vs período anterior
│                                 │
│  [semáforo badge]    [subtexto] │  ← badge de estado + contexto
└─────────────────────────────────┘
```

| Card | Título | Tooltip (hover en ℹ) | Número | Trend | Subtexto | Semáforo badge |
|------|--------|----------------------|--------|-------|----------|----------------|
| RpA | **RpA promedio** | Rounds per Asset: promedio de rondas de revisión por pieza. Menos es mejor. Meta ICO: ≤2 rondas. | `1.4` | `máx. 26` (máximo individual del período) | Promedio de rondas de revisión por pieza | **Óptimo** (verde) si ≤1.5, **Atención** (naranja) si ≤2.5, **Alerta** (rojo) si >2.5 |
| Deliveries | **Deliveries del período** | Piezas que pasaron a estado "Listo" en los últimos 30 días. | `82` | `−56 vs. mes anterior` (siempre con contexto) | Últimos 30 días | Chip **Actividad mensual** como link a sección de cadencia (si existe), o eliminar si no navega a nada |
| OTD% | **OTD%** | On-Time Delivery: porcentaje de entregas dentro del plazo definido en el brief. Meta: ≥90%. | `54%` | `−23%` vs. mes anterior | Entregas dentro de plazo | **Alerta** (rojo) si <70%, **Atención** (naranja) si <90%, **Óptimo** (verde) si ≥90% |
| Feedback | **Feedback pendiente** | Assets en estado "Listo para revisión" o con comentarios abiertos en Frame.io. | `19` | — | Assets esperando tu feedback · [N] comentarios abiertos | Chip **Feedback pendiente** como link a filtro (si existe), o mostrar solo el conteo de comentarios |

**Reglas de trend:**
- Si el delta es negativo: `−56 vs. mes anterior` (con signo menos, no paréntesis).
- Si el delta es positivo: `+12 vs. mes anterior`.
- Si no hay datos del mes anterior: no mostrar trend. No mostrar "0" ni "(0)".
- Si el dato base es 0: mostrar `0` con subtexto "Sin actividad este mes". No semáforo rojo, no porcentaje en rojo.

**Regla de subtexto:** El subtexto debajo del número explica **qué mide** el dato en ≤6 palabras. No repite el tooltip. No es una lectura interpretativa. No es "Promedio del portafolio visible".

---

### M3. Charts

| Chart | Título | Subtítulo | Tooltip del título | Empty state (si no hay data) |
|-------|--------|-----------|--------------------|------------------------------|
| Donut de estados | **Status de assets** | Assets activos de tu cuenta | Distribución de tus assets por estado actual de producción. | Sin assets activos en este momento. |
| Cadencia de entregas | **Cadencia de deliveries** | Assets completados por semana · últimos 3 meses | Ritmo semanal de piezas que pasan a estado "Listo". | Se necesitan al menos 2 semanas de actividad para este gráfico. |
| RpA por proyecto | **RpA por proyecto** | Línea de referencia: 2.0 (máximo ICO) | Promedio de rondas de revisión por pieza en cada proyecto activo. Menos es mejor. | Sin proyectos con actividad de revisión. |
| OTD% mensual | **OTD% mensual** | Tendencia de los últimos 6 meses · meta: 90% | Porcentaje mensual de entregas dentro del plazo comprometido. | Se necesitan al menos 2 meses de datos para este gráfico. |

**Labels de la leyenda del donut (estados normalizados):**

| Estado en BigQuery | Label en UI | Color |
|--------------------|-------------|-------|
| `En curso` | En curso | `#0375db` (Core Blue) |
| `Listo para revisión` | Listo para revisión | `#ff6500` (Sunset Orange) |
| `Cambios Solicitados` | Cambios solicitados | `#bb1954` (Crimson Magenta) |
| `Listo` | Completado | `#6ec207` (Neon Lime) |
| Cualquier otro | Otros | `#848484` (Brand Gray) |

**Regla:** si un estado tiene 0 assets, no aparece en la leyenda. La leyenda solo muestra estados con data.

---

### M4. Equipo y capacidad

| Elemento | Copy exacto | Condición de visibilidad |
|----------|-------------|--------------------------|
| Título de sección | **Capacidad del equipo** | Siempre |
| Subtítulo | **Carga operativa basada en proyectos y tareas activas** | Siempre |
| Subtítulo alternativo (sin equipo) | — | — |
| Nombre de persona | **[Nombre completo]** | Siempre, DM Sans 500 14px |
| Cargo | **[Cargo real en inglés]** | Siempre, DM Sans 400 12px `text.secondary` |
| Dedicación por persona | **[X]% · [N]h/mes** | Solo si varía entre personas. Si todos al 100%, mostrar solo en zona de capacidad total. |
| Progress bar individual | — | **NO mostrar** si no hay data de utilización real (horas trabajadas vs horas comprometidas). Las barras al 100% para todos son ruido. |
| Ghost slot — título | **Ampliar equipo** | Solo si hay ≥1 persona asignada |
| Ghost slot — subtítulo | **Agrega capacidad creativa, de medios o tecnología.** | Solo si hay ≥1 persona asignada |
| Empty state (0 personas) | **Tu equipo está en configuración.** Pronto verás aquí a las personas asignadas a tu cuenta. | Si `team.length === 0` |

**Zona de capacidad contratada (lado derecho):**

| Elemento | Copy exacto | Condición |
|----------|-------------|-----------|
| Título | **Capacidad contratada** | Solo si `horas_mensuales > 0` |
| FTE | **[X.X] FTE de [Y.Y] FTE contratados** | Calcular correctamente: FTE = horas / 160. Si 7 personas × 160h = 1.120h → 7.0 FTE, no 1.0. |
| Utilización | **Utilización: [N]%** | Con barra de progreso. Verde <80%, naranja 80-95%, rojo >95%. |
| Horas | **[X] horas de [Y] horas mensuales utilizadas** | Formato con punto de miles: "1.120 horas". |
| Estimación de uso | **Estimación de uso basada en la carga operativa actual del equipo.** | Texto fijo debajo del dato de horas. DM Sans 400 11px `text.tertiary`. |
| Nudge de capacidad | **Tu equipo opera al [N]% de capacidad este mes.** Si tienes necesidades adicionales, puedes sumar capacidad On-Demand sin afectar tu equipo actual. | Solo si utilización real >85% por 2+ meses consecutivos. Fondo: `GH_COLORS.semaphore.yellow.bg`. Texto: `GH_COLORS.semaphore.yellow.textDark`. |
| CTA del nudge | **Ampliar capacidad** | Botón outline con borde Sunset Orange. No rojo. No botón filled. |
| Nudge ausente | — | Si utilización <85% o data insuficiente: no mostrar nada. No hay CTA permanente de upselling. |

---

### M5. Tu ecosistema (Tu stack + AI)

| Elemento | Copy exacto | Condición |
|----------|-------------|-----------|
| Título izquierda | **Tu stack** | Siempre |
| Subtítulo izquierda | **Herramientas activas en tu cuenta** | Siempre |
| Item de herramienta | **[Nombre]** + link directo | Solo herramientas configuradas con URL funcional |
| Empty state stack | **Tu stack está en configuración.** Pronto tendrás acceso directo a tus herramientas desde aquí. | Si 0 herramientas configuradas |
| Link PLG stack | **¿Necesitas una herramienta adicional?** Solicitar | Solo si hay ≥1 herramienta configurada. NO en empty state. |
| Título derecha | **AI en tu cuenta** | Siempre |
| Subtítulo derecha | **Inteligencia artificial activa en tu operación** | Siempre |
| Item de AI | **[Nombre]** — [descripción de beneficio en 1 línea] | Solo AI configurada y activa |
| Empty state AI | **Las herramientas AI se activarán con tu primer proyecto creativo.** Esta sección mostrará la capacidad AI activa de tu cuenta cuando haya sido habilitada. | Si 0 herramientas AI |
| Link PLG AI | **¿Necesitas otra capacidad AI?** Solicitar | Solo si hay ≥1 AI configurada. NO en empty state. |

---

### M6. Salud del portafolio

| Elemento | Copy exacto | Condición |
|----------|-------------|-----------|
| Título de sección | **Salud del portafolio** | Siempre |
| Resumen inline | **[X] proyectos saludables, [Y] bajo observación.** | Texto al lado del título, DM Sans 400 13px `text.secondary`. |
| Badges | **[N] saludables** (verde) · **[N] bajo observación** (naranja) · **[N] comentarios abiertos** (rojo) | Solo badges con valor > 0. No mostrar "0 saludables". |
| Colapsable | Abierto por defecto si `bajo_observación > 0` o `comentarios_abiertos > 0`. Cerrado si todo está sano. | Accordion de MUI. |
| Empty state (0 proyectos) | **Sin proyectos activos para analizar.** Cuando tu cuenta tenga proyectos en curso, la salud del portafolio aparecerá aquí. | Si no hay proyectos |

**KPIs eliminados de esta sección:** OTD% 54%, Deliveries 82, Feedback 4 → ya están en las KPI cards de Zona 2. No duplicar.

---

### M7. Proyectos bajo atención

| Elemento | Copy exacto | Condición |
|----------|-------------|-----------|
| Título de sección | **Proyectos bajo atención** | Siempre |
| Resumen inline | **[N] proyectos con alertas activas** | O: "Todos los proyectos operan normalmente." si 0 alertas. |
| Badge: bloqueadas | **[N] bloqueadas** | Color: `GH_COLORS.semantic.danger` (rojo). Solo si > 0. |
| Badge: en revisión | **[N] en revisión** | Color: `GH_COLORS.semantic.info` (azul). Solo si > 0. No rojo — revisión es un estado normal, no una alerta. |
| Badge: OTD | **OTD [N]%** | Color: semáforo (verde ≥90%, naranja ≥70%, rojo <70%). |
| OTD sin entregas | **—** | Si el proyecto tiene 0 entregas completadas, mostrar guión, no "OTD 0%". |
| Link de proyecto | **Abrir proyecto** | Color: `text.secondary`, underline on hover. No azul primario — es acción secundaria. |
| Estado del proyecto | **[Estado]** | Badge con color: "En curso" (azul), "Listo" (verde). |
| Colapsable | Abierto por defecto si hay > 0 alertas. Cerrado si todos sanos. | Accordion de MUI. |
| Empty state (todo sano) | **Todos los proyectos operan normalmente.** Sin alertas activas en tu portafolio. | Si 0 proyectos con alertas |

---

### M8. Estados de carga y error

Estos textos reemplazan TODOS los mensajes técnicos, traces, "undefined", "Error: Failed to fetch", etc. El agente debe implementar un error boundary por zona que intercepte cualquier error y lo traduzca a estos textos.

| Situación | Texto principal | Texto secundario | Acción |
|-----------|----------------|-----------------|--------|
| Carga inicial post-login | **Preparando tu Greenhouse...** | — | Skeleton loader animado |
| Carga parcial de sección | **Cargando datos...** | — | Skeleton de la sección específica |
| Error de carga (cualquier sección) | **No pudimos cargar esta sección.** | Intenta de nuevo en unos segundos. Si el problema persiste, tu equipo de cuenta ya fue notificado. | Botón: **Reintentar** |
| Error de conexión general | **No pudimos conectar con tus datos.** | Intenta de nuevo en unos minutos. | Botón: **Reintentar** |
| Timeout de API | **La carga está tardando más de lo esperado.** | Estamos trabajando en ello. Puedes esperar o intentar de nuevo. | Botón: **Reintentar** |
| KPI en 0 (sin actividad) | **Sin actividad este mes** | Las métricas se actualizan con cada pieza completada. | — |
| Chart sin data | **Aún no hay suficiente actividad** | Este gráfico necesita al menos [N] semanas de datos para ser útil. | — |
| Tabla vacía | **Sin resultados** | — | — |
| Dato no disponible | **—** (guión) | — | — |
| Porcentaje no calculable (0/0) | **—** (guión) | — | Nunca "0%", nunca "NaN%", nunca "Infinity%". |

**Regla anti-ruido:** Si un dato no existe o no se puede calcular, mostrar un guión (`—`). No mostrar `0`, no mostrar `null`, no mostrar `undefined`, no mostrar `NaN`, no mostrar texto explicativo. El guión comunica "no aplica" sin alarmar.

---

### M9. Tooltips de semáforos

Los tooltips de semáforo son tranquilizadores, no alarmantes. El cliente no debe sentir pánico al ver amarillo o rojo — debe sentir que su equipo de cuenta ya lo sabe y actúa.

| Semáforo | Label visible | Tooltip |
|----------|---------------|---------|
| Verde | **Óptimo** | La operación está dentro de los estándares ICO. |
| Amarillo | **Atención** | Algunos indicadores se acercan al límite. Tu equipo de cuenta ya está al tanto. |
| Rojo | **Alerta** | Indicadores fuera de rango. Tu equipo de cuenta te contactará con un action plan. |

**Regla:** El semáforo NUNCA aparece solo como color. Siempre incluye ícono + label textual. El color es refuerzo visual, no la única señal.

| Semáforo | Ícono | Color de fondo (badge) | Color de texto |
|----------|-------|------------------------|----------------|
| Óptimo | `IconCheck` (Tabler) | `GH_COLORS.semaphore.green.bg` → `#f3faeb` | `GH_COLORS.semaphore.green.text` → `#6ec207` |
| Atención | `IconAlertTriangle` (Tabler) | `GH_COLORS.semaphore.yellow.bg` → `#fff2ea` | `GH_COLORS.semaphore.yellow.text` → `#ff6500` |
| Alerta | `IconAlertCircle` (Tabler) | `GH_COLORS.semaphore.red.bg` → `#f9ecf1` | `GH_COLORS.semaphore.red.text` → `#bb1954` |

---

### M10. Footer

| Elemento | Copy exacto |
|----------|-------------|
| Línea principal | **© 2026 Efeonce Greenhouse · El ambiente diseñado para que tu marca crezca** |
| Links de navegación | **Pulse** · **Proyectos** · **Ciclos** · **Mi Greenhouse** · **Updates** |

Alineación: texto izquierda, links derecha. Color: `text.disabled`. Sin iconos.

---

### M11. Reglas transversales de formato

Estas reglas aplican a todo texto visible en el dashboard:

| Regla | Ejemplo correcto | Ejemplo incorrecto |
|-------|------------------|--------------------|
| Fechas | 12 mar 2026 | 03/12/2026, March 12 2026 |
| Fechas relativas (< 7 días) | hoy, ayer, hace 3 días | 13 mar 2026 (si es hoy) |
| Números con miles | 1.250 | 1,250 o 1250 |
| Decimales | 3,5 FTE | 3.5 FTE |
| Porcentajes | 90% | 90 %, noventa por ciento |
| Horas | 3:00 a.m. | 03:00, 3:00AM, 3 am |
| Delta positivo | +12 vs. mes anterior | (+12), ↑12 |
| Delta negativo | −56 vs. mes anterior | (-56), ↓56 |
| Dato no disponible | — | 0, null, N/A, - |
| División por cero | — | 0%, NaN%, Infinity |
| Tratamiento | tú | usted, vos |
| Signos de exclamación | Nunca | ¡Bienvenido!, ¡Listo! |

---

## Relación con otros Codex tasks

| Codex task | Relación |
|-----------|----------|
| `docs/tasks/complete/CODEX_TASK_Client_Dashboard_Redesign.md` | **Documento padre.** Este addendum es un complemento de diagnóstico visual. La arquitectura objetivo sigue siendo la definida en ese spec. |
| `docs/tasks/to-do/CODEX_TASK_Typography_Hierarchy_Fix.md` | Las correcciones tipográficas de este addendum (P1 #6) son un subset del fix de tipografía global. Ejecutar ese task primero resuelve gran parte de los problemas estéticos. |
| `docs/tasks/complete/CODEX_TASK_Team_Identity_Capacity_System.md` | La data de equipo y capacidad depende de las tablas BigQuery definidas en ese task. Si las tablas no existen aún, la vista de equipo muestra data mock o hardcoded — lo cual explica los "100%" en todos. |
| `docs/tasks/complete/CODEX_TASK_Space_Admin_View_Redesign.md` | La vista admin del Space es complementaria. Lo que se elimina de la vista cliente (botones admin, IDs internos, progress bars de allocation) debe seguir visible en la vista admin. |

---

*Efeonce Greenhouse™ • Efeonce Group • Marzo 2026*
*Documento técnico interno para agentes de desarrollo.*
