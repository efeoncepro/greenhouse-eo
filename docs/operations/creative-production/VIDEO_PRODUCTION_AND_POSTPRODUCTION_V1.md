# Producción y posproducción de video: método de principio a fin

## Delta 2026-10-03 (tarde) — distribución y naming del servicio

- **Fuente:** distribución del spot «Los Sparks» (concepto CMP001-08 de CMP-001): registro en Marketing Studio y
  programación en Metricool (Instagram 05-oct 14:00, LinkedIn 08-oct 11:00; `PENDING`, no publicado). Registro:
  `ai-generations/2026-10-03_sparks-aeo-60s/final/redes/PROGRAMACION.md`.
- **Qué cambia:** el método suma un paso final de [distribución](#distribución-studio--metricool) (Studio →
  Metricool) y una [regla de naming](#naming-del-servicio-en-guion-subtítulos-y-copy) para guion, subtítulos y copy.

## Delta 2026-10-03 — preproducción transversal y spot animado 2D

- **Fuente:** spot animado 2D «Los Sparks» (servicio Efeonce | AEO), v2 aprobada por el operador el 2026-10-03 (49,6 s, 16:9,
  1920×1080, 24 fps). Hechos en `ai-generations/2026-10-03_sparks-aeo-60s/INVENTARIO-DE-HECHOS.md` y `PREPRODUCCION.md`
  §11–12; historia del caso en la
  [retrospectiva](../social/2026-10-03-sparks-aeo-spot-animado-production-method.md).
- **Qué cambia:** el operador pidió documentar la preproducción como común a todo video («la metodología de
  preproducción siento que va a ser similar en todos los videos que hagamos»). Se fija el orden transversal (sección
  [Preproducción transversal](#preproducción-transversal-común-a-todo-video)), se agregan reglas de producción y
  posproducción aprendidas en animación 2D y una receta ejecutable propia.
- **Dueños:** [companion de preproducción §12](../../../.claude/skills/motion-design-studio/companions/video-preproduction-and-production.md),
  [companion de posproducción §15](../../../.claude/skills/motion-design-studio/companions/video-postproduction-and-delivery.md),
  [companion de lecciones §11](../../../.claude/skills/motion-design-studio/companions/video-lessons-and-failure-modes.md)
  y [workflow del spot animado 2D](../../../.claude/skills/motion-design-studio/workflows/animated-2d-spot-composed-brand-assets.md).
  Espejo `.codex` pendiente de sincronizar.
- **Dato posterior:** la norma sonora pide −14 LUFS para video y redes; el master v2 quedó a −16 LUFS y las
  entregas para redes se re-masterizan a −14 LUFS.

## Decisión operativa

- **Status:** Accepted — método documental solicitado por el operador el 2026-09-24; no implementación de plataforma.
- **Date / Validated as of:** 2026-09-24; delta 2026-10-03 (preproducción transversal, spot animado 2D; distribución Studio → Metricool y naming del servicio).
- **Owner:** Creative Studio / Motion Design Studio; Audio Studio posee el oficio sonoro.
- **Scope:** ejecución por agentes de video generado, filmado, animado o híbrido; preproducción, producción, posproducción y entrega.
- **Reversibility:** alta; companions versionados, fuentes y entregas preservadas.
- **Confidence:** alta sobre los defectos observados en SKY; condicionada para transferir sus soluciones a otros briefs.

**Contexto.** SKY requirió preparar piezas y cámaras con Claude, generar y revisar múltiples películas,
rescatar material aceptable, animar cartelas por separado, corregir sonido y restaurar detalle. Hubo mejoras
reales y fallas de planificación, costo, continuidad y evidencia. La conversación por sí sola no conserva
las decisiones suficientes para repetir el trabajo. La [retrospectiva V17](../social/2026-09-24-sky-retrospectiva-produccion-v17.md)
conserva la historia; este documento fija la operación reutilizable.

**Decisión.** Cada producción conserva un paquete vivo con intención, contratos por elemento, cobertura,
referencias con roles, fuentes, intentos, costos, revisiones y entregables. Los companions siguientes
explican cómo ejecutar cada etapa. Las skills existentes enrutan a ellos; no se crea otra skill de video.
La autorización y las preferencias vigentes del operador viajan con el paquete y no se solicitan de nuevo.

**Alternativas consideradas.** Prompt único sin paquete: pierde decisiones y vuelve difícil atribuir fallas.
Guía monolítica dentro de SKILL.md: carga todo en cada tarea. Copiar el caso SKY como receta universal:
impone cámaras, tiempos y herramientas que otro brief puede no necesitar. Se elige un contrato común
breve, companions por etapa y evidencia de caso separada.

**Consecuencias.** Más precisión antes de gastar y mejor recuperación entre agentes; requiere mantener
el registro al cambiar imagen, música, modelo o presupuesto. Un resultado técnicamente completo puede
seguir rechazado creativamente. Un render local no consume créditos generativos, pero sí tiempo y cómputo.

**Runtime contract.** Es un procedimiento de trabajo local y documentación; no crea APIs, permisos,
reservas automáticas de dinero, reglas de cobro ni capacidades de Globe/Studio. Las herramientas y rutas
vigentes mantienen sus contratos. Las aprobaciones creativas, financieras, de derechos y de publicación
son estados distintos. El marco [Creative Operations](../../research/RESEARCH-009-creative-operations-agentic-workflows.md)
orienta la trazabilidad; sus capacidades propuestas no se declaran implementadas aquí.

**Revisit when.** Un nuevo caso contradiga una regla; cambie un endpoint o su facturación; se conecte un
editor/DAW; el proceso se implemente en producto; el operador cambie alcance o aceptación. Actualizar la
regla dueña y sus espejos, preservando la evidencia histórica.

Capas documentales: [descripción funcional](../../documentation/creative-production/video-production.md) ·
[manual de operación](../../manual-de-uso/creative-production/video-production.md).

## Lectura por etapa

| Necesidad | Dueño de ejecución |
| --- | --- |
| Reconstruir intención, producir piezas, referencias y cámaras; decidir qué generar | [Companion de preproducción y producción](../../../.codex/skills/motion-design-studio/companions/video-preproduction-and-production.md) |
| Rescatar, editar, animar, integrar sonido, restaurar, exportar y revisar | [Companion de posproducción y entrega](../../../.codex/skills/motion-design-studio/companions/video-postproduction-and-delivery.md) |
| Entender mecanismos positivos y modos de falla; evitar reincidencia | [Companion de lecciones y fallas](../../../.codex/skills/motion-design-studio/companions/video-lessons-and-failure-modes.md) |
| Preparar una corrida | [Plantilla del paquete de producción](../../../.codex/skills/motion-design-studio/templates/video-production-packet.md) |
| Cerrar una versión | [Plantilla de revisión de posproducción](../../../.codex/skills/motion-design-studio/templates/video-postproduction-review.md) |
| Consultar herramientas/endpoints | [STUDIO_TOOLING](../../../.codex/skills/motion-design-studio/efeonce/STUDIO_TOOLING.md), con verificación vigente antes de usarlos |
| Película generativa con cartelas locales | [Receta específica](../../../.codex/skills/motion-design-studio/workflows/generative-film-with-approved-title-overlays.md) |
| Spot animado 2D con mascotas/logos compuestos | [Receta específica](../../../.claude/skills/motion-design-studio/workflows/animated-2d-spot-composed-brand-assets.md) |
| Registrar la pieza en la campaña | Skill [`efeonce-marketing-studio`](../../../.claude/skills/efeonce-marketing-studio/SKILL.md) |
| Programar video con portada por red | [Entrega de video en Metricool](../../../.claude/skills/social-media-studio/references/video-delivery-metricool.md) |

## Unidad de trabajo y estados

Un proyecto contiene versiones; una versión puede contener varias solicitudes de proveedor y cada solicitud
puede devolver varias variantes. **No confundir proyecto, versión, solicitud, intento y variante.**
Contar todos al revisar costo y decisiones, incluso rechazos o alternativas descartadas. El paquete apunta
al brief existente y a los archivos reales; no copia datos sensibles ni URLs firmadas en documentos públicos.

Estados mínimos, registrados con fecha y evidencia:

`propuesto → autorizado en su alcance → enviado → procesando → recibido → revisado → aceptado o rechazado → integrado → entregado`

Son dimensiones separadas: `aprobación creativa`, `autorización de gasto`, `derechos/licencia`,
`revisión técnica`, `escucha perceptual`, `aprobación de publicación`. Un `completed` sólo acredita recepción.
Una aprobación de cartelas no aprueba la película; una factura no acredita calidad; silencio del usuario no
aprueba una variante. Reusar autorización previa compatible, identificando a qué archivo/alcance aplica.

## Flujo y evidencia de salida

| Etapa | Trabajo | Evidencia para avanzar |
| --- | --- | --- |
| 1. Recuperar contexto | Leer brief, feedback, fuentes y versiones; separar gusto, defecto y restricción | Resumen de intención, decisiones vigentes, piezas aprobadas y dudas materiales |
| 2. Descomponer | Guion en beats; contrato generativo/local por elemento; jerarquía de atención | Guion visual y sonoro; matriz de fidelidad; criterio observable por beat |
| 3. Construir piezas | Producir assets aislados, variantes de estado, vistas de sujeto, logo/vector, fondos | Manifiesto con roles, hashes, procedencia, derechos y aprobación por asset |
| 4. Dirigir cobertura | Elegir cantidad y función de cámaras, ángulos, óptica, movimiento de cámara y sujeto | Shot list y mapa de cobertura/continuidad; entrada/salida y reserva previstas |
| 5. Probar la intención | Storyboard/animatic y piloto sólo del riesgo incierto | Prueba que responda una pregunta; defectos de guía resueltos antes de enviarla |
| 6. Preparar operación | Ruta/modelo/endpoint, payload real, duración entrada/salida, resolución, audio, límites | Estimación trazable, autorización compatible y política de detención; ninguna cifra estimada se llama límite garantizado |
| 7. Producir/monitorear | Enviar una vez; persistir ID y consultar esa solicitud | Salida real, estado final, costo reportado/facturado distinguido; no reenvío por timeout |
| 8. Seleccionar/rescatar | Revisar toda la secuencia y momentos densos; elegir fuentes por tramo | Veredicto con defectos y mapa de procedencia; conservar lo que ya funciona |
| 9. Fijar imagen | Empalmes, ritmo, crop, clean plates, cartelas, firmas y cierre | Corte de imagen revisado; eventos en fotogramas; nueva QA de cualquier cambio |
| 10. Sonorizar | Música continua adecuada al corte; SFX por causa, peso y jerarquía | Cue sheet real, stems limpios, mezcla, mediciones y escucha separadas |
| 11. Finalizar | Restauración sólo si mejora; overlays limpios; color y exports | Prueba A/B antes del metraje completo; masters/derivados con metadata y cuadros verificados |
| 12. Entregar/aprender | Abrir el archivo final, reportar límites, archivar fuentes y decisiones | Manifest de entrega, aprobación exacta o pendiente, costos reconciliados y aprendizaje reusable |
| 13. Distribuir (si hay autorización) | Registrar concepto y piezas en Marketing Studio; programar un post por red en Metricool | Filas de la campaña en Studio; IDs/UUID por red, portada por red, readback por SHA-256 y `PROGRAMACION.md` |

El diseño sonoro comienza en el guion, pero su generación/mezcla final sigue el corte real. Si luego cambia
la imagen, invalida los cues afectados y revisa la sincronía; no reutilices ciegamente el reporte anterior.
Un rodaje con playback o una pieza coreografiada a música aprobada debe declarar esa dependencia desde el
brief: cambia el orden de decisiones, no elimina la revisión conjunta final.

## Preproducción transversal (común a todo video)

Vale para video generado, filmado, animado o híbrido. Se ejecuta en este orden; ningún paso que gaste en el modelo
empieza antes de que su escena esté aprobada en el storyboard. El detalle y la evidencia por paso viven en el
companion de preproducción §12.

1. **Brief** — formato, duración objetivo, motor previsto, qué debe sentir y hacer el espectador, orden de trabajo.
2. **Historia y diseño en papel** — historia en actos, guion VO por toma, música por sección, voz de personajes,
   SFX, VFX por toma (generación o post), plan de tomas y empalmes, mezcla y entrega, presupuesto, pendientes. Si la
   pieza vende una capacidad, el copy se escribe **después** de cargar la skill dueña de la práctica y el canon de
   los personajes (en el caso: `seo-aeo`, `seo-aeo-practice`, Sparks V1; la VO v1 se reescribió por premisa errónea).
3. **Storyboard en canvas, aprobado por escena** — lámina general, una por toma, línea de tiempo; el operador
   comenta y aprueba cada lámina.
4. **Elenco y regla de quién puede aparecer** — el elenco fotográfico representa al equipo Efeonce y no hace de
   cliente; para un cliente en la ficción se usa el elenco 2D ficticio. Personajes nuevos, aprobados antes de seguir.
5. **Contrato de fidelidad** — qué genera el modelo, qué es referencia y qué se compone. Lo de marca (logos,
   mascotas, texto, interfaz) se compone; el modelo pone mundo, luz y movimiento.
6. **Cuadros clave o referencias** — con gate de integridad de lo compuesto.
7. **Piloto** — la toma de mayor riesgo, autorización de gasto aparte.
8. **Producción** → 9. **Corte mudo** (ritmo con placas provisorias) → 10. **Post de imagen** → 11. **Audio** sobre el
   corte real → 12. **Entrega**.

Dos reglas se deciden aquí y no en post: **el ritmo lo pone la historia, no la duración del brief** (la v1 de 60 s
se sintió lenta; la v2 aprobada dura 49,6 s), y **la duración por toma la fija el tope verificado del motor** (15 s
por solicitud en fal y Higgsfield, verificado 2026-10-03).

## Producción y posproducción: reglas agregadas el 2026-10-03

| Etapa | Regla | Evidencia del caso |
| --- | --- | --- |
| Cuadros clave | Mascotas y logos se componen desde el vector oficial, sin espejar; la mirada se emula con la lógica del rig; un acabado generativo sólo de luz se mezcla por zonas y el script falla si cambia un píxel fuera | 0 px cambiados fuera de zonas [medido] |
| Tomas | Cuadro inicial y final con el mismo eje de cámara; prompt que prohíbe texto y fija la paleta; variante del motor elegida por piloto | H3 base más fiel que Max; S1/S8 rehechas por texto, S6 por color |
| Interfaz y placas | Todo elemento exacto que escala se dibuja cuadro a cuadro con escala decimal; `zoompan` salta | S2/S9 rehechas en v2 |
| Montaje | Un solo mapa de tiempos re-tima video, voz, SFX y subtítulos; tras re-timar, revisar sonidos absolutos contra la voz | Logo sonoro intermedio retirado |
| Cierre | El llamado a la acción va sobre una placa animada previa; el reveal del logo con eslogan queda sin voz | Decisión del operador |
| Subtítulos | Cues desde la voz real; sin libass, cada cue como PNG transparente superpuesto; SRT y SDH aparte | `corte/subtitulos-v2.cjs` |
| Audio | Música derivada del kit oficial con balance por bandas medido antes de mostrarla; mezcla con sidechain; nivel por destino (−14 LUFS video/redes) | Medios 21 % contra ~35 % → EQ; master v2 a −16, redes re-masterizadas a −14 |
| Revisión | Cuadros al 100 % en cada pantalla con texto; cero placeholders; declarar lo no verificado (sin ASR ni escucha propia) | Placeholders y texto fuera de burbuja llegaron a la v1 |

## Naming del servicio en guion, subtítulos y copy

El guion, los subtítulos y el copy nombran el servicio como **«Efeonce | AEO»** (con barra) y **la marca que habla es
Efeonce** (por ejemplo: «En Efeonce lo resolvemos con nuestro servicio Efeonce | AEO…»). Nunca «Efeonce AEO» como si
fuera la marca. Se revisa en la etapa 2, antes de grabar voz o quemar subtítulos, porque corregirlo después obliga a
re-renderizar. Caso fuente: en el spot «Los Sparks» la voz y los subtítulos quemados dicen «Efeonce AEO»; el
operador corrigió el naming en los copies de redes y decidió no re-renderizar el video.

## Distribución: Studio → Metricool

Paso final, sólo con autorización de publicación explícita (aprobar la pieza no la da):

1. **Marketing Studio:** registrar el concepto y sus piezas en la campaña (en el caso, CMP001-08 de CMP-001, finales
   en OneDrive e ingesta con `pnpm import:catalog --apply` y `pnpm media:ingest --campaign <campaña> --apply`).
   Operación en la skill [`efeonce-marketing-studio`](../../../.claude/skills/efeonce-marketing-studio/SKILL.md).
   Las versiones quedan `imported` hasta que alguien las apruebe en Studio.
2. **Metricool:** un post por red, con su portada propia (en Instagram, un video 16:9 lleva portada 4:5; LinkedIn,
   16:9), horario por cruce de mejores horas con la cola y **readback por SHA-256** de la media re-alojada contra los
   finales. Receta y schema MCP vigente en
   [entrega de video en Metricool](../../../.claude/skills/social-media-studio/references/video-delivery-metricool.md).
3. **Cierre honesto:** `PENDING` es programado, no publicado; declarar lo que queda en manos humanas (bio, aprobación
   en Studio, comprobación posterior a la hora, licencias para pauta).

## Gates proporcionales y recuperación

- **Antes de gastar:** verificar disponibilidad de lo pedido en la superficie concreta. Una función visible
  en web no existe necesariamente en el conector. Cotizar todas las entradas y variantes; si el costo real
  no puede acotarse al límite autorizado, resolver la incertidumbre antes de enviar.
- **Antes de una nueva generación:** nombrar el defecto, comprobar que no venga de la referencia o del
  montaje, explicar por qué las fuentes existentes no bastan y qué diferencia hará el intento. Parar ante
  una discrepancia de cobro, deriva de identidad repetida o piloto rechazado sin nueva hipótesis verificable.
- **Antes de unir ventanas:** probar entrada, centro y salida en contexto; la continuidad incluye trayectoria,
  aceleración, luz, parallax, tamaño y sonido. Los handles se planifican, no se inventan con crossfade.
- **Antes de llamar acabado al export:** comprobar fuente, reencuadre, resampling, codec y color. Dimensiones
  4K no demuestran detalle nativo. El archivo revisado, su hash y el archivo entregado deben coincidir.
- **Ante falta de escucha:** entregar la medición como medición y marcar escucha pendiente; ASR, forma de
  onda y loudness no demuestran calidad musical ni ausencia perceptual de voz.
- **Al cerrar seguimiento:** pausar sólo el monitor que corresponde, después de entrega revisada o fallo
  informado. Conservar IDs para recuperar la solicitud sin volver a pagar. No inventar ETA desde un solo piloto.

## Cómo convertir un acierto o tropiezo en método

Cada aprendizaje declara: `observación → evidencia → causa confirmada o hipótesis → intervención →
resultado → límites → regla reusable → prueba de no regresión`. Una solución que gustó puede mejorarse:
identificar el mecanismo que funcionó y variar un parámetro cada vez conservando una referencia congelada.
Medir calidad por comprensión, identidad, continuidad y energía percibidas; no por cantidad de efectos,
resolución nominal, número de prompts o tiempo invertido.

El caso SKY distingue explícitamente la preparación con Claude —assets por pieza, vistas y cámaras— de
las iteraciones posteriores. Ese trabajo es una entrada reutilizable del proceso, con su autoría y sus
aprobaciones, y no se atribuye a la etapa de rescate. Tres cámaras, 24 fps, 9:16, los tiempos, el morado y
la URL Bubble son decisiones de esa producción: cada nuevo brief declara las suyas.

## Cierre y mantenimiento

Actualizar primero el companion dueño; después el router necesario y ambos espejos `.codex`/`.claude`.
La cronología y los gastos de SKY siguen en la retrospectiva y CDR-008. Esta decisión queda indexada en
[DECISIONS_INDEX](../../architecture/DECISIONS_INDEX.md). No autoriza commit, push ni publicación.


## Validación de esta actualización documental

Revisión por tres subagentes con ownership separado: preproducción, posproducción/audio y auditoría de
aciertos/fallas. Revisión adversarial posterior corrigió contradicciones residuales de chunks, cantidad de
planos, generación automática ante fallo, costos, capacidades históricas y estados de integración.

- Los tres companions y las dos plantillas están conectados desde Motion/Audio y este método.
- `pnpm skills:mirrors` valida ahora también los bundles completos Motion Design Studio y Audio Studio.
- `node --check scripts/skills/validate-mirrored-skills.mjs` y cierre documental acotado: sin incidencias.
- 103 enlaces locales comprobados en 18 documentos de método/skills/plantillas: ninguno roto.
- `git diff --check` en el alcance documental: sin incidencias. El QA general vio WIP ajeno; no se atribuye su estado a esta actualización.
- Los SHA-256 de ambas entregas V17 coinciden con el registro previo: esta revisión no modificó los videos,
  no ejecutó generación pagada ni cambia el estado de escucha/aprobación del master.

El control de contexto estricto se ejecuta al cierre después de estas ediciones. Estas comprobaciones
validan integración documental, no la eficacia todavía no medida del método en una producción futura.
