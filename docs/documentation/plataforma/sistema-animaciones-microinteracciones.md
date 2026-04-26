# Sistema de Animaciones y Microinteracciones del Portal

> **Tipo de documento:** Documentación funcional (lenguaje simple)
> **Versión:** 1.0
> **Creado:** 2026-04-26 por Claude (TASK-642)
> **Última actualización:** 2026-04-26
> **Documentación técnica:** [GREENHOUSE_MOTION_SYSTEM_V1.md](../../architecture/GREENHOUSE_MOTION_SYSTEM_V1.md)

---

## Para qué sirve este documento

Este documento explica **cómo se siente** el portal Greenhouse cuando lo usás: qué animaciones tiene, por qué están ahí, y qué transmite cada una. Está pensado para el equipo de producto, diseño y stakeholders que quieren entender la dimensión visual del portal sin entrar en código.

Si sos dev y querés saber **cómo implementar** una animación, leé el documento técnico.

---

## La filosofía detrás de las animaciones

El portal Greenhouse no se anima por gusto estético. Cada animación tiene una intención de UX específica:

- **Continuidad** → cuando hacés click en un cliente y vas al detalle, la información viaja en lugar de saltar.
- **Feedback** → cuando hacés click en un botón, sentís que respondió antes de que cargue la siguiente pantalla.
- **Jerarquía** → los datos importantes (KPIs financieros) llegan con más presencia que los datos secundarios.
- **Atención** → cuando un chart aparece al hacer scroll, la animación dirige la mirada al dato.

Lo que **NO** hacemos:

- Animaciones gimmicky (rebotes exagerados, parallax pronunciado, easter eggs).
- Decoración visual sin función.
- Animaciones que distraigan del trabajo operativo del usuario.

Greenhouse es plataforma operativa enterprise, no portfolio creativo.

---

## Las 8 dimensiones de motion del portal

### 1. Cross-page navigation (transiciones entre páginas)

**Qué pasa**: cuando vas de una lista a un detalle (por ejemplo `/finance/quotes` → `/finance/quotes/EO-COT-001234`), el nombre, status y identidad del item viajan suavemente desde la row hasta el header del detalle. No hay "corte" entre pantallas.

**Por qué importa**: confirma visualmente que estás viendo el mismo objeto. Es la diferencia entre "se cargó otra página" y "expandí lo que clickeé".

**Tecnología**: View Transitions API nativa del browser (Chrome, Safari, Firefox en progreso). Cero costo de bundle.

**Dónde lo ves hoy**: `/finance/quotes`, `/people` (TASK-525 cerrada). Próximas extensiones: `/finance/clients`, `/finance/suppliers`, `/campanas` (TASK-525.1 pendiente).

---

### 2. Microinteractions (hover, focus, press)

**Qué pasa**: cuando pasás el mouse sobre un botón, card o link, hay una respuesta sutil — un leve scale-up (1.02x), un cambio de sombra, un underline animado. Cuando hacés click, el elemento "se hunde" (0.97x). Cuando navegás con teclado, el elemento focalizado se ilumina con un glow.

**Por qué importa**: el portal "responde". Sin esto, los elementos clickeables se sienten estáticos y el usuario no sabe si su acción fue registrada.

**Tecnología**: tokens canónicos (`hoverScale`, `pressDepress`, `focusGlow`) aplicados globalmente vía MUI theme. CSS transitions livianas.

**Dónde lo verás**: en TODA la superficie del portal una vez ejecutada TASK-643. Es el primer slice del programa porque define los tokens que usan las demás dimensiones.

---

### 3. List mutations (cuando agregás, sacás o reordenás items)

**Qué pasa**: cuando agregás un line item a una cotización, la nueva fila aparece con fade-in y las demás se acomodan suavemente. Cuando sacás un item, hace fade-out y las siguientes se desplazan. Cuando reordenás (drag), las filas se mueven con física natural.

**Por qué importa**: hoy las listas "saltan" cuando cambian — la nueva fila aparece de golpe, la removida desaparece. Eso rompe el flow y hace que el usuario tenga que mirar dos veces para confirmar qué cambió.

**Tecnología**: librería `@formkit/auto-animate` (2 KB, zero-config). Drop-in: una línea de código por lista.

**Dónde lo verás**: editor de line items de cotizaciones, panel de addons sugeridos, chips de contexto, listas de people/agency, roster de HR, notification center. TASK-526.

---

### 4. Page entrance (cuando cargás una vista)

**Qué pasa**: cuando navegás a `/finance/intelligence` o cualquier vista, en lugar de aparecer instantánea, el contenido entra con un fade-in suave + un sutil slide-up de 8 píxeles, en 300ms.

**Por qué importa**: convierte cada navegación dentro del portal en una micro-experiencia premium. Hoy la sensación es "cut" — el contenido aparece de golpe. Con esto, el portal "respira".

**Tecnología**: wrapper `<GhPageEntrance>` usando Framer Motion. Coordinado con View Transitions para no animar doble cuando hay morph cross-page.

**Dónde lo verás**: 5+ vistas críticas (Finance, Payroll, Agency Pulse, People, Dashboard). TASK-644.

---

### 5. Skeleton crossfade (cuando los datos terminan de cargar)

**Qué pasa**: hoy cuando cargás una vista que necesita datos, ves un skeleton (placeholders grises animados) y cuando llegan los datos hay un swap brusco. Con esta dimensión, el skeleton hace fade-out mientras el contenido real hace fade-in superpuestos — cross-fade suave de 200ms.

**Por qué importa**: el cambio loading→loaded deja de ser un "flash" y pasa a ser una transición orgánica. La sensación es que los datos "aparecen" en lugar de "reemplazar".

**Tecnología**: wrapper `<SkeletonCrossfade>` con `AnimatePresence` de Framer Motion. TASK-644 (junto con page entrance).

---

### 6. KPI counter rolling (cuando aparecen las cifras importantes)

**Qué pasa**: cuando entrás a un dashboard (MRR/ARR, Finance Intelligence, ICO, Pulse, Portfolio Health), las cifras grandes (`$45.230.000`, `92%`, `1.245 horas`) no aparecen estáticas. **Ruedan** desde 0 hasta el valor final en 800-1200ms con física de spring.

**Por qué importa**: las cifras de KPI son lo primero que mira el usuario. Si aparecen estáticas, se sienten como "printout". Si ruedan, transmiten que el sistema está vivo, calculando, presentando un dato real.

**Tecnología**: wrapper `<AnimatedCounter>` con `useSpring` + `useTransform` de Framer Motion. Soporta formatos `es-CL` (CLP currency, percent, compact).

**Dónde lo verás**: KPI cards de los 5 dashboards principales del portal. TASK-645.

**Detalle importante**: cuando los datos cambian (por ejemplo, cambiás el filtro de mes), el contador interpola desde el valor visible actual al nuevo, **no resetea a 0**. Eso preserva la continuidad cognitiva del dato.

---

### 7. Scroll-triggered chart entrance (cuando los charts aparecen al hacer scroll)

**Qué pasa**: cuando un chart está más abajo del fold y hacés scroll para verlo, en lugar de aparecer ya renderizado, entra con fade + slide-up de 16 píxeles cuando entra al viewport.

**Por qué importa**: dirige la atención del usuario al chart en el momento exacto en que se hace visible. Crea sensación de revelación, no de "todo estaba ahí desde el inicio".

**Tecnología**: hook `useScrollReveal()` con `useInView` de Framer Motion (usa `IntersectionObserver` nativo, no scroll listener — es liviano). La animación dispara una sola vez por sesión por chart.

**Dónde lo verás**: charts de los 5+ dashboards críticos. Sinergia directa con la adopción de Apache ECharts (TASK-641). TASK-646.

---

### 8. List stagger (cuando una lista larga aparece)

**Qué pasa**: cuando entrás a `/people`, `/finance/clients` o `/finance/quotes` con una lista de 20+ items, las rows no aparecen todas a la vez. Entran una a una con un delay de 30-50ms entre cada una. Total: ~600ms para que toda la lista esté visible.

**Por qué importa**: una lista grande que aparece de golpe abruma; la misma lista entrando staggered se siente cinematográfica y enterprise. La mirada del usuario sigue naturalmente la cadencia.

**Tecnología**: wrapper `<StaggeredList>` con variants de Framer Motion. **Capped a 600ms total** — listas muy grandes (>20 items) reducen el delay automáticamente para no hacer esperar al usuario.

**Dónde lo verás**: 3+ listas largas del portal. TASK-646.

---

## Tabla resumen — qué dimensión se ve dónde

| Dónde | Qué animación verás |
| --- | --- |
| **Click en row de lista → detalle** | Cross-page navigation (morph del nombre/status) |
| **Hover sobre botón/card/link** | Microinteraction (scale, glow, underline) |
| **Click en botón** | Press depress + ripple |
| **Tab/Shift-Tab navegación con teclado** | Focus glow visible |
| **Carga de cualquier vista** | Page entrance (fade + slide-up) |
| **Datos llegan después de skeleton** | Skeleton crossfade (200ms suave) |
| **Dashboard se carga** | KPI counters rolling + charts entrando al scroll |
| **Agregar/sacar/reordenar item de una lista** | List mutation (auto-animate) |
| **Lista de 20+ rows aparece** | List stagger (entrada cinematográfica) |

---

## Reduced motion — accesibilidad

Si un usuario tiene activado **"Reduce motion"** en sus settings de sistema operativo (macOS: Accessibility → Display → Reduce motion; Windows: Settings → Ease of Access → Display → Show animations), el portal **respeta esa preferencia automáticamente**:

- Hovers/scales se desactivan (sin movimiento).
- Focus glow se mantiene (es señal de accesibilidad, no decoración).
- Page entrance pasa a fade simple de 100ms.
- KPI counters renderizan el valor final directo, sin rolling.
- Scroll reveal renderiza directo.
- Stagger se desactiva — todas las rows aparecen juntas pero suaves.
- View Transitions y auto-animate respetan reduced motion nativo.

Esto **no es opcional ni un nice-to-have**. Es una regla del sistema que cada animación nueva debe respetar antes de mergearse.

---

## Performance — cómo cuidamos que las animaciones no degraden el portal

Las animaciones del portal están diseñadas para **no impactar performance**:

- Solo se animan propiedades baratas (`transform`, `opacity`, `filter`) — nunca `width`/`height`/`top`/`left` que causan reflow.
- Scroll reveal usa `IntersectionObserver` nativo del browser, no scroll listeners (que causan jank).
- Stagger de listas largas tiene cap de 600ms total — no animamos 200 items en cascada.
- Validación manual obligatoria en mobile (LATAM, 3G/4G) antes de cada release.
- Si una animación causa frames > 16ms en un dispositivo mid-tier, se simplifica antes de shippearse.

---

## Cómo se evoluciona el sistema

El sistema está versionado:

- **V1 (vigente)**: las 8 dimensiones descritas arriba. Foundation completa.
- **V2 (futuro, no planificado)**: si emerge necesidad de motion choreography compleja (ej. multi-element morphs orquestados), se evaluará.
- **Decisiones cerradas**: NO usamos GSAP, Lottie, react-spring, Anime.js ni react-transition-group. Stack canónico es View Transitions API + Framer Motion + auto-animate.

Cualquier vista nueva del portal debe consumir el sistema. No se permite hardcodear timing inline ni introducir nuevas librerías de motion sin actualizar el documento técnico.

---

## Programa de implementación (TASK-642)

Este sistema completo se materializa a lo largo del **programa TASK-642 "Greenhouse Motion Polish Program 2026"**, dividido en 5 sub-tasks ejecutables incrementalmente:

| Sub-task | Cubre dimensión(es) | Effort |
| --- | --- | --- |
| TASK-643 | Microinteractions + tokens canónicos (foundation) | 4-6h |
| TASK-526 | List mutations (auto-animate) | 2-3h |
| TASK-644 | Page entrance + skeleton crossfade | 4-6h |
| TASK-645 | KPI counter rolling | 3-4h |
| TASK-646 | Scroll reveal + list stagger | 4-6h |

Total: ~17-25 horas distribuidas en 5 PRs independientes. Cada sub-task aporta valor visible al portal sin esperar a las demás.

**Cuando el programa cierre**, Greenhouse pasa de "estático con View Transitions cross-page" a "Linear/Stripe/Vercel-level moderno". Es la diferencia entre "una herramienta operativa más" y "una plataforma que se siente premium".

---

## Para profundizar

- **Detalle técnico (devs y agentes)**: [GREENHOUSE_MOTION_SYSTEM_V1.md](../../architecture/GREENHOUSE_MOTION_SYSTEM_V1.md)
- **Tokens de color, tipografía, spacing**: [GREENHOUSE_DESIGN_TOKENS_V1.md](../../architecture/GREENHOUSE_DESIGN_TOKENS_V1.md)
- **Stack UI canónico**: [GREENHOUSE_UI_PLATFORM_V1.md](../../architecture/GREENHOUSE_UI_PLATFORM_V1.md)
- **Programa coordinado**: [TASK-642 — Motion Polish Program 2026](../../tasks/to-do/TASK-642-motion-polish-program-2026.md)
