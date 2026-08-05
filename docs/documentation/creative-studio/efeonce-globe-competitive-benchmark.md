# Benchmark competitivo de Efeonce Globe

> **Tipo:** documentación funcional
> **Versión:** 1.0
> **Fecha:** 2026-08-05
> **Documento detallado:** [Benchmark comparativo Globe frente a Higgsfield y Magnific](../../audits/competitive-ui/GLOBE_COMPETITIVE_BENCHMARK_HIGGSFIELD_MAGNIFIC_2026-08-05.md)
> **Manual de revalidación:** [operar el benchmark competitivo](../../manual-de-uso/creative-studio/operar-benchmark-competitivo-globe.md)

## Qué responde

Este benchmark documenta qué hacen Higgsfield y Magnific para crear y revisar imágenes, videos y audio, y qué
debe aprender Globe de esos workflows. La comparación se hizo contra una sesión autenticada y contra Globe
main@21d6ee3; no es una promesa de paridad inmediata ni una decisión de arquitectura.

La respuesta funcional es simple:

- Globe tiene una base más fuerte de confianza: estimate antes de gastar, governance, provenance, rights,
  retrieval privado y lineage.
- A nivel de UI, Higgsfield y Magnific son claramente más fuertes hoy: tienen mejor jerarquía, affordances más
  consecuentes y un workflow de asset mucho más continuo.
- En imagen, Globe queda atrás en la adaptación del composer al objetivo/modelo, en la expresividad del muro y
  en la contundencia del viewer. En video, la brecha crece: los líderes muestran modos, presets, frames,
  capabilities, coste, posters y revisión temporal; Globe tiene parte del contrato abajo, pero no toda la
  dirección creativa arriba.
- En audio, la distancia también es alta: los líderes muestran voz, script, emoción, parámetros, waveform y
  biblioteca contextual; Globe tiene rutas de audio ricas, pero el composer activo todavía muestra Voice como
  «—» y comparte demasiada forma con el resto de modalidades.
- Higgsfield y Magnific tienen un loop de uso más completo: crear, abrir, revisar, editar, recrear, reutilizar,
  organizar y compartir.
- Sus homes también son más fuertes, aunque con ventajas distintas: Higgsfield convierte inspiración, presets,
  comunidad y modalidades en entradas directas a producir; Magnific convierte la suite, los modelos y las
  capacidades en una arquitectura navegable.
- La primera mejora de Globe debe conectar la interfaz activa con los contratos que ya existen.

La home se revalidó el 2026-08-05 tomando control de las pestañas existentes del Chrome autenticado, sin crear un
perfil, pestaña ni contexto nuevo. Higgsfield conserva su feed editorial con Assets, cuenta, proyectos, presets y
comunidad; Magnific redirige a `/app` y presenta un workspace con command bar, modalidades, Projects, Spaces,
Library y novedades. La evidencia pública anterior queda separada como referencia secundaria; la lectura
autenticada está en el documento detallado.

## Cómo leer el estado actual

El diseño del producto completo sigue incluyendo composer multimodal, referencias, estimate, biblioteca,
viewer, refinement, review y sharing. Sin embargo, el contrato publicado no equivale automáticamente a una
acción entregada en la superficie React.

| Área | Contrato o capacidad existente | Estado React verificado al 2026-08-05 |
|---|---|---|
| Feed | asset list, favorite y copyAsReference | Reference, Recreate, Favorite y Download siguen sin handlers reales en ProducerFeedRoute |
| Composer | RouteCreativeContractV1 y 17 rutas catalogadas | el composer usa todavía parte de la taxonomía legacy y no consume creativeContract de forma completa |
| Viewer | governed-media, MediaStage, facts y provenance | no tiene aún Info/Tools/Comments, timeline ni acciones de review/reuse |
| Audio | TTS, cambio de voz, traducción, foley y shape constraints | formato y velocidad visibles; Voice queda como «—» |
| Share | board read-only con facts, comentarios y MediaStage | disponible como superficie separada; no reemplaza el viewer de Producer |
| Home / descubrimiento | feed, proyectos, presets, modelos, modalidades y entradas a generar | Globe necesita unir feed, intención, ruta/modelo, composer, viewer y biblioteca sin depender de una landing pasiva |

Para decisiones de implementación, consulta el [documento de auditoría completo](../../audits/competitive-ui/GLOBE_COMPETITIVE_BENCHMARK_HIGGSFIELD_MAGNIFIC_2026-08-05.md)
y el [contrato creativo por ruta](./efeonce-globe-contrato-creativo-ruta.md).

## Qué debe cambiar en la experiencia

1. Cada control visible debe ejecutar una operación real o explicar por qué está bloqueado.
2. El composer debe nacer del contrato de la ruta, no de un formulario común con campos heredados.
3. El asset debe tener dos escalas de revisión: card rápida y viewer profundo.
4. Reference y Recreate deben precargar lineage sin crear gasto hasta la confirmación.
5. Audio debe mostrar únicamente los controles que la ruta puede honrar.
6. La ventaja de governance de Globe debe aparecer como información comprensible, no como metadata invisible.

## Prioridades

- **P0:** TASK-1643 — acciones del feed e inputs obligatorios, con contratos `TASK-1503` y composer `TASK-1552`.
- **P0:** TASK-1552, alineada con TASK-1633 — consumo de creativeContract.
- **P1:** MediaStage/ProducerViewer con review, tools y lineage.
- **P1:** Reference/Recreate zero-spend, continuidad extendida por `TASK-1643` y luego `TASK-1582`.
- **P1:** model picker y biblioteca.
- **P2:** audio route-native, waveform, help y recovery.

El benchmark no crea esas tasks ni cambia su estado. El estado vigente vive en Handoff, tasks y runtime.
