# Ejecución de creatividad social para Codex y Claude

Estado: vigente para trabajo local autorizado. Owner: Social Media Studio. Actualizado: 2026-09-12.
Alcance: solicitudes de seasonality, trendjacking, memes de marca, creatividad social y correcciones de
identidad/product placement. Es un protocolo de entrada y cierre; las skills enlazadas contienen el oficio.
No habilita publicación, presupuestos externos nuevos ni cambios de runtime.

## 1. Contrato de lectura y ownership

Codex carga `.codex/skills/`; Claude carga `.claude/skills/`. Ambos árboles deben ser idénticos en los
archivos compartidos. Las rutas Codex de este documento tienen equivalente Claude con el mismo sufijo.
No cargar todos los studios: componer únicamente las capacidades que exige el encargo.

| Necesidad | Fuente a cargar | Responsabilidad |
|---|---|---|
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
