# Efeonce Creative Studio — Creative Workflows para equipos creativos

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-07-06 por Claude (vision operador Julio Reyes)
> **Ultima actualizacion:** 2026-07-14 por Codex
> **Estado:** Visión funcional de la plataforma hermana agentic; no está construida. La propuesta histórica de ubicarla en Greenhouse quedó superseded.
> **Documentación técnica vigente:** [Efeonce Creative Studio — Agentic Platform Architecture V1](../../architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md). La [ADR Creative Flow Studio](../../architecture/GREENHOUSE_CREATIVE_FLOW_STUDIO_DECISION_V1.md) se conserva como referencia de diseño DAG, ya superseded como runtime.
> **Investigación activa:** [RESEARCH-009 — Creative Operations y workflows agentic](../../research/RESEARCH-009-creative-operations-agentic-workflows.md) separa evidencia de mercado de decisiones de producto.

## Que es

**Efeonce Creative Studio** es un entorno de producción donde una persona creativa trabaja con briefs, referencias, tratamientos, storyboards, candidatos, comentarios y aprobaciones. El sistema conserva esas decisiones y, cuando una dirección ya está aprobada, las convierte en una **receta de producción** repetible y trazable.

No necesitas pensar como ingeniería ni construir un grafo para empezar. Preservas lo que no debe cambiar, exploras alternativas, explicas qué debe evitarse y eliges qué se entrega. Creative Studio traduce esas acciones a referencias, restricciones, variantes, rúbricas y pasos ejecutables. Cuando el patrón ya fue probado, puede volver a correrse con otros inputs sin reconstruir el contexto.

Un ejemplo de flujo:

```
[Brief de campaña] → [Generar hero image] → [Animar a video 9:16] → [Revisión humana] → [Editar / componer] → [Locución es-CL] → [Reframe a 3 formatos] → [Entregable]
```

Un flujo no sustituye la parte divergente de la creatividad. Primero existe exploración: problema, concepto, referencias, tratamientos y alternativas. Sólo cuando dirección creativa fija una intención puede nacer una receta repetible que un operador o agente ejecute con inputs acotados. Un canvas de nodos puede existir después como vista avanzada para builders; no es la experiencia inicial ni la forma obligatoria de trabajar. La investigación de este modelo de dos velocidades, del patrón **builder → runner** y de los límites del agente vive en [RESEARCH-009](../../research/RESEARCH-009-creative-operations-agentic-workflows.md).

## Para que sirve

- **Producir campañas completas a escala**, no piezas sueltas: de un brief salen imagen + video + audio + versiones por formato, en una sola corrida.
- **Repetir la misma receta** con distintos insumos (otra marca, otro idioma, otro formato) sin rearmar nada.
- **Entregables de cliente Globe** (aerolineas, bancos, manufactura): sets de campaña reproducibles.
- **Alimentar el sitio y la marca** (heros, ilustraciones, videos cortos) desde una receta gobernada.
- **Operar por conversacion con Nexa**: le pides "arma un flujo de banner + video para esta campaña", Nexa propone la receta y el costo, tu confirmas, y se ejecuta.

## Piloto operativo: Glitch, El micrófono se abre

El 2026-07-11 se validó una corrida manual y versionada de este modelo de trabajo para la intro de Glitch. No construye todavía el lienzo ni el motor del Estudio de Flujos: valida el ciclo operativo que el futuro producto deberá orquestar.

La corrida separó con claridad:

1. Fuente creativa canónica en 4K.
2. Adapter de inferencia limitado a la resolución aceptada por el modelo.
3. Generación controlada con aprobación y metadata.
4. Master local, edición del video existente cuando aplica, finish editorial, revisión humana y foley posterior controlado.
5. Composición determinista de assets exactos (por ejemplo, tipografía suministrada) cuando el modelo no puede conservarlos.
6. Archivo gobernado sólo después de aprobar creativamente.

El proveedor bloqueó seis requests iniciales antes de generar candidatos. La recuperación histórica neutralizó texto legible dentro de un adapter y produjo un candidato técnico, pero la revisión posterior dejó claro que no era una solución creativa: el texto era un practical del set y no se podía reponer en post. Este resultado enseña que un flujo no debe reintentar a ciegas: conserva el input, evidencia el bloqueo, permite una recuperación mínima sólo si no altera la verdad de la toma y corta el gasto si esa recuperación no funciona.

El piloto además comprobó un límite operativo importante: una edición video-a-video puede completar técnicamente y aun así romper continuidad. Un finish determinista sirve sólo si el master ya contiene la actuación correcta y el ajuste no cambia la verdad física del plano. La revisión creativa posterior rechazó la recuperación F/I: el `ON AIR` ya existía como practical en el key visual original, pero al reponerlo en post se veía pegado; el retime de la mano se leía como presión y el foley Gemini no sonaba a una prueba real de micrófono. Seedance después conservó correctamente el set 4K de Glitch, pero tampoco aprobó el gesto ni el audio: conservar diseño y cumplir una acción física son gates separados.

La comparación no clasifica motores por canal. En la landing de Redes Sociales se generó primero un paquete ficticio de ocho imágenes; Omni animó seis referencias de ese paquete en microescenas publicadas. Allí las imágenes eran una ancla de lenguaje visual y no había texto/practical exacto que conservar. Para una identidad de set, producto o practical físico que debe mantenerse reconocible, el workflow prueba primero un motor de referencia como Seedance. Para una microescena flexible, un loop conversacional o una campaña ficticia desde stills, Omni sigue siendo una mano probada. El paso futuro `generate-video` debe registrar este contrato de fidelidad junto a modelo, referencia, presupuesto y revisión; no debe inferirlo desde “RRSS” o “landing”. La regla operativa completa vive en [Selección por contrato de fidelidad](../../../.codex/skills/motion-design-studio/workflows/engine-selection-by-fidelity-contract.md). El estado sigue siendo piloto: no implica que el Estudio de Flujos exista como producto ni que una generación sea automáticamente aprobada o publicable.

Una capacidad externa adicional, aún sin prueba interna aprobada, es usar una previs 3D exportada como video de referencia junto a un keyframe de look final en Seedance. No significa importar Blender ni habilitar un renderer 3D: el modelo interpreta video, imágenes y prompt. El contrato, límites y la exclusión expresa del blocking 3D de Glitch viven en [Previsualización 3D con Seedance](previs-3d-y-referencias-seedance.md).

## Como funciona (en simple)

Tiene tres capas, y es importante entender que son distintas:

1. **La superficie creativa (lo que ves).** Trabajas con brief, referencias, tratamientos, candidatos, variantes y review. Explorar, guardar o comentar no ejecuta gasto por sí solo.
2. **La receta compilada.** El sistema convierte decisiones aprobadas en inputs permitidos, invariantes, pasos, gates y límites de costo. Un builder autorizado puede inspeccionarla o usar una vista de grafo avanzada cuando haga falta.
3. **El runner (lo que no ves).** Cuando una persona autorizada aprueba ejecutar, el motor recorre la receta en orden. Como generar video o audio tarda minutos, trabaja en segundo plano, conserva el avance y avisa cuando hay candidato o revisión pendiente.

Una idea clave: **la receta no genera nada por sí misma.** Creative Studio coordina adapters de generación, edición y composición mediante su runner separado; conserva assets, derechos, gasto, lineage y review. Greenhouse puede recibir proyecciones o entregables aprobados, pero no hospeda ese runtime ni sus créditos.

## Como se estructura una receta por dentro

Cada paso tiene entradas y salidas compatibles (texto, imagen, video, audio), políticas de costo y review. La persona que corre un template usa variables creativas entendibles; no recibe IDs de nodo, claves de proveedor ni prompts internos. Una vista avanzada puede representar estos pasos como nodos, pero la seguridad y la lógica viven en el contrato ejecutable, no en el dibujo.

Tipos de paso previstos:

| Paso | Que hace |
|---|---|
| **Entrada / Brief** | El punto de partida: un texto, una imagen de referencia, parametros |
| **Generar imagen** | Crea una imagen con el mejor modelo segun el caso |
| **Generar video** | Anima una imagen o crea un video |
| **Editar video** | Cambia un clip existente sólo cuando el cambio necesita una acción, objeto o píxel que aún no está en el material. |
| **Revisión humana** | Pausa la receta para mirar el resultado real y aprobar o rechazar creativamente; terminar una generación no salta este nodo. |
| **Componer / editar** | Reordena timing, sostiene un beat, agrega foley o compone texto/logo/practical exacto desde un asset real sin pedir otra generación. |
| **Locucion / Musica / SFX** | Genera audio (voz, musica, efectos) |
| **Mejorar (upscale)** | Sube la resolucion o la calidad |
| **Reencuadrar (reframe)** | Cambia el formato (16:9, 9:16, 1:1) |
| **Componer** | Junta piezas en un entregable |
| **Salida / Entregable** | El resultado final, que queda en la libreria de assets |

## Quien puede operarlo

La misma plataforma contempla tres modos futuros; ninguno está habilitado para clientes todavía:

| Modo | Cómo se trabaja | Quién responde |
|---|---|---|
| **Client-operated** | El equipo creativo/marketing del cliente corre templates curados con variables y límites aprobados. | Efeonce responde por plataforma y policy; el cliente por la ejecución y entrega que controla. |
| **Co-operated** | El cliente conserva la dirección y comparte la ejecución con Efeonce. Cada run o lane tiene un operador explícito. | Cada parte responde por el tramo que controla. |
| **Efeonce-managed** | Efeonce construye y opera el workflow; el cliente conserva brief, marca y aprobación final. | Efeonce responde por el delivery pactado y puede comprometer OTD/FTR sobre su scope. |

No son tres productos ni una nueva modalidad comercial. Son maneras de asignar autoridad dentro del mismo sistema. Una corrida puede escalar de client-operated a co-operated o managed sin reenviar el brief ni perder referencias, decisiones, costos o historial.

## Que significan los estados

Cuando corres un flujo, ves su avance:

- **En cola:** la receta esta lista y esperando turno para ejecutarse.
- **Ejecutando:** el motor esta generando; cada paso muestra su propio estado (esperando, generando, listo).
- **En revisión:** el asset existe, pero una persona debe mirar actuación, continuidad, texto, sonido y corte. Aún no es un entregable.
- **Completado:** todos los pasos, incluida la revisión requerida, terminaron; los entregables estan en la libreria.
- **Con fallas:** algun paso no pudo terminar. Importante: **no pierdes lo que ya se genero** — los pasos que si terminaron quedan guardados, y puedes retomar desde ahi.
- **Cancelado:** lo detuviste; los pasos que faltaban no se ejecutan ni se cobran.

## El gasto (lo mas importante de entender)

Un flujo **multiplica el gasto**: si tiene 5 pasos que generan media, son 5 generaciones reales, cada una cuesta dinero. Por eso:

- Antes de ejecutar, el Estudio te muestra el **costo total estimado del flujo completo** (la suma de todos sus pasos), no el de un paso suelto.
- Si el costo supera el limite configurado, **hay que aprobarlo explicitamente** antes de correr.
- Cuando lo opera Nexa, Nexa **propone** la receta y el costo total; **tu confirmas**; recien ahi se ejecuta. Nexa nunca gasta por su cuenta.

## Que no hacer

- No pienses que explorar, guardar o versionar una receta equivale a ejecutarla. Sólo un run aprobado puede gastar.
- No ejecutes un flujo grande sin mirar el **costo total estimado** primero.
- No esperes que un paso genere algo distinto a su tipo de salida: un paso de imagen produce imagen, no video. Para pasar de imagen a video hay una etapa aparte.
- No asumas que client-operated incluye dirección, QA o SLA de un Managed Squad. La responsabilidad debe quedar visible antes de correr.

## Problemas comunes

- **"Un paso quedo en falla."** El motor reintenta solo un par de veces. Si igual falla, el flujo queda "con fallas" pero conservas lo ya generado; puedes ajustar ese paso y retomar.
- **"La receta no acepta este input."** El tipo o la variable no está publicada para ese template (por ejemplo, audio donde se espera imagen). Un builder autorizado debe revisar la receta; el runner no cambia su estructura durante una corrida.
- **"Me pide aprobar antes de correr."** El costo total estimado supero el limite; es la proteccion de gasto funcionando.
- **"La edición terminó, pero se ve mal."** El estado técnico no es aprobación creativa. Rechaza ese paso conservando su evidencia. Si sólo necesitas timing, orden, texto exacto o foley, usa el mismo clip en una etapa de composición; si faltan píxeles/acción, formula una nueva edición acotada.

## Diferencia con otras herramientas

- **Generador Visual de Assets** ([ver doc](generador-visual-assets.md)) es una herramienta interna para una imagen o animación. Creative Studio gobierna una producción completa, su memoria y sus responsabilidades.
- **Adapters de media:** son quienes llaman modelos o renderers. Creative Studio decide cómo se coordinan, qué derechos/costos se registran y cuándo un resultado pasa a review.
- **Content Factory del sitio (WordPress):** es para publicar contenido editorial (posts, landings). El Estudio de Flujos produce el media (imagenes, videos, audio) que ese contenido puede usar.

---

> **Detalle técnico vigente:** la decisión de plataforma vive en la [ADR de Efeonce Creative Studio](../../architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md) y su [arquitectura objetivo](../../architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md). La ADR Creative Flow Studio y Media Generation Foundry se conservan sólo como historia superseded de la antigua ubicación Greenhouse.
