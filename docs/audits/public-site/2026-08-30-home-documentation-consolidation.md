# Home — auditoría de consolidación documental

Fecha: 2026-08-30. Alcance: fuente, contratos, pruebas, evidencia persistida y lectura del WordPress
publicado después de las iteraciones de Home. Esta auditoría no publica cambios ni certifica el rework
completo de TASK-1358. El historial visual por entrega permanece en
[revisión visual](2026-08-30-home-visual-review.md); el contrato vigente pertenece a
[Agency Elementor Modules](../../architecture/public-site/AGENCY_ELEMENTOR_MODULES_V1.md).

## Verdict

**CONDITIONAL PASS** para consolidar lo construido y su evidencia; **no es aprobación final de
copy/claims, accesibilidad integral ni edición desde la interfaz Elementor**.

Estado de este alcance: auditoría documental completa. Home está publicada; no hay un rollout nuevo
pendiente de esta auditoría. TASK-1358 conserva `to-do` / `UI ready: no` hasta resolver sus gates propios.

## Scope

- Runtime inspeccionado: `/Users/jreye/Documents/efeonce-public-site-runtime`, plugin
  `wp-content/plugins/eo-elementor-widgets`; schemas, templates, renderer PHP y JS de Agency.
- Sitio: `https://efeoncepro.com/`, página `251731`; lecturas por WP-CLI gobernado, sin save/purge.
- Evidencia visual: archivos existentes bajo `.captures/agency-home-*`; no se repitió el navegador
  durante esta auditoría. Una captura anterior no prueba por sí sola el comportamiento actual.
- Fuera de alcance: WIP Creative/Social del checkout compartido, cambios de código, nuevas
  publicaciones, pruebas de booking con datos reales, commit/push y cierre de TASK-1358.

## Risk Classification

| Riesgo | Nivel | Límite del cierre |
| --- | --- | --- |
| Confundir checkpoint histórico y contrato vigente | Medio | Identidad/hash actuales y cronología separada |
| Dar por probado comportamiento interactivo sólo con mocks | Medio | Distinguir pruebas locales de Browser y pendientes reales |
| Convertir contenido visual en evidencia comercial | Alto | No certificar cifras, testimonios o comparación por haberlos renderizado |
| Reejecutar escritores o recuperar paquetes sobre drift | Alto | Guardas, snapshot y recuperación autorizada; ninguna mutación en esta auditoría |

## Injected Skills

- `efeonce-public-site-wordpress`: identidad, acceso read-only y límites de Elementor/Ohio/Kinsta.
- `greenhouse-qa-release-auditor`: pruebas proporcionales, integridad de evidencia y límites del veredicto.
- `greenhouse-documentation-governor`: dueños documentales, separación de historia/contrato y cierre.

No se emite un nuevo juicio de diseño ni se modifica UI: se revisa la evidencia ya producida por las
skills visuales en las entregas anteriores. El gate general es advisory, no certificación del navegador.

## Evidence

Verificación ejecutada de nuevo en esta auditoría:

| Gate | Resultado | Evidencia |
| --- | --- | --- |
| Fuente Claude Design | SHA-256 coincide | `Landing Agencia.dc.html`: `6062b32ec68f4511498ab91d8e3582b18247ff52d1354dfe2b5042a32abd7617` |
| `php tests/agency-modules.test.php` en runtime | PASS | 17 módulos; 281 aserciones de texto editable; Media, escaping y remove/reorder |
| `node scripts/public-website/agency-elementor-lifecycle.test.cjs` | PASS | Mount/replace/remove, idempotencia, filtro, URL allowlist, video lazy, cleanup, editor sin iframe y agenda nativa |
| `node scripts/public-website/agency-marquee-geometry.test.cjs` | PASS | Período, cobertura, resize, preparación de imágenes y clones accesibles bajo geometría simulada |
| `pnpm public-website:ssh-check` | PASS | Carril Kinsta SSH/WP-CLI disponible; no depende de token Kinsta API |
| `verify-agency-elementor-contract.php` por WP-CLI, usuario 12 | PASS | 17 contenedores / 17 widgets / cero HTML / 414 campos raíz / seis repeaters; sin placeholders sin resolver |
| Lectura `tmp/inspect-home-video.php` | PASS | Experience `ca913f7`, URL suministrada y cuatro hashes del paquete coinciden con `agency-home-video/release.json` |
| `pnpm qa:gates --changed --agent codex` | Advisory ejecutado | Detecta docs/skills/tooling; cierre documental corresponde al agente integrador |

El documento persistido tiene **44.697 bytes** y hash
`30bab640e2dae49b9f6b13582c6dd426c018c4fda2419c0f199634cdc659605c`.
`page_on_front=251731`, estado `publish`, Yoast noindex=`2`, canonical raíz, header/footer visibles
y plantilla `default`. Estos valores proceden de lectura actual, no de Handoff.

Los 17 módulos actuales son hero, trust, problem, reframe, motor, work, servicios, stack, proof_engine,
ecosystem, method, cases, social_proof, comparison, faq, agenda y experience. Los seis repeaters
pertenecen a hero (marcas), work (dos bandas), servicios, method y faq. El schema Cases tiene cinco
campos; Experience tiene once. Los campos raíz no incluyen todos los controles de estilo ni los
campos internos de cada repeater: no presentar `414` como el total absoluto de controles Elementor.

### Evidencia visual disponible y sus límites

- `agency-home-video/live-desktop.png` fue abierta e inspeccionada en esta auditoría: muestra contenido
  del showreel pintado dentro del modal navy, título, control de cierre y enlace de recuperación.
  La afirmación de reproducción/interacción en vivo pertenece al ensayo registrado en el audit visual,
  no se deriva de una imagen fija ni del HTTP del proveedor.
- `agency-home-video/live-mobile.json`: viewport/scrollWidth 390, panel x=12..378 (366 px), iframe
  364×204,75 y botón de cierre 44×44. `live-landscape.json`: viewport/scrollWidth 844, panel contenido
  verticalmente en 390 px. Son mediciones persistidas de la entrega, no un nuevo ensayo de dispositivo.
- Capturas móviles emuladas tienen limitación de escala/canvas del host Browser. Se complementan con
  geometría; no equivalen a inspección en un teléfono físico.
- `agency-home-fifth-review/loop-890.json` conserva cinco fases con imágenes cargadas y cobertura de
  ambas bandas; junto a `loop-1920.json` documenta el ensayo real que complementa la prueba simulada.
- La suite lifecycle usa shims de `HTMLDialogElement` porque JSDOM no tiene top layer. Prueba nuestro
  lifecycle y restauración de foco, **no** el focus trap nativo ni la navegación del iframe cross-origin.

## Inventario de construcción y aprendizajes consolidados

| Área | Lo construido | Regla que debe conservarse |
| --- | --- | --- |
| Portado | Export de Claude convertido a 17 módulos semánticos | No regenerar el HTML monolítico ni correr el compilador inicial sobre el código evolucionado |
| Portada | Home `251731`; anterior `2791` conservada | Separar cutover de datos/SEO/menu y edición posterior del cuerpo |
| Contraste/CTAs | Controles heading/teal scoped y exclusión `-undash` | Probar hover sostenido y CSS computado Ohio; color correcto en reposo no basta |
| Marcas | Recursos reales, Media editable y proof-only compartido | Isotipo oficial, color contextual y microinteracción son tres verificaciones distintas |
| Trabajos | Diez adjuntos reutilizados, dos bandas continuas | Medir período con gap y cobertura del viewport; probar varias fases y resize |
| Ecosistema | Greenhouse/Globe/Kortex/Wave; Verk retirado; aviso oculto | Retirar y ocultar no son lo mismo: snapshot para contenido eliminado, select para contenido recuperable |
| FAQ/Agenda | Layout responsive, FAQ sin mail, agenda horizontal sin formulario demo | CTA de agenda usa destino existente; no inventar éxito, lead o reserva |
| Servicios | URL nativa opcional; cuatro destinos y ocho tarjetas sin enlace | Validar landing antes de enlazar; default URL es array; vacío conserva tarjeta estática |
| Casos | CTA compacto a `/portafolio/` | Quitar tarjetas no borra proyectos; reutilizar Agenda con modificador scoped y selectores de test por sección |
| Video | `video_url` editable, dialog nativo, carga al clic, cleanup | No iframe en carga/editor; URL allowlist; no prometer ausencia de tratamiento de terceros tras reproducción |
| Narrativa | Dos rótulos y cierre comparativo revisados | Copy puntual implementado no equivale a aprobar toda la narrativa ni los claims |

Procedencia de recursos y adjuntos: [audit visual — Medios elegidos](2026-08-30-home-visual-review.md#medios-elegidos).
La fuente original mantiene su hash; el sitio actual incorpora cambios explícitos posteriores del operador
y no debe describirse como una copia literal inalterada de la fuente.

## Rollout y recuperación: evidencia disponible

El writer `configure-agency-home-video.php` comprueba identidad, propietario, estado y hash anterior;
crea snapshot antes de `Document::save()`, protege metadatos Ohio/Yoast/thumbnail y ocho páginas,
exige readback semántico y limpia cachés. Su hash esperado es un checkpoint anterior: **no es un comando
idempotente para volver a ejecutar sin discovery**. Lo mismo aplica a los escritores puntuales previos.

`deploy-agency-elementor-package.php` valida allowlist y hashes anteriores/nuevos antes de escribir,
crea un tar con manifest y lista de rutas nuevas, instala loader al final e invalida OPcache/Elementor/Kinsta.
La sustitución es atómica **por archivo**, no una transacción del paquete; no hay rollback automático.
No publicar el checkout completo, que contiene WIP ajeno.

Última entrega registrada: snapshot WordPress `_gh_home_video_20260830_195821` y tar remoto
`/tmp/eo-agency-before-20260830-195756.tar`. Esta auditoría volvió a comprobar los archivos desplegados,
pero **no ejecutó rollback ni revalidó la existencia/retención del tar**. `/tmp` no es almacenamiento
durable; inspeccionar snapshot y respaldo exacto antes de cualquier recuperación autorizada.

## Conditional Follow-Ups

| Pendiente | Owner | Criterio de salida |
| --- | --- | --- |
| Editar/guardar/recargar desde UI Elementor | Operador habilita sesión; agente público ejecuta QA | Ensayo real del editor con retorno al estado acordado; registro server-side no sustituye este gate |
| Teclado de video y enlaces de servicios | Agente QA Browser | Tab/Shift+Tab, foco visible y Escape dentro/fuera del iframe en navegador real; documentar comportamiento del proveedor |
| Copy/claims globales | Marca/contenidos + operador | Sustento y aprobación de comparación, testimonio, métricas y narrativa; no inferir aprobación comercial del cutover |
| Capturas móviles inequívocas | Agente QA visual | Ensayo con canvas/viewport nativo alineado o dispositivo; conservar mediciones actuales como evidencia parcial |
| Recuperación ejecutable | Operador runtime | Comprobar retención/copia durable del tar y snapshot antes de necesitar rollback; ejercicio sólo con autorización |

El schema Proof Engine identifica sus cifras como ejemplo; no convertirlas en resultados reales del negocio.
Comparison aún conserva porcentajes 42/8/33/100 y generalizaciones; Social Proof conserva un testimonio
atribuido por rol/iniciales. Esta auditoría no aporta la evidencia comercial para certificarlos y no modifica copy.

## False-Closure Traps Checked

- Tests verdes ≠ publicación: se releen WordPress y hashes de los cuatro archivos de video.
- Publicación ≠ certificación del editor: el gate UI save/reload permanece abierto.
- Captura ≠ comportamiento: teclado cross-origin y captura emulada quedan delimitados.
- Reuso de logos ≠ permiso probatorio ilimitado: no se deducen resultados comerciales ni acreditaciones.
- Snapshot/tar descritos ≠ rollback ensayado: se documenta el mecanismo y la limitación de retención.
- Handoff/arquitectura ≠ runtime: los hashes históricos no se usan como guardas vigentes sin readback.

## Final Call

### Integración documental

Tres subagentes entregaron canon, skills y esta auditoría; el integrador reconcilió task, índices,
route ownership, contexto, handoff y motion. Plan anterior preservado y wireframe/flow marcados
históricos. No se cambiaron AGENTS/CLAUDE ni doctrina PDR: ya enrutaban al dueño correcto.

- `pnpm task:lint --task TASK-1358`: PASS, cero errores/advertencias.
- `pnpm docs:closure-check`: PASS, cero advertencias; flags e índice Creative Studio PASS.
- `pnpm qa:gates --changed --agent codex`: ejecutado, advisory.
- Enlaces locales de 26 docs del cambio y espejo explícito de 24 archivos del bundle: PASS.
- `git diff --check`: PASS; reemplazo del índice de tasks limitado a TASK-1358.
- `pnpm ops:lint --changed`: sin errores; 14 advertencias preexistentes de paridad epic/children,
  fuera de esta consolidación. El gate global de rutas de skills también señaló dos enlaces
  preexistentes SEO/AEO; las rutas afectadas de la skill pública pasan.
- El contexto histórico usa marcador de integridad; `pnpm docs:context-check:strict` es el
  último gate tras cualquier edición documental. No se confunde con closure-check.

La implementación actual tiene fuente identificable, controles estructurados, ensayos locales reproducibles
y lectura de WordPress consistente con la última entrega. La consolidación puede cerrar cuando los dueños
documentales integren estos hallazgos y pasen sus gates; no debe ampliar ese cierre a aprobación total de
accesibilidad, editor o copy, ni mover TASK-1358 a complete por acumulación de capturas.
