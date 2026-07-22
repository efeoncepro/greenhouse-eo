# TASK-1505 — auditoría de paridad con la UI aprobada

Fecha: 2026-07-22
Fuente de verdad: `docs/ui/visual-sources/TASK-1505/approved-prototype.dc.html`
Runtime auditado: `efeonce-globe/apps/studio-web/src/producer-ui.ts`,
`producer-client.ts` y `producer-controller.ts`
Verdict: **BLOCK para aceptación visual final**

## Reauditoría posterior al cierre P0/P1

La evidencia GVC del fixture local contract-backed en
`.captures/2026-07-22T18-10-21_globe-creative-producer/` confirma que el
halo aprobado ya funciona: responde al hover del composer, conserva profundidad al foco y queda persistente
cuando se selecciona `Editar`; reduced motion mantiene una señal estática. También confirma la semántica
visible de los cinco modos de Video. Esta parte deja de ser deuda.

El source actual cierra además los gaps funcionales principales encontrados en la primera auditoría:

| Área revalidada | Estado en source | Evidencia visual/runtime pendiente |
| --- | --- | --- |
| Viewer | Cerrado en código: lineage, bitácora, intensidad de variación y before/after usan readers/outputs durables. | Falta GVC con un candidato real que abra y ejercite los cuatro estados. |
| Inpaint | Cerrado en código: stage/canvas, brush, intents, sugerencias, máscara gobernada y estimate antes del spend. | Falta GVC con asset elegible, máscara y estimate server-side. |
| Presupuesto | Cerrado en código: forecast, reservas activas y priorización con revisión/idempotencia. | Falta GVC con ledger y runs reservados reales. |
| Command palette | Cerrado en código: acciones, modalidades, ocho modos, catálogo de rutas y Style DNA. | Falta GVC de búsqueda, filtrado, disabled states y ejecución. |
| Cuenta | Cerrado visualmente: identidad, workspace y todos los destinos aprobados se preservan honestamente deshabilitados mientras el portal no publique rutas. | Falta GVC del popover abierto. |
| Video/Audio avanzados | Cerrado en código: cada modo discrimina input/route/payload y voz/idioma; no se reduce a chips decorativos. | La captura sólo demuestra `Editar`; faltan comandos y outputs reales de cada modo. |

### Corrección de alcance de assets

La captura de las 18:02 no correspondía a staging live: fue una ejecución del fixture local contract-backed
orquestada bajo el perfil `--env=staging`. Por lo tanto, no era válido atribuir sus assets rotos al deployment,
Vercel SSO ni al rollout. El fixture reproducible vigente en
`efeonce-globe/apps/studio-web/scripts/producer-gvc-fixture.mjs` usa `readPublicAsset` real y responde `404` para
assets/API desconocidos; sus pruebas de MIME y `nosniff` pasan 3/3.

La nueva evidencia de las 18:10 muestra el isotipo y wordmark Globe, el logo Efeonce, todos los glifos Tabler y
las fuentes correctamente cargados en desktop y 390 px. Assets queda **cerrado para el fixture local**; esta
evidencia no afirma nada sobre staging live porque no lo ejercita.

El `BLOCK` restante es de completitud probatoria: se requiere una GVC rica de viewer, inpaint, presupuesto,
palette, cuenta y todos los modos, además de generación real por los commands de la UI. El catálogo/fixture
vacío actual no puede demostrar esas rutas end-to-end.

## Alcance y evidencia

La revisión inspeccionó el HTML completo, sus estilos, lógica e interacciones; no se limitó a las capturas.
También se compararon los renders versionados del runtime y una ejecución nueva del prototipo aprobado en
1440 × 1000 y 390 × 844.

- Aprobado desktop limpio: `docs/ui/reviews/TASK-1505/approved-source-desktop-1440-clean.png`.
- Runtime desktop con feed: `docs/ui/reviews/TASK-1505/runtime-desktop-1440-full.png`.
- Runtime mobile: `docs/ui/reviews/TASK-1505/runtime-mobile-390-full.png`.
- Capturas adicionales del HTML aprobado: `.captures/approved-source-parity-audit-2026-07-22/`.
- Evidencia GVC inicial: `.captures/2026-07-22T17-38-56_globe-creative-producer/`.
- Captura de fixture previa, supersedida para assets: `.captures/2026-07-22T18-02-46_globe-creative-producer/`.
- Reauditoría GVC correcta del fixture local: `.captures/2026-07-22T18-10-21_globe-creative-producer/`.

El prototipo aprobado mide `scrollWidth=630` con viewport de `390 px`. El runtime corrige ese defecto y debe
mantener `scrollWidth === clientWidth`; la corrección responsive no se considera pérdida de fidelidad.

## Matriz de paridad inicial

La tabla siguiente documenta el hallazgo inicial y queda supersedida, donde corresponda, por la reauditoría
anterior. Se conserva para trazabilidad de qué se cerró y qué todavía necesita evidencia observable.

| Área | Estado | Evidencia y deuda exacta | Prioridad |
| --- | --- | --- | --- |
| Paleta y tipografía base | Paridad | El runtime conserva los valores aprobados `#030c26`, `#061443`, `#0375db`, `#4db8ff`, `#ff6500`, Poppins display y Geist UI. La deuda cromática percibida no nace de tokens distintos, sino de la opacidad y acumulación de superficies/estados en cards y paneles. | — |
| Marcas Globe/Efeonce | Paridad | Isotipo, lockup y footer usan los SVG oficiales. | — |
| Iconografía | Paridad local | Tabler está self-hosted y se sirve same-origin. No hay sustitución por emojis. Si faltan iconos en un ambiente publicado, es drift de rollout/assets, no ausencia en el source local. | P0 rollout |
| Header | Parcial | Conserva marca, modalidades, créditos, comandos y cuenta. Falta la amplitud aprobada del menú de cuenta (perfil/equipo, preferencias, facturación, ayuda y salida). `Estados` era un inspector de demo y su omisión en producción es intencional. | P1 |
| Composer e iluminación | Paridad local | Aurora, halo reactivo al puntero, halo persistente de edición y el `focus-within` aprobado están implementados. El shadow del prompt reproduce el aprobado. Reduced motion mantiene señal estática. | — |
| Prompt, referencias y presets | Parcial | Historia, mejora, referencias con procedencia/peso/anclaje, sugerencias, prompt negativo, presets y Style DNA existen. El fixture vacío no debe copiar referencias inventadas. La composición agrega copy operativo y estados que aumentan densidad frente al aprobado. | P2 polish |
| Video y audio avanzados | Parcial funcional | Los chips aprobados están visibles, pero la prueba de aceptación debe demostrar payloads efectivos para Video: Crear/Editar/Movimiento/Elementos/Cuadros y Audio: Locución/Cambiar voz/Traducir, además del registro de voces. Una apariencia habilitada sin command discriminado no cuenta como paridad. | P0 |
| Route/output/estimate | Parcial | Ruta real, shape gobernado, estimate, hard cap y fence son mejoras honestas. El rail actual ocupa más altura y repite explicaciones; necesita compactación visual sin ocultar autoridad. | P1 |
| Toolbar y masonry | Parcial | La composición hero + masonry, alturas editoriales, filtros, colección, densidad, series, compartir, búsqueda y sort existen. Los chips `Candidato listo` y selectores persistentes en cada pieza añaden ruido que el aprobado sólo muestra al hover/focus/selección; deben reducirse en estado ready. | P1 |
| Hover de candidatos | Paridad | Elevación, borde cyan, shadow de profundidad, zoom de media y revelado de acciones están implementados; en touch/reduced motion las acciones permanecen disponibles. | — |
| Viewer | Deuda material | El runtime preserva media, recipe, provenance, review, comentarios y acciones. Falta la riqueza aprobada de lineage navegable, bitácora visual, variación con intensidad y comparación Antes/Después para upscale. El inspector actual se percibe más genérico y tabular. | P0/P1 |
| Inpaint | Deuda material | Hay canvas real, brush, intents y lifecycle gobernado. Faltan las sugerencias contextuales, costo visible en CTA y la composición visual aprobada de stage/controles; el diálogo actual es una adaptación genérica. | P1 |
| Créditos/presupuesto | Parcial | Donut, disponibles/reservados/gastados, meter, proyecto, mes y fence están. Faltan el listado visual de reservas activas, priorización desde el panel y proyección de fin de mes aprobados. | P1 |
| Command palette | Deuda material | El aprobado indexa modalidades, rutas, estilos y acciones (mejorar, negativo, generar). El runtime sólo ofrece cinco accesos estáticos; pierde riqueza y velocidad operativa. | P1 |
| Cuenta/workspace | Parcial | El workspace switcher durable mejora el prototipo. El resto del menú aprobado se redujo y no tiene destinos equivalentes. | P1 |
| Bulk/compare/share/review | Parcial alto | La base funcional existe y es más robusta. Compare necesita conservar ficha de formato/seed/costo del aprobado; share debe demostrar creación, expiración, copia y revocación; las acciones parciales deben mantener feedback visual rico. | P1 |
| Estados y recovery | Mejora intencional | El runtime reemplaza timers, C2PA inventado y toasts falsos por estados durables, correlación, retries y mensajes honestos. No copiar fixtures del prototipo. | — |
| Motion | Parcial alto | Aurora, botones, cards, modal entry, candidate enter, toasts, coach, Globe pulse/orbit, generation sweep y composer halo existen. La pérdida está en controles ausentes (slider de variación/before-after) y en falta de evidencia interactiva completa de viewer/inpaint/budget, no en el sistema base. | P1 evidence |
| Mobile 390 | Mejora intencional con deuda menor | El runtime elimina el overflow de 240 px del aprobado, recompone header, toolbar, cards y compact bar. Debe conservarse. Falta una comparación aprobada estado por estado de dialogs, viewer, inpaint, bulk y popovers en 390. | P1 evidence |

## Divergencias intencionales que no se deben revertir

1. No copiar el overflow horizontal del prototipo a 390 px.
2. No inventar referencias, saldo, outputs, progreso, derechos ni C2PA para igualar fixtures.
3. No restaurar el inspector `Estados` como control productivo; sus estados deben probarse mediante fixtures/GVC.
4. Mantener hard cap, estimate server-side, workspace exacto, grants, provenance y recovery aunque agreguen copy.
5. Mantener acciones esenciales visibles en touch, teclado y reduced motion aunque desktop use revelado por hover.

## Orden de cierre recomendado

1. Preparar datos/fixtures durables y capturar desktop y 390 para feed rico, viewer, inpaint, presupuesto,
   command palette, cuenta, bulk/compare, share, onboarding y cada modo de Video/Audio.
2. Ejecutar por esa UI los commands de Imagen, Video y Audio y verificar request, run, output reproducible,
   provenance, ledger y recovery; un chip visible no sustituye la evidencia end-to-end.
3. Reducir la deuda P2 de indicadores permanentes en cards ready y compactar copy operativo donde compita con
   la cadencia aprobada, sin ocultar autoridad server-side.
4. Ejecutar un canario separado contra staging live; no reutilizar el nombre del perfil como evidencia de que
   el fixture local ejercitó ese ambiente.
5. Comparar la suite rica contra el HTML aprobado; sólo entonces actualizar el scorecard y promover un
   baseline durable. Nunca promover el runtime contra sí mismo.
