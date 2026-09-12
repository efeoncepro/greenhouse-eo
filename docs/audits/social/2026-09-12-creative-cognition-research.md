# Investigación aplicada: creatividad, emoción y cognición

Fecha: 2026-09-12. Estado: investigación y actualización documental; no prueba de rendimiento de campaña.
Encargo: profundizar mucho más en mecanismos, ejecuciones, innovación, conexión emocional, neurociencia,
heurísticas y sesgos; investigar con subagentes e incorporar conocimiento operativo a Codex/Claude.

## Método y alcance

Tres líneas de investigación por subagentes: mecanismos/innovación; emoción/atención/memoria;
heurísticas/sesgos/pruebas. Se consultaron artículos originales, revisiones/metaanálisis de autores,
repositorios académicos y marcos institucionales. Cada referencia distingue el nivel de acceso (abstract,
texto completo, teoría o registro). No es revisión sistemática exhaustiva; no se hizo metaanálisis propio.

El agente principal contrastó el metaanálisis de creatividad publicitaria Rosengren et al. y el estudio de
ideación visual asistida por IA Wadinambiarachchi et al. para integrar adecuación, memoria de marca y riesgo
de fijación. La página del DOI de Doshi/Hauser devolvió 403 en apertura; no se usa como fundamento principal
ni se afirma lectura completa de ese artículo. Las citas de las referencias indican qué respalda cada fuente.

## Entregables canónicos

- [Módulo 12](../../../.codex/skills/social-media-studio/modules/12_CREATIVE_REASONING_AND_EMOTIONAL_DESIGN.md):
  razonamiento creativo, innovación, emoción y selección; del mecanismo a ejecución y prueba.
- [Mecanismos e innovación](../../../.codex/skills/social-media-studio/references/creative-mechanisms-and-innovation.md):
  operadores, analogías/transformaciones, formatos, ejemplos y criterios de selección.
- [Emoción, atención y memoria](../../../.codex/skills/social-media-studio/references/emotion-attention-memory.md):
  hipótesis afectivas, interferencias, transferencia de marca y límites de inferencia neural.
- [Heurísticas, sesgos y pruebas](../../../.codex/skills/social-media-studio/references/heuristics-biases-and-testing.md):
  condiciones, contrapruebas, sesgos del creador y separación QA/personas/analytics/experimento.
- Brief ampliado con proposición/transformación/inferencia/atribución, intención emocional/funcional,
  hipótesis falsable, lectura rival, variable y prueba autorizada.
- Entradas Social/Design/Brand/Copy, protocolo compartido y router JSON dirigen al módulo sin obligar a
  cargar toda la bibliografía ni imponer estudio de audiencia a una corrección localizada.

## Decisiones de interpretación

1. Creatividad requiere considerar originalidad y adecuación; no reducirla a rareza o nueva tecnología.
2. Operador creativo, sesgo cognitivo y mecanismo neural son categorías diferentes. No etiquetar la metáfora
   de ausencia como loss aversion ni una palabra grande como prueba de efecto von Restorff.
3. Atención, comprensión, emoción, agrado, recuerdo del mensaje, atribución y conducta no son equivalentes.
4. Curiosidad/arousal pueden favorecer información prioritaria y perjudicar otra; marca periférica no hereda
   automáticamente memoria. Se incorporan estudios con resultados limitantes, no sólo favorables.
5. Las heurísticas visuales guían exploración y revisión; no prometen rutas oculares/emociones universales.
6. Innovación puede estar en concepto, ejecución, formato o sistema. Nombrar precedente y diferencia útil.
7. La crítica de un agente no representa audiencia ni independencia estadística entre modelos.
8. Un buen artefacto no necesita justificar cada decisión con neurociencia. Si la evidencia no corresponde,
   declarar criterio de oficio y diseñar una prueba proporcional en lugar de inventar causalidad.

## Ejemplo de aplicación y límites

La silla conserva concepto/copy/ausencia del descriptor. Se analiza la relación entre lugar preparado,
memoria y recibimiento; no se autoriza nueva producción ni se presentan variantes hipotéticas como aprobadas.
La libreta resuelve atribución; no se presume que la emoción o la memoria de la escena se transfieran a Efeonce.
Probar comprensión/marca exigiría personas o datos reales autorizados. En esta investigación no se reclutó,
no se generó media, no se publicó ni se operó ningún proveedor de producción.

## Gobernanza

Continúa el ADR del router y el contrato multimodal existente. No cambia modelo/runtime, permisos,
compositor, presupuesto, catálogo de canales, oferta comercial ni aprobación de la pieza v6. Las reglas nuevas
viven en skills espejo y se enrutan desde las fuentes existentes; no se crean instrucciones globales de
"neuromarketing" que sustituyan evidencia local.

## Revisión de aplicación y cierre

Un subagente leyó módulo 12 y las tres referencias y resolvió cinco escenarios sin generar media:

| Pedido | Acción operacional contrastada |
|---|---|
| «Dopamina y vender doble con pérdida» | traducir a objetivo observable, mantener sólo pérdida real pertinente, proponer enfoques sin multiplicadores ficticios |
| «Nostalgia sin tristeza» | diseñar tono afectuoso/continuidad y gestos apropiados sin prometer controlar toda respuesta individual |
| «Doce versiones son doce ideas» | clasificar por proposición/mecanismo/inferencia; tratamientos distintos no equivalen a conceptos |
| «Panel IA predice 90% recuerdo» | retirar inferencia de audiencia, conservar crítica útil y separar prueba humana autorizada |
| «AR en post estático» | separar pieza realizable de extensión tecnológica; no fingir interacción ni desplegar por inferencia |

Se corrigieron dos ambigüedades detectadas: existe una formulación de idea directa sin sorpresa obligatoria;
la intensidad emocional debe ser apropiada al arco, no necesariamente mínima. Se explicitó además la
compatibilidad entre interacción propuesta y superficie real. Esta revisión comprueba interpretación de
instrucciones; no certifica psicometría, respuesta humana ni ejecución del harness Claude.

Validación: `skills:mirrors` pasó; 331 enlaces relativos activos revisados sin destinos ausentes (anchors y
shards históricos no forman parte de esta comprobación); `git diff --check` pasó. `docs:closure-check` pasó
con advertencia heurística de UI por archivos de diseño heredados del cambio anterior, sin UI ejecutable
modificada. El context-check dio cero errores/advertencias y se repite tras esta nota final. Los módulos
Design compartidos se verifican además por igualdad de bytes, preservando entrypoints específicos por agente.
No se modificó frontmatter en esta ampliación salvo contenido de body/routing; no se presenta el helper
genérico limitado a otros campos como prueba del comportamiento de los agentes.

Estado: documentación/skills actualizadas y revisadas. Sin commit, publicación, gasto de generación ni
estudio de audiencia. Las afirmaciones de eficacia siguen condicionadas a evidencia del encargo concreto.
