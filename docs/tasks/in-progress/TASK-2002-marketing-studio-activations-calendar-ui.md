# TASK-2002 — Marketing Studio: calendario de activaciones y ejecución en la UI

## Delta 2026-10-05 (cierre) — deploy, incidente ISSUE-180 y corrección del pool

**En producción:** Studio `3829a8b` (Vercel `3ai7wipv3`): rendimiento (`7e081d0`), motion v3.6 (`11ec7fa`), prefetch por
intención (`6e6ba64`) y conexiones compatibles con Vercel Fluid (`3829a8b`: `attachDatabasePool`, 2 conexiones por
instancia, 5 s de inactividad). **Medido en producción:** RSC del mes 226 → 95 KB (HTML 428 → 171 KB), hoja 242 →
111 KB; render del mes 686 → 450 ms, con filtro 923 → 447 ms, mes siguiente 794 → 452 ms; navegación con un navegador:
mes siguiente 80–210 ms, Semana 302 ms, hoja 508 ms, filtro 699 ms, siempre con señal visible desde el primer cuadro
(antes 0,36–1,4 s congelado).

**Incidente:** la primera medición con carga sintética (20 navegadores seguidos) más el prefetch en reposo agotó el tope
de 20 conexiones del rol web: ~18 min de 500 intermitentes en páginas (13:50–14:08 UTC). Mitigado (rollback, redeploy
fresco, sesiones inactivas liberadas) y corregido en `3829a8b`. Detalle: [ISSUE-180](../../issues/resolved/ISSUE-180-marketing-studio-pg-connections-exhausted-after-calendar-deploy.md).
Pendientes derivados: pooler de conexiones (task aparte) y reintento ante `bad certificate` del connector.

## Delta 2026-10-05 (noche) — rendimiento percibido y sistema de motion v3.6

**Commits (Studio `main`, locales, sin push; producción sigue en `5d962c4`).** `7e081d0` rendimiento y `11ec7fa` motion.
`pnpm check` y `pnpm --filter @studio/web build` verdes antes de cada commit. Push = deploy: espera la señal del operador.

**Rendimiento (medido).** Producción antes: TTFB ~0,32 s (el esqueleto llega primero) y total 0,6–0,8 s el mes, 0,4 s la
semana, 0,7–0,95 s con filtro; en navegación cliente la vista queda congelada sin señal 0,36–1,4 s (mes), 0,6–0,7 s
(hoja) y 1,4 s (filtro). El RSC del mes pesa 226 KB (HTML 428 KB) y ~150 KB son la bandeja «Ejecución sin activación»
(50 tarjetas con el post completo). Cambios:

- Lecturas de la página en paralelo (antes ~8 en cadena); `getCalendarRange`, `listActivations` y `activationProjection`
  paralelizan sus consultas (12 idas en serie → 3 rondas; con el pool de 3 de Vercel, ~4 oleadas).
- Catálogo de canales en memoria por versión publicada (inmutable; clave con revisión y fecha de publicación).
- Bandeja: texto recortado a las 2 líneas que ya mostraba y 8 ejecuciones con «Ver las N restantes». RSC del mes
  proyectado sobre la respuesta real de producción: 226 → 111 KB (se confirma al desplegar).
- Navegación en transición (`CalendarNav`): la vista anterior se queda y se atenúa si la espera pasa de 150 ms, con
  barra de progreso; hoja provisional en el mismo cuadro del clic; prefetch completo (`kind: 'full'`) de los períodos
  vecinos en reposo con `staleTimes.static` 60 s.
- Local, build de producción (mediana): render 9,5–17,5 → 4,5–12 ms; mes siguiente sin petición al servidor; primera
  señal visible ~30 ms tras el clic. El «después» de producción se mide tras el deploy.

**Motion v3.6 (aprobado en el canvas, artifact `D6uwRFMzvnaHzGDtDLvxBi` v48).** Tokens desde `axisMotion` (75–600 ms y
cuatro curvas) en `theme.generated.css`; `styles/motion.css` con alternativa reducida por momento; cambio de mes con
dirección y Mes/Semana/Día que se acerca desde hoy (React `<ViewTransition>`); FLIP y contador al filtrar; hoja, drawer,
diálogos, menús, selectores y popover con entrada y salida desde su origen; arrastrar para cerrar en hojas móviles;
escritura con spinner diferido, check, halo y aviso con Ver y Deshacer (Deshacer sólo en reprogramar). Contrato y
evidencia: [motion](../../ui/motion/TASK-2002-marketing-studio-activations-calendar-motion.md).

**Verificación local.** Playwright sobre build de producción en `:3103` contra la base local desechable, claro, oscuro y
390 px, con movimiento reducido emulado; videos revisados cuadro a cuadro (se corrigieron un cuadro vacío entre meses,
la salida de la hoja tras la provisional y una hoja de filtros que no seguía el dedo). Escritura real con ventana
temporal sólo en una configuración local propia, revertida: reprogramar → check → aviso → Deshacer restaura la fecha.
3 tests de integración del dominio fallan igual en HEAD sin estos cambios (preexistentes).

**Observado, fuera de alcance.** Si la vista previa del diálogo falla (p. ej. 422 `tracking_destination_invalid`), el
botón queda en «Validando contra el catálogo…» sin mostrar el error.

## Delta 2026-10-05 (tarde) — filtros v3.4, formulario, fecha y hora v3.5 y ventana de escritura

**Commits y deploys.** Studio `main` (push a `main` = producción), en orden: `c767283` (dimensiones en español y
mercados), `1f003c1` (ventana temporal de escritura), `bef0ecf` (menús de filtro v3.4), `e656f2a` (campos de selección
del formulario), `6dddbfa` (isotipo de X desde AXIS 0.4.21, TASK-2004) y `5d962c4` (fecha, hora e inicio/fin v3.5).
Vercel Production Ready: `phmizd8u0` (`1f003c1`), `kr5mfmw19` (`bef0ecf`), `b53xls9w2` (`6dddbfa`, incluye `e656f2a`) y
`p1ng5wy75` (`5d962c4`). `pnpm check` y `pnpm --filter @studio/web build` verdes antes de cada push.

**Qué se ve.**

- **Filtros en español:** Modalidad, Familia, Plataforma, Cuenta, Mercado, Campaña y Estado; los valores de marketing
  siguen en inglés (Paid, Organic, Owned, Earned, Social, Web & Content, Placement). Mercados atendidos por Efeonce
  (`SERVED_MARKETS`: CL, MX, CO, PE, US) en filtro y formulario (se quitó AR del formulario), más cualquier mercado que
  aparezca en los datos.
- **Menús de filtro (v3.4):** menú propio en vez de select nativo, con conteo por opción (activaciones del período
  visible con los otros filtros aplicados), cero atenuado pero elegible, lo elegido en cero sube a «Elegido», teclado
  ↑ ↓ Inicio Fin Enter Esc y búsqueda en Plataforma, Cuenta y Campaña. Plataforma separa «Con cuenta conectada»
  (elegibles) de «Sin cuenta conectada» (visibles, no elegibles); Familia se agrupa «Con/Sin activaciones en {mes}»;
  Cuenta lleva el dueño y la red o herramienta de pauta; Mercado lleva bandera en círculo. Un calendario vacío por un
  filtro de lugar lo explica («No hay activaciones en México en octubre») y ofrece quitarlo. En móvil, la hoja de
  filtros es una lista por filtro con grupos y conteos (reemplaza V3-MobFilters).
- **Formulario:** los campos de selección usan la misma fila del menú (check, ícono, nombre, bajada), búsqueda con más
  de 8 opciones, teclado y Esc que cierra el menú y no el formulario; «Sin especificar» elegible en Placement y Formato.
  Se corrigió que un clic en una opción reabriera el menú (el campo vive dentro de un `<label>`).
- **Fecha y hora (v3.5):** fecha con atajos (Hoy, Mañana, Próx. lunes), pasados atenuados y puntos en los días con
  activaciones de la cuenta elegida; hora escrita («1830») o por franjas de 30 min (07:00–22:30), con aviso ámbar que
  nombra la pieza si la cuenta ya tiene otra a esa hora (no bloquea); inicio y fin de paid en un selector de dos meses
  con el flight de la campaña marcado, atajos y total de días. Flota sobre la página y se abre hacia donde cabe; en
  teléfono es hoja inferior con celdas de 44 px. Reemplaza `DateTimeField` en Planificar y Reprogramar.
- **Isotipo de X** desde AXIS (antes caía a la letra).

**Verificación en producción.** Menús: Plataforma con LinkedIn e Instagram conectadas y el resto sin cuenta; Mercado
con banderas; México en cero → vacío explicado. Formulario: X con su logo; elegir LinkedIn cierra el menú. Fecha: punto
en el único día con activación de la cuenta; «Mañana» → mar 6 oct 2026. Hora: «1830» → 18:30 · Santiago.

**Decisiones del operador (2026-10-05).** Aprobó en el canvas las páginas «v3.4 · Filtros» (10 tableros; pidió banderas
en círculo, hechas) y «v3.5 · Fecha y hora» (10 tableros). En V3-Popover comentó «no se implementó»: se respondió en el
hilo que sí está (se abre con el número del día o «+N más») y se ofreció marcar el número como clickeable; espera su
respuesta.

**Ventana temporal de escritura.** Para probar las escrituras de la UI antes del login (TASK-1898), el operador eligió
«Producción abierta». Con `STUDIO_OPEN_WRITE_UNTIL` (ISO, máximo 7 días adelante) y `STUDIO_OPEN_WRITE_ORGS` válidas,
el modo `open` resuelve el actor `api_client` `open-write-window` con `studio:read` + `studio:write` sólo para esas
organizaciones: planificar, editar, reprogramar, cancelar, vincular y crear desde ejecución. Aprobar sigue exigiendo
persona. En producción vence el **2026-10-12T10:00:00Z** (07:00 de Chile) y cubre sólo la organización Efeonce.
Verificado: `permissions.writable=true`, `cancel` con `dryRun=true` 200 en ACT-000001 (sin escribir nada real) y sin
pastilla «Solo lectura». **Riesgo:** mientras esté abierta, cualquiera con el link escribe en la organización Efeonce y
el audit registra `api_client:open-write-window`, no una persona. **Retiro:** al vencer vuelve sola a solo lectura sin
redeploy; se retira al llegar TASK-1898 o antes si el operador lo pide (borrar las dos variables o poner una fecha
pasada). Detalle: [arquitectura §5](../../architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md#5-acceso)
y [runtime handoff](../../operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md#task-2002--calendario-de-activaciones-estado-al-2026-10-05).

**Pendientes.**

- ~~**Motion y rendimiento percibido**~~ — en producción desde el 2026-10-05 (`3829a8b`); ver el delta de cierre.
- **Mercados desde la configuración de la organización:** hoy la lista vive en el código web (deuda declarada).
- **Plataformas del catálogo sin etiqueta en Studio** (Discord, Slack, foros, Circle…) no aparecen en el filtro.
- **Conteos del filtro** sujetos al tope de 200 activaciones del período, como el calendario.
- Escrituras reales en producción (más allá del `dryRun` verificado) y su equivalente por MCP siguen sin probarse.

## Delta 2026-10-05 — hojas de email y página web en producción

Studio `3048f96` (push `1f2a0ef..3048f96`, Vercel Production Ready `kc4tcvuod`) construye las hojas sobre el contrato
de lectura de Codex (`1f2a0ef`, API 1.9.0, [campos](../../audits/marketing-studio/TASK-2001-activation-reader-sheets-2026-10-05.md)):

- **Email (V3-SheetEmail, MobSheetEmail):** De, Asunto y Preheader literales con conteo contra el catálogo (sin
  límite en el catálogo se muestra `n / —`, nunca uno inventado), Audiencia (listas/segmentos con contactos y
  exclusiones), vista previa Escritorio · Móvil · Bandeja (en el teléfono se apilan bandeja y email), evidencia
  programado/enviado/después del envío (entregados, aperturas, clics con su ventana).
- **Página web (V3-OwnedFormats, landing):** vista previa Escritorio · Móvil y lista con destino de N activaciones,
  formulario conectado (Growth Forms leído en la página publicada; `not_observed`/`unavailable` dicho como tal),
  URL en línea con HTTP y fecha de revisión, fecha de publicación observada o confirmada. El aviso
  `growth_forms_unavailable` vive en la lista y no se repite como recuadro.
- `null` se muestra «Sin dato en la fuente». Componentes `OwnedSheet.tsx` y `DeviceViews.tsx`.
- **Verificación:** local con datos de prueba en la base desechable (email de ACT-001012 y landing de ACT-001013),
  claro/oscuro y 390 px, conmutador probado; `pnpm check` y `pnpm --filter @studio/web build` verdes. En producción
  la API ya entrega `email`/`web` (null en las 6 activaciones, todas sociales); hoja social ACT-000001 sin regresión.
- **Pendiente:** el lado Greenhouse del contrato (metadata y métricas desde HubSpot/Resend) no está publicado; hasta
  entonces las activaciones existentes muestran «Sin dato en la fuente». No hay aún activaciones de email ni web en
  producción.

## Delta 2026-10-04 (revisión 1:1) — fidelidad a los tableros y lo pendiente

Revisión 1:1 de cada tablero aprobado contra lo implementado (Studio local, commits `f7b9790`…`00a51e5`, sin push):
Mes, Semana, Día, Línea de tiempo, Paid, Hoja, Popover «+N», estados y sus versiones móviles quedaron fieles al
generador de la dirección v3 (medidas, tokens, isotipos y copy). Paid pasó a ser el filtro Modality: Paid sobre el mes
(como en V3-Paid); el popover del día existe; la barra inferior del calendario muestra la evidencia por herramienta.

**Queda distinto, para terminar cuando exista lo necesario:**

| Diferencia | Por qué | Se termina con |
|---|---|---|
| ~~Hoja de email (V3-SheetEmail, MobSheetEmail)~~ | **Hecha el 2026-10-05** (`3048f96`) sobre el contrato `1f2a0ef` | Datos reales cuando se publique el lado Greenhouse del contrato |
| Hoja de blog (V3-BlogPre, V3-BlogPost): gate de publicación, búsqueda e intención, metadata/snippet, AEO, E-E-A-T, enlaces (la landing con formulario de V3-OwnedFormats quedó **hecha el 2026-10-05**, `3048f96`) | Falta el dossier SEO/AEO y la lectura de la web (TASK-1667/1669, SV360) | Esas tasks; hoy la hoja dice «no medido» |
| Filtros y formulario con menús v3.4 y fecha/hora v3.5 | **Hechos el 2026-10-05** (`bef0ecf`, `e656f2a`, `5d962c4`). Quedan: mercados desde la configuración de la organización, plataformas del catálogo sin etiqueta en Studio y conteos con el tope de 200 | Deuda de configuración y etiquetas; sin task |
| ~~Motion y rendimiento percibido (operador: 3/5)~~ | **En producción el 2026-10-05** (`3829a8b`) con la dirección «v3.6 · Motion» aprobada, medido antes/después | — |
| Selector de vista en la Semana con «Línea de tiempo» como tercera opción | V3-Week no ofrece entrada a la línea de tiempo y un segundo selector rompe la fila de título | Decisión del operador si se prefiere otra entrada |
| Encabezado global (lockup «Marketing Studio» y riel) | Es del portal completo, no del calendario | Fuera de esta task |
| Diálogos de escritura (Planificar, Editar, Reprogramar, Cancelar, Vincular, Crear desde ejecución) | **Hechos y verificados en local** (`c2014ba`, `fce8d99`) con escrituras reales contra la base local y un actor de escritura temporal autorizado por el operador (no commiteado, revertido). En producción el modo es abierto: siguen deshabilitados con su motivo y la API responde 403 `write_not_allowed`. **2026-10-05:** habilitados temporalmente en producción para la organización Efeonce por la ventana de escritura (`1f003c1`, vence 2026-10-12T10:00Z); verificado sólo con `cancel` en `dryRun`. Fecha y hora con los selectores v3.5 (`5d962c4`) | Se habilitan de forma definitiva cuando exista el actor (TASK-1898 web / TASK-2003 MCP); no requieren más código. La ventana se retira al llegar TASK-1898 |

**Rollout 2026-10-04:** Studio `main` publicado (`aa6fa07..10513ef` y `10513ef..d0ec7e0`), Vercel Production Ready
(`otc14ubb7`), `STUDIO_ACTIVATIONS_ENABLED=true` en Production: `studio.efeonce.org/calendar` sirve el calendario v3
en solo lectura. También quedaron hechos: preview por formato (V3-Formats: video, carrusel, horizontal, grupo de
recursos), Entrar → popover y anuncio en vivo al filtrar (V3-A11y), «Pieza sin aprobar» y hora de Santiago en las
tarjetas (V3-States32), conteo en la hoja de filtros móvil (MobFilters). Fuera de alcance por diseño: V3-Gantt
(alternativa reemplazada por la línea de tiempo v3.1), V3-Later, V3-Quarter, V3-SheetMore y V3-Bulk (TASK-2005/2006).


## Delta 2026-10-04 (implementación) — lectura completa en local

Implementado en `efeonce-marketing-studio` (local, sin push) contra el contrato de TASK-2001, con Postgres 18 descartable
(datos copiados de staging en sólo lectura, más activaciones de ejemplo que nunca salen del equipo):

- **Vistas:** Mes (dos tarjetas por día y «+N más» → vista Día; una franja de pauta por campaña con el estado más grave),
  Semana (franjas mañana · tarde · noche; en móvil, lista por día), Día, Línea de tiempo (fila por plataforma y cuenta,
  carriles para no superponer pauta) y Pauta (plan, herramienta y entrega por línea; en móvil, tarjetas).
- **Filtros** por modality, family, platform, account, mercado, campaña y estado, en la URL.
- **Hoja** de activación (pantalla completa en móvil): pieza con escenario fijo, preview de email y web en claro, copy
  literal, evidencia por herramienta, avisos del reader, tracking URL con copiar y sus advertencias, historial; en blog,
  CMS, sitio y «Borrador en Content Hub». Foco al título, Esc y fondo cierran, foco de vuelta a la tarjeta.
- **Bandeja** «Ejecución sin activación», frescura por herramienta y «Sin fechas». Pestaña Calendario de la campaña con
  sus activaciones. Esqueleto de carga con «Sigue cargando…». Teclado de la grilla según V3-A11y.
- **Isotipos** desde AXIS `@efeoncepro/axis-brand-assets` 0.4.20 (publicado hoy por TASK-2004): negativos sellados en
  oscuro, Facebook, Threads, HubSpot, Metricool y Notion. X y WordPress van con inicial porque AXIS no los tiene.
- **Escrituras:** «Planificar», «Editar», «Reprogramar», «Cancelar», «Vincular» y «Crear activación» se muestran con
  `aria-disabled` y la razón. En modo abierto el reader devuelve `writable: false` y no hay actor con permiso de
  escritura, así que los formularios y diálogos de v3.2 quedan para cuando exista la autoridad (TASK-1898 en la web,
  TASK-2003 por MCP).
- **Desvíos de la dirección aprobada:** «+N» lleva directo a la vista Día (sin popover); los filtros en móvil son una fila
  deslizable (sin hoja); las secciones SEO/AEO del blog muestran «no medido» hasta que exista su contrato.
- **Evidencia:** `docs/ui/visual-sources/TASK-2002-marketing-studio-activations-calendar/after-*.webp` (18) y
  `docs/ui/reviews/TASK-2002-marketing-studio-activations-calendar.scorecard.json` (promedio 4,38).

## Delta 2026-10-04 (blog) — hoja de blog con SEO y AEO

El operador revisó en el canvas (página `v3.2 · Planificar y operar`) las hojas «Blog · antes de publicar» y «Blog ·
después de publicar», pidió ajustes por comentario (CMS del cliente, enlace al borrador y legibilidad) y quedaron
incorporados. Renders: `approved-v32-blogpre*.webp` y `approved-v32-blogpost*.webp`. Decisiones:

- La hoja de blog tiene dos pestañas de trabajo: **Antes de publicar** (gate de publicación arriba con «N de 18» y lo que
  falta; búsqueda e intención; metadata y snippet; fan-out y citabilidad; E-E-A-T y schema; enlaces y CTA) y **Después
  de publicar** (publicación e indexación; Search Console de 28 días; visibilidad en motores de IA; tráfico y
  conversión; frescura).
- La cabecera muestra **CMS** (el del cliente: WordPress, Drupal, Webflow, Modyo, HubSpot CMS u otro) separado de
  **Sitio**, y el enlace **«Borrador en Content Hub»** con el isotipo de Notion, porque los borradores se escriben ahí.
- Lectura antes que texto: indicadores en tarjetas con número grande, chips de estado (verde/ámbar con ícono, nunca sólo
  color), tablas enmarcadas con números alineados a la derecha y explicaciones de método plegadas («Cómo se obtiene»,
  «Cómo se mide»).
- Cada dato lleva su honestidad: «Estimado · tercero» con fuente y fecha, «Medido» para Search Console, el AI Visibility
  Grader y GA4, y «no medido» si no hay dato. «Sin medir» es distinto de «No aparece».
- Studio no publica: registra la autorización y lee la evidencia; el contrato de datos está en el delta «(blog)» de
  TASK-2001. El dossier SEO/AEO y su medición quedan como follow-up de contrato, así que esta UI muestra esas secciones
  vacías («no medido») hasta que exista.
- Decidido por el operador: volumen y dificultad desde el **SV360** («Estimado · SV360 · Chile · [fecha]»); panel de
  prompts **por clúster temático** («Medido · panel del clúster [nombre]»); el gate **sólo avisa** («N de 18 · M avisos»
  y «El gate avisa, no bloquea: se puede autorizar con avisos y quedan registrados en la autorización»). Renders
  actualizados.

## Delta 2026-10-04 (posterior) — dirección visual aprobada

El operador aprobó el 2026-10-04 todas las páginas del canvas — `v3 · Calendario de activaciones`, `v3.1 · Línea de
tiempo por plataforma`, `v3.2 · Planificar y operar` y `v3.3 · Siguiente iteración y después` — y las decisiones
propuestas: estados paid `delivering`/`ended`, tolerancia de 0 días, la pauta resumida en el mes, la línea de tiempo en
vez de canvas libre, isotipos en negativo (TASK-2004), dos tarjetas por día y «+N» desde la tercera, pantallas de
1440×1100, la evidencia owned (HubSpot para email; lector del WordPress del sitio público para blog y landing, en
TASK-2001) y los previews de email y web siempre en claro. Los renders aprobados viven en
`docs/ui/visual-sources/TASK-2002-marketing-studio-activations-calendar/approved-v3-*.webp`; el wireframe y el flow
quedaron conciliados y `UI ready` pasa a `yes`. Lo de v3.3 (trimestre, historial, comentarios, lote, exportar, vista de
cliente, propuesta por agente) sale de esta task: contrato en TASK-2005 y UI en TASK-2006.

## Delta 2026-10-04 — dirección visual v3 y decisiones del operador

Dirección visual en revisión en el [canvas «Efeonce Marketing Studio»](https://claude.ai/artifact/D6uwRFMzvnaHzGDtDLvxBi): página «v3 · Calendario de activaciones»
(mes, semana, Gantt alternativo, hoja, bandeja y «Vincular», estados, pauta y móvil, en claro y en oscuro) y página
«v3.1 · Línea de tiempo por plataforma». Decisiones del operador (2026-10-04):

- **Pauta en el mes:** una franja por campaña con el plan y, encima, el peor estado de sus líneas en texto
  («CMP-001 · Paid · 3 líneas · 1 vencida»). Las tres capas (plan, fechas en la herramienta, entrega observada) se leen sólo
  en la vista de pauta, la línea de tiempo y la hoja. Estados `delivering`/`ended` y tolerancia de 0 días: ver TASK-2001.
- **Vista por plataforma:** no un canvas libre, sino una línea de tiempo con ejes fijos (fechas arriba, filas a la izquierda),
  escala Día · Semana · Mes, grupos por platform con accounts plegables y conteo, sólo filas con actividad por defecto
  («Mostrar todas») y filas virtualizadas.
- **Marcas:** isotipos oficiales de AXIS para plataformas y herramientas, en color en tema claro y en negativo en oscuro;
  logotipo de Metricool donde cabe el nombre. Pendiente registrar en `@efeoncepro/axis-brand-assets` los negativos y los
  isotipos de Facebook y Threads (hoy tomados de @iconify/json, CC0); la UI los consume de ahí, nunca de copias.
- Pantallas de escritorio a 1440×1100, igual que v2.

## Decisión vigente 2026-10-04 (posterior) — escritura por MCP con TASK-2003

El operador decidió (2026-10-04, después de retirar TASK-1899) que Efeonce es agent-friendly y que todo lo de EPIC-049
nace Full API Parity con sus tools en el MCP, **escrituras incluidas**. La «nueva decisión» que dejaba pendiente la
retirada de TASK-1899 es **TASK-2003**: núcleo de escritura por MCP con identidad delegada (scope en Entra, canje por
capability exacta, persona como actor, gateway con escrituras `T1`), **sin** aprobaciones ni `proposalDigest`, que
siguen retirados en TASK-1899. Las escrituras `T1` de esta task se federan sobre TASK-2003 cuando esté vivo; las `T2`
siguen por CLI/UI. La implementa Codex.

**Sin bloqueo** (revisión de Codex aceptada por el operador, 2026-10-04): esta task **no espera** a TASK-2003. Se
construye en paralelo (API, CLI y UI) con todas sus tools en el manifiesto; sus escrituras se federan por MCP en cuanto
TASK-2003 esté vivo.

## Decisión vigente 2026-10-04 — desarrollo sin TASK-1899

El operador retiró TASK-1899 por la fricción que añadiría en esta etapa. Su diseño de escritura MCP deja de ser
prerrequisito de desarrollo y cierre del alcance API/CLI/UI de esta task. La federación de escrituras MCP y su
verificación se retiran del alcance actual, pendientes de una nueva decisión; nunca se declaran operativas por
cerrar ese alcance. Esta decisión prevalece sobre las referencias y criterios MCP de TASK-1899 conservados más
abajo. API-first, dependencias funcionales y controles de acceso existentes siguen vigentes.


<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-10-04 — Full API Parity y operación por MCP obligatorias (decisión del operador)

- **Regla:** esta UI no tiene lógica propia: cada acción que muestra (planificar, editar, reprogramar, cancelar, vincular, crear desde ejecución, ver la tracking URL) es un command o reader de TASK-2001 con ruta `/api/v1`, entrada en
  el registro con **tool** (exclusión sólo para transporte o metadatos, nunca para una capacidad de negocio) y **tool
  federada y operable por Efeonce MCP**, lecturas **y escrituras**, con la identidad delegada de la persona
  (carril de TASK-2003: clase `efeonce.mcp.marketing_studio.write`, canje por capability exacta, persona como actor;
  las aprobaciones `T2` siguen por CLI/UI mientras TASK-1899 esté retirada). La UI es un cliente más de esos commands.
- **Cierre:** la task no se cierra hasta que una **sesión MCP real** (token Entra humano) ejecuta cada operación nueva
  —leer, planificar y editar (las `T2` por CLI/UI mientras TASK-1899 esté retirada)— y la evidencia queda registrada. Manual servido
  (`docs/mcp/skills/marketing-studio/SKILL.md`) actualizado con las tools nuevas.
- **Orden:** no espera a TASK-2003. Toda operación nace con su tool en el manifiesto; las lecturas se federan y prueban al
  cerrar; las escrituras se federan y prueban por MCP cuando TASK-2003 esté vivo (si ya lo está al cerrar, se prueban ahí).

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-2002-marketing-studio-activations-calendar.md`
- Flow: `docs/ui/flows/TASK-2002-marketing-studio-activations-calendar-flow.md`
- Motion: `docs/ui/motion/TASK-2002-marketing-studio-activations-calendar-motion.md`
- Backend impact: `none`
- Epic: `EPIC-049`
- Status real: `En producción (Studio 3829a8b, deploy 3ai7wipv3): calendario v3, hojas email/web, filtros v3.4, fecha/hora v3.5, rendimiento percibido y motion v3.6, con conexiones compatibles con Vercel Fluid (ISSUE-180 resuelto). Escrituras T1 habilitadas sólo para Efeonce por la ventana temporal hasta 2026-10-12T10:00Z. Pendiente: escrituras definitivas con TASK-1898, sesión MCP real (TASK-2003), pooler de conexiones, mercados desde configuración, plataformas sin etiqueta y datos reales de email/web`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-2001 (activaciones, evidencia, avisos, eventos y reader del calendario) · TASK-1895 si sus primitives Sheet/ConfirmDialog no existen aún (si no, esta task las crea con el mismo contrato)`
- Branch: `efeonce-marketing-studio main (componentes y copy) · Greenhouse develop (docs, capturas, scorecard); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Convierte el calendario de Studio (global `/calendar` y la pestaña Calendario de cada campaña) en el **calendario de
activaciones**: filtros por modality, family, platform, account y mercado; tarjetas con la miniatura de la pieza y el **estado de
ejecución** (Planificada, Programada, Fuera de plan, Publicada, Vencida, Cancelada); hoja de detalle con la evidencia de la
herramienta; y la bandeja **«Ejecución sin activación»** para vincular o crear la activación de lo que se programó en
Metricool sin pasar por Studio. Consume el contrato de TASK-2001.

## Why This Task Exists

- El operador decidió (ADR de estrategia §15, 2026-10-04) que el calendario es de Studio y que Metricool es evidencia de
  ejecución; la UI vigente sólo pinta vuelos y los posts importados, con la portada de la campaña como miniatura.
- Lo programado en Metricool sin catálogo (14 publicaciones del 4 al 20/10, 3 visibles en Studio) necesita un lugar
  visible para resolverse, nunca invisible.

## Goal

- Ver y filtrar el plan de salida de todas las campañas por las cuatro dimensiones.
- Leer en cada tarjeta si la salida está planificada, programada, fuera de plan, publicada o vencida.
- Resolver la ejecución sin activación con dos acciones (vincular o crear) sin salir del calendario.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_STRATEGY_LAYER_DECISION_V1.md` (§15)
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md` (§8 Interfaz)
- `docs/ui/flows/EPIC-049-marketing-studio-UI-FLOW.md` (nodos `MS-N1`, `MS-N3`, `MS-N4`)

Reglas obligatorias:

- La UI sólo pinta readers y llama commands de TASK-2001; no calcula estados de ejecución.
- Programado nunca se muestra como publicado; estados siempre con texto.
- Copy en `apps/web/src/copy.ts`; dimensiones de canal en el spanglish decidido (Paid, Organic, Social, Search…).

## Normative Docs

- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/ui/wireframes/TASK-2002-marketing-studio-activations-calendar.md`
- `docs/ui/flows/TASK-2002-marketing-studio-activations-calendar-flow.md`

## Dependencies & Impact

### Depends on

- TASK-2001 (contrato), TASK-1905 (catálogo para los filtros), TASK-1999 (reproductor de video en la hoja).

### Blocks / Impacts

- TASK-1895: comparte `Sheet`/`ConfirmDialog` y el diálogo de conflicto.
- TASK-1911: su UI de calendario unificado queda cubierta aquí; experimentos se suman como capa después.

### Files owned

- `efeonce-marketing-studio/apps/web/src/app/calendar/page.tsx`
- `efeonce-marketing-studio/apps/web/src/components/{CalendarGrid,ActivationCard,ActivationSheet,ActivationFilters,UnlinkedExecutions}.tsx` `[verificar nombres al tomarla]`
- `efeonce-marketing-studio/apps/web/src/copy.ts` + `copy.test.ts`, `apps/web/src/styles/app.css`
- Greenhouse: wireframe, flow, capturas y scorecard de esta task

## Current Repo State

### Already exists

- Calendario mensual `/calendar?month=` (franjas de vuelo, tarjetas de post con hora y red, lateral «Sin fechas») y pestaña Calendario de la campaña; capturas `before-*` del 2026-10-04.
- Reproductor de video en el inspector (TASK-1999), reusable en la hoja.

### Gap

- Sin filtros por dimensión, sin estados de ejecución, sin hoja de activación, sin bandeja de ejecución sin activación, sin vista semana ni lista móvil.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `efeonce-marketing-studio` — página de calendario y componentes de `apps/web`
- Future candidate home: `remain-shared`
- Boundary: consume readers y commands de TASK-2001 por `/api/v1`
- Server/browser split: la página arma el calendario en el servidor con el reader; los componentes cliente sólo llaman la API para escribir
- Build impact: `none`
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador de marketing, responsable de medios, community manager.
- Momento del flujo: revisión semanal y diaria de salidas (nodo `MS-N4`, pestaña Calendario de `MS-N3`).
- Resultado perceptible esperado: ver qué sale, dónde y cuándo, y si coincide con lo programado.
- Friccion que debe reducir: abrir Metricool para saber qué está programado y no ver lo que se programó fuera de Studio.
- No-goals UX: programar o publicar desde Studio; métricas de desempeño.

### Surface & system decision

- Surface: `/calendar` y `/campaigns/[campaignId]?tab=calendar`.
- Nav placement: `none` (destinos existentes).
- Composition Shell: `no aplica` — Studio usa su propio `Shell`.
- Primitive decision: `extend` — grilla, tarjetas y lateral vigentes; `Sheet`/`ConfirmDialog` de TASK-1895.
- Adaptive density / The Seam: `no aplica`.
- Floating/Sidecar/Dialog decision: `ActivationSheet` lateral (pantalla completa en móvil); `LinkExecutionDialog`; `ConfirmDialog` para cancelar.
- Copy source: `local one-off` en `apps/web/src/copy.ts` de Studio.
- Access impact: `none` (escritura según `permissions` del reader).

### State inventory

- Default: grilla del mes con chips de estado.
- Loading: esqueleto con la forma de la grilla; «Sigue cargando…» a los 10 s.
- Empty: «No hay activaciones en este período con estos filtros.» + «Limpiar filtros»; primer uso: «Todavía no hay activaciones» + «Planificar activación».
- Error: «No pudimos cargar el calendario.» + Reintentar.
- Degraded / partial: aviso de lectura de la herramienta atrasada.
- Permission denied: acciones `aria-disabled` con la razón.
- Long content: «+N» por día; nombres de campaña con elipsis.
- Mobile / compact: semana como lista por día; filtros en hoja; hoja de activación a pantalla completa; pauta como tarjetas con mini línea de tiempo.
- Keyboard / focus: roving tabindex en la grilla; flechas, Inicio/Fin, Re Pág/Av Pág, T (hoy), Entrar, Esc; foco al título de la hoja y de vuelta a la tarjeta (contrato en el artboard `V3-A11y`).
- Reduced motion: sin animación propia.

### Interaction contract

- Primary interaction: abrir la hoja de una activación.
- Hover / focus / active: tarjetas con `:focus-visible` vigente.
- Pending / disabled: «Guardando…» con `aria-busy`.
- Escape / click-away: Esc cierra la hoja (con confirmación si hay cambios).
- Focus restore: vuelve a la tarjeta de origen.
- Latency feedback: botón pendiente; la tarjeta se actualiza con la respuesta del command.
- Toast / alert behavior: región `aria-live` única del `Shell`.

### Motion & microinteractions

- Motion primitive: sistema de motion v3.6 (`styles/motion.css` + `CalendarNav` + `<ViewTransition>`); contrato en el doc de motion.
- Enter / exit: hoja 300/200 ms, menús y popover 200/150 ms desde su origen, aviso 200/150 ms.
- Layout morph: View Transition por período (dirección) y por nivel de vista (acercar/alejar); FLIP al filtrar.
- Stagger: filas en la primera carga, 30 ms (máx. 8).
- Timing / easing token: `--motion-*` y `--ease-*` desde `axisMotion`.
- Reduced-motion fallback: fundidos de 150 ms; sin FLIP, escalonado, halo ni anillo; el arrastre sigue funcionando.
- Non-goal motion: arrastrar tarjetas para reprogramar (follow-up).

### Implementation mapping

- Route / surface: `apps/web/src/app/calendar/page.tsx` y pestaña Calendario de la campaña.
- Primitive / variant / kind: grilla y tarjetas extendidas; `Sheet` `md`.
- Component candidates: `CalendarHeader`, `ActivationFilters`, `CalendarGrid`, `WeekBands`, `DayView`, `DayPopover`, `PlatformTimeline`, `SpanBar`, `PaidLines`, `ActivationCard`, `ActivationSheet`, `PiecePreview`, `ActivationForm`, `ReprogramDialog`, `LinkExecutionDialog`, `UnlinkedExecutions`, `ExecutionFreshnessBar`.
- Copy source: `apps/web/src/copy.ts` (`execution`, `activations`, `channels`).
- Data reader / command: `GET /api/v1/calendar` con filtros (incluye mercado); `getActivation` con evidencia, avisos y eventos; `listUnlinkedExecutions`; commands `planActivation`, `updateActivation`, `rescheduleActivation`, `cancelActivation`, `linkExecution`, `unlinkExecution`, `createActivationFromExecution` (TASK-2001).
- API parity: escritura sólo por `/api/v1`.
- Access / capability: `marketing_studio.campaign.write` en servidor.
- States to implement: ready, loading, empty, partial, error, denied.

### GVC scenario plan

- Scenario file: script Playwright (Chrome) contra `localhost:3100` sobre staging; versionado en el harness de TASK-1895 si ya existe.
- Route: `/calendar?month=2026-10`, `?view=week`, `?view=day`, `?view=timeline`, `?activation=<id>`, `/campaigns/CMP-001?tab=calendar`.
- Viewports: 1440×1100 y 390×844, claro y oscuro.
- Quality profile: `premium`
- Required steps: filtros; hoja programada, vencida, paid en curso y email; planificar; reprogramar con aviso; vincular; crear desde ejecución; cancelar; recorrido con teclado.
- Required captures: las 15 `after-*` del wireframe (mes claro y oscuro, semana, día, línea de tiempo, pauta, hojas, formularios, móvil).
- Required `data-capture` markers: `calendar-filters`, `calendar-grid`, `activation-card`, `activation-sheet`, `unlinked-executions`.
- Assertions: chip = estado del reader; ninguna «Publicada» sin `publishedAt`; miniatura de la pieza.
- Scroll-width checks: `scrollWidth <= clientWidth` en 1440 y 390.
- Reduced-motion / focus evidence: hoja con `reducedMotion: 'reduce'`; recorrido por teclado.
- Review dossier: capturas `after-*` + scorecard `docs/ui/reviews/TASK-2002-marketing-studio-activations-calendar.scorecard.json`.
- Baseline decision / surface ID: `studio-calendar-activations`; línea base `approved-v3-*` (canvas versión `1791147930-57cf`).

### Design decision log

- Decision: el calendario vigente pasa a ser de activaciones, con filtros por dimensión, estados de ejecución, hoja y bandeja de no vinculados.
- Alternatives considered: espejo de Metricool (descartado por el operador); Gantt por plataforma en la semana (reemplazado por la línea de tiempo de v3.1); canvas libre con pan/zoom (descartado); baldosa blanca para isotipos (reemplazada por negativos); bandeja sólo en Hoy (descartado).
- Why this pattern: conserva la dirección aprobada y junta plan y ejecución.
- Reuse / extend / new primitive: extiende lo vigente; reusa primitives de TASK-1895.
- Open risks: dependencias de TASK-1905 y TASK-2001 (avisos, eventos, mercado, lector de la web); isotipos en negativo hasta TASK-2004.

### Visual verification

- GVC scenario: ver plan.
- Viewports: 1440×1100, 390×844.
- Required captures: `after-*` listadas.
- Required `data-capture` markers: los cinco del plan.
- Scroll-width check: sí.
- Accessibility/focus checks: grilla con nombres accesibles, foco en hoja, estados con texto.
- Before/after evidence: `before-*` (2026-10-04) vs `after-*`.
- Known visual debt: arrastrar para reprogramar (follow-up).
- Visual scorecard: `docs/ui/reviews/TASK-2002-marketing-studio-activations-calendar.scorecard.json`
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Dirección visual (hecho 2026-10-04)

- Páginas v3, v3.1 y v3.2 aprobadas por el operador; renders `approved-v3-*.webp`; wireframe y flow conciliados; `UI ready: yes`.

### Slice 2 — Calendario y filtros

- Grilla mes/semana/día, línea de tiempo por plataforma, tarjetas con pieza e isotipo y estado, franjas paid con resumen, vista de pauta, filtros (incluido mercado) en la URL, lista móvil, carga, primer uso y contrato de teclado.

### Slice 3 — Hoja y acciones

- `ActivationSheet` con preview por formato (video, carrusel, horizontal, grupo de recursos, email, blog, landing), copy literal, evidencia, avisos de pieza y editar/reprogramar/cancelar; formulario `Planificar`/`Editar`; diálogo `Reprogramar`; bandeja de ejecución sin activación con vincular y crear desde ejecución.
- Bloque **Tracking URL** en la hoja: la URL generada por TASK-2001 con botón copiar, sus parámetros legibles y las advertencias `tracking_missing` / `tracking_mismatch` / `tracking_frozen`; la UI nunca arma ni edita UTM.

### Slice 4 — Evidencia

- Capturas, scorecard, scroll y foco; manual de uso.

## Out of Scope

- Contrato y descubrimiento (TASK-2001); publicar o programar en herramientas; métricas; arrastrar para reprogramar; lo de v3.3 (trimestre, historial, comentarios, lote, exportar, vista de cliente, propuesta por agente: TASK-2005/2006).

## Detailed Spec

Ver wireframe y flow de esta task.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (dirección aprobada) antes de cualquier JSX; TASK-2001 en el mismo ambiente antes de Slice 2.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Densidad ilegible con muchas activaciones | UI | medium | «+N» por día, vista semana y filtros | revisión de capturas |
| El estado pintado no coincide con el reader | UI | low | la UI no calcula estados; aserción en el escenario | aserciones Playwright |

### Feature flags / cutover

- Usa `STUDIO_ACTIVATIONS_ENABLED` de TASK-2001 (sin flag propio).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | sin runtime | — | sí |
| Slice 2–3 | flag OFF o revert + push | 5 min | sí |
| Slice 4 | sin runtime | — | sí |

### Production verification sequence

1. Local contra staging con capturas y aserciones.
2. Push de Studio `main` con autorización del operador y el flag ON en producción.

### Out-of-band coordination required

- Autorización de push del operador (la dirección visual ya está aprobada).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Se declaró `Execution profile: ui-ux`, `UI impact: flow`, wireframe y flow existentes; `UI ready` pasa a `yes` sólo con la dirección v3 aprobada y `pnpm task:lint --task TASK-2002` sin hallazgos.
- [x] El calendario filtra por modality, family, platform, account, mercado, campaña y estado, con los filtros en la URL. _(2026-10-05: menús v3.4 con conteo por opción, en producción desde `kr5mfmw19`; verificado Plataforma, Mercado con banderas y México en cero con vacío explicado.)_
- [x] Cada tarjeta muestra la pieza, la plataforma, la cuenta y el estado de ejecución con texto; ninguna «Publicada» sin fecha observada. _(2026-10-04: pieza, plataforma, hora y estado con texto, y ninguna «Publicada» sin `publishedAt` — verificado en las 18 activaciones; la cuenta va en la etiqueta accesible y en la hoja, pero no se ve en la tarjeta compacta del mes.)_
- [x] La bandeja «Ejecución sin activación» permite vincular y crear activación, y baja su conteo al resolver. _(2026-10-04: verificado en local con escrituras reales — 3 → 1 al vincular y crear desde ejecución; en producción queda deshabilitado hasta que exista un actor con permiso.)_ _(2026-10-05: con la ventana temporal de escritura la bandeja queda habilitada en producción para Efeonce, pero vincular y crear desde ejecución no se probaron allí; sólo `cancel` en `dryRun`.)_ _(2026-10-04: la bandeja lista lo programado sin activación con su conteo; «Vincular» y «Crear activación» se muestran con `aria-disabled` y la razón, porque en modo abierto no hay actor con permiso de escritura hasta TASK-1898/TASK-2003.)_
- [x] Copy en `apps/web/src/copy.ts` con test; sin voseo.
- [x] Sin scroll horizontal de página en 1440 y 390; capturas y scorecard registrados.
- [x] La hoja muestra la tracking URL de la activación (copiar) y sus advertencias; ninguna UTM se construye en el cliente.
- [ ] Cada acción de la UI tiene su equivalente probado en una sesión MCP real (mismo command, identidad delegada). _(Pendiente de TASK-2003. La ventana temporal de escritura del 2026-10-05 no cuenta: es la web en modo `open`, sin identidad delegada.)_
- [x] `pnpm check` y `pnpm build` de Studio verdes. _(2026-10-05: verdes antes de cada push de `c767283` a `5d962c4`.)_ _(2026-10-04: `pnpm check` completo y `pnpm --filter @studio/web build` verdes antes de cada push.)_ _(2026-10-04: typecheck, lint y 22 tests de `@studio/web` verdes; el `pnpm check` completo falla por el trabajo en curso de Codex en `packages/domain` (delta de email), ajeno a esta task. Se corre de nuevo cuando ese trabajo esté commiteado.)_

## Verification

- `pnpm check` y `pnpm build` (Studio)
- Escenario Playwright contra `localhost:3100`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] Manual de uso y documentación funcional de Marketing Studio actualizados

## Follow-ups

- TASK-2005 (contrato) y TASK-2006 (UI): trimestre, identidad de campaña, feriados, historial, resultados, comentarios, acciones en lote, exportar, vista de cliente y propuesta por agente.
- TASK-2004: isotipos en negativo en AXIS.
- Arrastrar tarjetas para reprogramar.
- Capa de ventanas de experimento (TASK-1911).
