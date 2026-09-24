# Producción y posproducción de video: método de principio a fin

## Decisión operativa

- **Status:** Accepted — método documental solicitado por el operador el 2026-09-24; no implementación de plataforma.
- **Date / Validated as of:** 2026-09-24.
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

El diseño sonoro comienza en el guion, pero su generación/mezcla final sigue el corte real. Si luego cambia
la imagen, invalida los cues afectados y revisa la sincronía; no reutilices ciegamente el reporte anterior.
Un rodaje con playback o una pieza coreografiada a música aprobada debe declarar esa dependencia desde el
brief: cambia el orden de decisiones, no elimina la revisión conjunta final.

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
