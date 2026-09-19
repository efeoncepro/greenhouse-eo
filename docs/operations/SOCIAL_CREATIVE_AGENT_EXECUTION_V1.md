# Ejecución de creatividad social para Codex y Claude

Estado: vigente para trabajo local autorizado. Owner: Social Media Studio. Actualizado: 2026-09-19.
Alcance: solicitudes de seasonality, trendjacking, memes de marca, creatividad social y correcciones de
identidad/product placement. Es un protocolo de entrada y cierre; las skills enlazadas contienen el oficio.
No habilita publicación, presupuestos externos nuevos ni cambios de runtime.

## 1. Contrato de lectura y ownership

Codex carga `.codex/skills/`; Claude carga `.claude/skills/`. Ambos árboles deben ser idénticos en los
archivos compartidos. Las rutas Codex de este documento tienen equivalente Claude con el mismo sufijo.
No cargar todos los studios: componer únicamente las capacidades que exige el encargo.

| Necesidad | Fuente a cargar | Responsabilidad |
|---|---|---|
| Pieza social con texto, contraste tipográfico o Bricolage/Poppins/Guttery | [Advertising Creative](../../.codex/skills/efeonce-advertising-creative/SKILL.md) | aplicar contrato AXIS, brief, ficha tipográfica y gate DO/DON'T; Social conserva el canal |
| Mecanismos, innovación, emoción, atención, memoria, heurísticas o sesgos | [Módulo 12](../../.codex/skills/social-media-studio/modules/12_CREATIVE_REASONING_AND_EMOTIONAL_DESIGN.md) | convertir evidencia en hipótesis de diseño y ejecuciones; no prometer efectos neuronales/comerciales |
| Clasificar, idear, dirigir y entregar una pieza social | [Social Media Studio](../../.codex/skills/social-media-studio/SKILL.md) y [módulo 11](../../.codex/skills/social-media-studio/modules/11_TRENDJACKING_CREATIVE_PRODUCTION.md) | Social conserva el seguimiento del entregable completo |
| Detectar o comprobar conversación emergente | [Listening y trends](../../.codex/skills/social-media-studio/modules/05_SOCIAL_LISTENING_TRENDS.md) | verificar detonante, código, mercado y vigencia |
| Seasonality de Efeonce | [Overlay estacional](../../.codex/skills/social-media-studio/efeonce/SEASONAL_CONTENT.md) | aplicar la línea y el contexto de Efeonce; no universalizarla a clientes |
| Layout, tipografía y acabado | [Design Studio](../../.codex/skills/design-studio/SKILL.md), módulos 03 y 13 | decidir jerarquía, material, cámara, composición y adaptación |
| Marca en objeto, envase, prenda o producto | [Brand in scene](../../.codex/skills/social-media-studio/references/brand-in-scene.md) | separar pertinencia narrativa, geometría, material y fidelidad |
| Herramientas y operaciones generativas | [Conectores](../../.codex/skills/social-media-studio/references/social-production-connectors.md) | descubrir contrato vigente y comprobar resultado por operación |
| Posicionamiento/atribución/activo distintivo | [Brand Studio](../../.codex/skills/efeonce-brand-studio/SKILL.md) | criterio de marca; no reemplaza la producción |
| Claims sectoriales introducidos en la pieza | fuente primaria y skill del dominio aplicable | verificar afirmaciones médicas, financieras u otras de alta exigencia; la categoría por sí sola no impone veto |
| Relación imagen/texto o adaptación verbal | [Copywriting](../../.codex/skills/copywriting/SKILL.md) | voz, mecanismo verbal, lectura y copy literal |

El [contrato multimodal](GREENHOUSE_MULTIMODAL_CAMPAIGN_PRODUCTION_V1.md) conserva las fronteras del
runtime. Si una capacidad artesanal no está soportada por el compiler, describir la prueba local como tal;
no inventar campos de schema ni aprobar una campaña para ejecutar un experimento.

**Forma exacta de marca dentro de una escena generada (regla corregida 2026-09-17).** Cuando la forma debe salir
exacta —logo de Efeonce, isotipo, mascota 3D, logo de cliente—, el render determinístico entra como **referencia de
forma** y la **intención** (material, montaje, escena, cámara, atmósfera) va en el prompt; el modelo genera la escena
alrededor. **Nunca pegar el render sobre la escena como camino por defecto:** conserva el material y la luz del kit, no
pertenece a la escena y el operador lo rechazó («se ve muy falso»). La composición determinística y el halo enmascarado
quedan como excepción, sólo con material exacto del kit y objeto chico o de detalle fino. **QA obligatorio:** comparar
**letra por letra** contra el render (letras, órbita con sus cortes, ventanas), color sin deriva y perspectiva
coherente; la firma de la pieza sigue siendo el SVG oficial compuesto con AXIS. Método y evidencia:
[bitácora del kit 3D](social/2026-09-17-efeonce-logo-3d-reference-kit-production-method.md).
**Vestir a una persona con ropa de marca** usa el mismo contrato: pasar la vista del
[kit de prenda](social/2026-09-17-hoodie-efeonce-garment-reference-kit.md) que corresponde al **ángulo de la toma**
(de espaldas → vista de espalda), junto con las referencias de rostro y cuerpo; el texto y los emblemas de la prenda se
componen determinísticamente y nunca se le piden al modelo.

## Referente de seasonalities y destino editorial

El [calendario de Metricool en Notion](../../.codex/skills/social-media-studio/references/seasonality-reference-calendar.md)
es un referente de fechas e ideas para Efeonce y clientes. No es el calendario de contenidos ni el
scheduler. Cargar esa referencia para investigar ocasiones, verificar mercado/año y resolver el destino
editorial; sólo las oportunidades seleccionadas dentro de un encargo pasan a brief y planificación.

## 2. Responder al pedido que existe

| Pedido del operador | Acción requerida | Cierre esperado |
|---|---|---|
| «Explícame/distingue/evalúa» | investigar cuando haga falta y responder con criterios, aplicación y límites | explicación o evaluación; no mutaciones ni renders inferidos |
| «Haz/crea una pieza» | ejecutar desde el punto ya resuelto del brief hasta el archivo revisado | mostrar pieza y declarar estado de revisión |
| «Propón conceptos» | desarrollar rutas de mecanismo y justificar selección | conceptos reviewables; producir sólo si el encargo lo incluye |
| «Corrige este logo/copy/objeto» | conservar concepto y decisiones aceptadas; modificar el defecto y revisar efectos colaterales | nueva versión y evidencia comparada; no reabrir todo por costumbre |
| «Actualiza las skills/docs» | localizar dueños y contradicciones, editar canon y mirrors, validar referencias y escenarios | documentación operable y resultados de checks |
| «Publica/envía» | comprobar autorización exacta, destino y versión; ejecutar sólo en alcance autorizado | readback de la acción real, separado del archivo local |

La cortesía «puedes hacer» también encarga trabajo. No terminar en un prompt si se solicitó una pieza.
No producir una nueva imagen porque una pregunta conceptual mencione la pieza anterior.

## 3. Qué hacer si falta información

Recuperar primero conversación, archivos explícitos, brand pack y fuentes de la cuenta. No pedir de nuevo
copy, logo, formato o autorizaciones ya entregados. Distinguir:

- **Dato crítico sin sustituto:** marca/cliente ambiguo entre cuentas, activo necesario ausente, texto literal
  sin recuperar, mercado/hemisferio o edición necesarios para verificar una fecha relativa, o autorización de publicación inexistente. Pedir sólo lo faltante; continuar investigación
  o boceto que no dependa de ello. No inventar marca, etiqueta o aprobación.
- **Elección creativa reversible:** composición, tratamiento, ubicación de una firma o ruta de producción
  dentro de lo autorizado. Elegir con razón explícita y continuar; no crear una aprobación por paso.
- **Evidencia ausente de tendencia:** conservar incertidumbre. No etiquetar como viral ni afirmar oportunidad
  activa. Entregar evaluación condicional, ruta estacional/evergreen si corresponde o no-go fundamentado.
- **Canal no definido:** para exploración puede declararse un formato provisional. No afirmar que ese
  archivo sirve para todas las superficies; confirmar destino antes de su entrega para publicación.

Los ejemplos y defaults son criterios iniciales, no licencia para sustituir decisiones explícitas del usuario.

## 4. Registro mínimo de decisiones

Usar el [brief ejecutable](../../.codex/skills/social-media-studio/templates/social-creative-production.md).
Puede estar en un archivo compacto o en la tarea existente; no crear una plataforma ni formulario nuevo.
Cada campo debe tener un valor, una hipótesis identificada o `no aplica` con razón, nunca aprobación inventada.

Antes de gastar en renders, dejar localizables:

1. Clasificación y evidencia: seasonality, reactivo o evergreen; si hay mezcla, separar qué ejecución pertenece a cada una.
2. Audiencia/mercado, objetivo, ventana y por qué participar.
3. Observación, tensión, mecanismo, idea elegida y vínculo de marca; alternativas sólo si el concepto sigue abierto.
4. Papel de marca y modalidad de atribución; un objeto corporativo no es obligatorio.
5. Canal, formato, recorrido de lectura, copy fijo, referencias por rol y elementos protegidos.
6. Ruta de producción, defecto que resuelve cada operación y condición de descarte.
7. Cinco revisiones: estratégica, creativa, cultural/contextual, marca y producción.
8. Artefactos, versión, decisiones pendientes y alcance de autorización.

No convertir las siete decisiones ya conocidas en siete preguntas. Para una corrección localizada,
referenciar el brief anterior y registrar sólo el delta y las revisiones que puede invalidar.

## 5. Estados y evidencia: no mezclar

| Estado | Evidencia requerida | No autoriza a afirmar |
|---|---|---|
| Concepto propuesto | razonamiento y ejecución descrita | que existe una pieza |
| Prueba producida | archivo accesible y abierto | que pasó revisión o aprobación |
| Revisada por el agente | observaciones de las cinco revisiones aplicables, móvil/detalle/formato | aprobación del operador, exactitud vectorial generativa ni performance |
| Aprobada por el operador | instrucción explícita vinculada a versión y alcance | publicación si sólo aprobó el arte |
| Programada | readback del scheduler con ID, fecha/zona, provider, copy, media, portada y estado | publicación efectiva o resultados |
| Publicada/enviada | readback del canal/destino y versión | resultados de audiencia |
| Medida | datos con periodo, denominador, fuente y limitaciones | causalidad comercial no demostrada |

Un rechazo visual invalida el estado de aceptación de esa versión aunque el checker técnico siga verde.
La evaluación del agente debe nombrar defectos reales y resolverlos cuando el encargo lo autorice; no usar
«requiere revisión humana» como sustituto de su propia revisión. Una limitación de fidelidad debe quedar visible.

## 6. Cómo entregar

Mostrar el resultado solicitado y explicar brevemente concepto, cambios relevantes y límites pendientes.
En trabajo de producción, incluir archivo final y variantes acordadas, fuente editable cuando exista,
provenance de activos/operaciones y revisión por formato. No atribuir a Higgsfield o Magnific un resultado
producido con otro motor; discovery de catálogo no es smoke de generación.

Si sólo falta aprobación visual, entregar la prueba reviewable. Si existe un defecto material no resuelto,
nombrarlo y declarar la pieza como prueba incompleta. No ocultar el defecto con un score de calidad.

## 7. Mantenimiento y validación entre agentes

- Corregir la regla canónica en lugar de añadir excepciones contradictorias al final de varios archivos.
- Mantener los routers raíz breves; los detalles viven en módulos/references/templates de la skill.
- Copiar sólo archivos propios al espejo tras revisar WIP; no sincronizar ciegamente carpetas ajenas.
- Ejecutar `pnpm skills:mirrors`, verificar enlaces relativos desde ambos árboles y revisar escenarios de
  [creative-review-cases](../../.codex/skills/social-media-studio/references/creative-review-cases.md).
- El mirror checker prueba paridad, no buen criterio. Una evaluación de escenarios prueba lectura/aplicación
  documental, no calidad de un render, reconocimiento de marca ni desempeño social.
- Al tocar routers: `pnpm claude-md check`. Al cerrar docs: `pnpm docs:closure-check`; después de las últimas
  ediciones y de rotación si hace falta, `pnpm docs:context-check:strict`.

Marco de decisiones existente: [ADR del router de agentes](../architecture/GREENHOUSE_AGENT_CONTEXT_ROUTER_DECISION_V1.md)
y contrato multimodal. Esta actualización desarrolla el oficio y las rutas dentro de esos límites; no cambia
source of truth runtime, autonomía, allowlists, presupuesto, compiler ni derechos de publicación.

## Video de seasonality desde una metáfora visual

Social mantiene el ownership y carga el [workflow audiovisual](../../.codex/skills/motion-design-studio/workflows/seasonality-visual-metaphor-to-video.md)
(espejo Claude). Extiende este protocolo a storyboard/contact sheet, keyframes, preflight, generación,
marca exacta, audio, revisión temporal y entrega. Un render es candidato, no aprobación. La ejecución
Seedance 2.5 del 2026-09-12 conserva limitaciones y hashes en el workflow. Este aprendizaje artesanal
no modifica compiler, autoridad MCP ni runtime del contrato multimodal. ADR de referencia:
`GREENHOUSE_AI_CREATIVE_DATA_GOVERNANCE_DECISION_V1.md` (Proposed; no implica aprobación del proveedor).

## De una mesa gastronómica a una campaña programada

La [metodología Fiestas Patrias](social/2026-09-13-fiestas-patrias-production-method.md) conserva correcciones,
valores efectivos, timeline, entregables y programación; el [manual](../manual-de-uso/social/producir-y-programar-seasonalities.md)
y la [descripción funcional](../documentation/social/produccion-seasonalities.md) permiten operarla.
Para ejecución cargar [Motion](../../.codex/skills/motion-design-studio/workflows/food-table-native-reel-and-exact-post.md),
[tipografía](../../.codex/skills/greenhouse-typography-accessibility/references/campaign-ink-metrics-and-hierarchy.md)
y [entrega/Metricool](../../.codex/skills/social-media-studio/references/video-delivery-metricool.md).
Los valores del caso no son presets universales; la autorización ya otorgada persiste y PENDING sigue
separado de publicado. Estos aprendizajes no amplían el contrato multimodal ni el presupuesto.

## De la revisión adversarial a una serie programada

La [bitácora Viva México y previa 18](social/2026-09-16-viva-mexico-y-previa-18-production-method.md) conserva la
revisión adversarial que rechazó un concepto sin conexión de marca, el límite legal de símbolos patrios de México,
la secuencia de carrusel con plate idéntico, caras del equipo con consentimiento, la escalada de una estática plana a
escena 3D de alto impacto, el recolor determinístico que reemplazó un inpainting con deriva geométrica y la
programación de carrusel, documento de LinkedIn y estáticas en Metricool. Reglas en
[casos de revisión](../../.codex/skills/social-media-studio/references/creative-review-cases.md),
[línea estacional](../../.codex/skills/social-media-studio/efeonce/SEASONAL_CONTENT.md) y
[entrega Metricool](../../.codex/skills/social-media-studio/references/video-delivery-metricool.md). Imágenes sociales en
PNG (regla dura desde 2026-09-16).

## Key visual paraguas con mascota de partner

La [bitácora del KV «Tu IA no conoce tu negocio»](social/2026-09-17-kv-tu-ia-no-conoce-production-method.md) conserva
el sistema modular de mascotas (Nexa central, una sola mascota de partner por imagen, cursor e insignia ligados a la
mascota), el riesgo de lectura sobre el partner, el recorrido v01→v05 con las correcciones del operador, Clawd 3D desde
el sprite oficial, el plate nativo guiado por boceto que reemplazó un repintado con recorte mordido, la opción
`presentation` del adapter AXIS y la programación en Metricool. Detalle en su
[`LEEME.md`](../../ai-generations/2026-09-17_kv-tu-ia-no-conoce/LEEME.md).
Las poses 3D reutilizables de Clawd y Codex (fuente oficial, ángulos, accesorios y reglas de uso) están inventariadas en
[bibliotecas de mascotas de partners](social/PARTNER_MASCOT_POSE_LIBRARIES.md).

## Delta 2026-09-19 — trendjacking de franquicia en carrusel («Nivel de búsqueda», GTA VI)

La [bitácora del caso](social/2026-09-19-nivel-de-busqueda-gta6-trendjack-production-method.md) y la carpeta
`ai-generations/2026-09-19_nivel-de-busqueda/` conservan el recorrido v1→v2, el estudio visual y la programación.
Reglas nuevas, con el oficio en el [módulo 11](../../.codex/skills/social-media-studio/modules/11_TRENDJACKING_CREATIVE_PRODUCTION.md)
(espejo Claude):

- **Estudiar la estética del trend con fuentes antes de dirigir.** Nunca de memoria: la v1 (synthwave de Vice City
  2002) fue rechazada porque GTA VI es Florida hiperreal de 2026. Estudio con URL y etiquetas `[V]/[O]/[NV]`,
  activos de IP que no se usan y regla orgánico OK / pauta con `legal-privacy-ip-operator`.
- **Carrusel de trendjacking con el código del juego:** portada-gancho con el meme vigente → reencuadre → N misiones
  = mecanismo real del servicio → cierre → contraportada con CTA, refuerzos y marca como héroe. El layout del texto se
  declara en el prompt del plate (porcentajes de alto, cielo oscuro reservado), no con velos.
- **Readback por firma de imagen:** tras programar, además del texto idéntico a `COPY.md`, comprobar el orden de la
  secuencia comparando la firma de la media re-alojada por Metricool contra los PNG locales (primera = portada,
  última = contraportada). Receta en [entrega Metricool](../../.codex/skills/social-media-studio/references/video-delivery-metricool.md) §3.
- **Pieza suelta separada de la secuencia:** nombre, hoja de revisión y programación propios; la hoja del carrusel
  va en orden de publicación, no alfabético.

El meme «We got X before GTA 6» caduca el 19-nov-2026; no reutilizar el gancho después. Regresiones en
[casos de revisión](../../.codex/skills/social-media-studio/references/creative-review-cases.md); fuentes fechadas en
[trend-production-sources](../../.codex/skills/social-media-studio/references/trend-production-sources.md).
