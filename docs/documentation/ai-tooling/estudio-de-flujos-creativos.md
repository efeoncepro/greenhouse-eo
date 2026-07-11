# Estudio de Flujos Creativos — Orquestación de Media con Nodos

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-07-06 por Claude (vision operador Julio Reyes)
> **Ultima actualizacion:** 2026-07-06 por Claude
> **Estado:** Propuesta histórica de ubicación Greenhouse — no está construido ahí. El programa vigente nace como plataforma hermana agentic.
> **Documentación técnica vigente:** [Efeonce Creative Studio — Agentic Platform Architecture V1](../../architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md). La [ADR Creative Flow Studio](../../architecture/GREENHOUSE_CREATIVE_FLOW_STUDIO_DECISION_V1.md) se conserva como referencia de diseño DAG, ya superseded como runtime.

## Que es

El **Estudio de Flujos Creativos** es un lienzo donde armas una **receta de produccion** conectando pasos con cables, como en Higgsfield, Krea o ComfyUI. Cada paso es un **nodo** (generar imagen, animar a video, ponerle voz, reencuadrar), y las conexiones dicen como fluye el resultado de un paso al siguiente.

En vez de generar una imagen suelta a mano y despues, aparte, un video, y despues, aparte, una locucion, **armas el flujo una vez** y Greenhouse lo ejecuta completo de principio a fin. Y lo puedes volver a correr con otros datos cuantas veces quieras.

Un ejemplo de flujo:

```
[Brief de campaña] → [Generar hero image] → [Animar a video 9:16] → [Revisión humana] → [Editar / componer] → [Locución es-CL] → [Reframe a 3 formatos] → [Entregable]
```

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

La comparación no clasifica motores por canal. En la landing de Redes Sociales se generó primero un paquete ficticio de ocho imágenes; Omni animó seis referencias de ese paquete en microescenas publicadas. Allí las imágenes eran una ancla de lenguaje visual y no había texto/practical exacto que conservar. Para una identidad de set, producto o practical físico que debe mantenerse reconocible, el workflow prueba primero un motor de referencia como Seedance. Para una microescena flexible, un loop conversacional o una campaña ficticia desde stills, Omni sigue siendo una mano probada. El nodo futuro `generate-video` debe registrar este contrato de fidelidad junto a modelo, referencia, presupuesto y revisión; no debe inferirlo desde “RRSS” o “landing”. La regla operativa completa vive en [Selección por contrato de fidelidad](../../../.codex/skills/motion-design-studio/workflows/engine-selection-by-fidelity-contract.md). El estado sigue siendo piloto: no implica que el Estudio de Flujos exista como producto ni que una generación sea automáticamente aprobada o publicable.

## Como funciona (en simple)

Tiene dos capas, y es importante entender que son distintas:

1. **El lienzo (lo que ves).** Es la parte visual: arrastras nodos, los conectas, ajustas parametros. Aqui solo *dibujas* la receta. Guardar el lienzo no gasta nada.
2. **El motor (lo que no ves).** Cuando le das "ejecutar", un motor recorre la receta **en orden** —respetando que cada paso espere a los que necesita— y va generando cada pieza. Como generar video o audio tarda minutos, el motor trabaja **en segundo plano**: te muestra el avance paso a paso y te avisa cuando termina.

Una idea clave: **el Estudio de Flujos no genera nada por si mismo.** Cada paso que genera media (una imagen, un video, una voz) se lo pide al **motor de generacion de Greenhouse** (la "fabrica de media"). El flujo solo **coordina** el orden y pasa el resultado de un paso al siguiente. Asi, todo el control de calidad, moderacion y —sobre todo— el **control de gasto** ya viene resuelto por la fabrica.

## Como se ve un flujo por dentro

Cada nodo tiene **entradas** y **salidas** con un tipo (texto, imagen, video, audio). Solo puedes conectar cosas compatibles: la salida de imagen de un nodo entra a la entrada de imagen del siguiente. No puedes conectar una salida de audio a una entrada de imagen — el lienzo no te deja.

Tipos de nodo previstos:

| Nodo | Que hace |
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

## Que significan los estados

Cuando corres un flujo, ves su avance:

- **En cola:** la receta esta lista y esperando turno para ejecutarse.
- **Ejecutando:** el motor esta generando; cada nodo muestra su propio estado (esperando, generando, listo).
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

- No pienses que "guardar la receta" = "ejecutarla". Guardar el lienzo no gasta; ejecutar si.
- No ejecutes un flujo grande sin mirar el **costo total estimado** primero.
- No esperes que un paso genere algo distinto a su tipo de salida: un nodo de imagen produce imagen, no video. Para pasar de imagen a video hay un nodo aparte.

## Problemas comunes

- **"Un paso quedo en falla."** El motor reintenta solo un par de veces. Si igual falla, el flujo queda "con fallas" pero conservas lo ya generado; puedes ajustar ese paso y retomar.
- **"No me deja conectar dos nodos."** Los tipos de entrada/salida no son compatibles (por ejemplo, audio → imagen). Revisa que la salida y la entrada sean del mismo tipo.
- **"Me pide aprobar antes de correr."** El costo total estimado supero el limite; es la proteccion de gasto funcionando.
- **"La edición terminó, pero se ve mal."** El estado técnico no es aprobación creativa. Rechaza ese nodo conservando su evidencia. Si sólo necesitas timing, orden, texto exacto o foley, usa el mismo clip en un nodo de composición; si faltan píxeles/acción, formula una nueva edición acotada.

## Diferencia con otras herramientas

- **Generador Visual de Assets** ([ver doc](generador-visual-assets.md)) es para *una* imagen o animacion, como apoyo interno. El Estudio de Flujos es para *encadenar muchas piezas* en una produccion completa.
- **Fabrica de Media** (motor de generacion): es quien realmente genera cada pieza. El Estudio de Flujos la usa por debajo — es la coordinacion, no el generador.
- **Content Factory del sitio (WordPress):** es para publicar contenido editorial (posts, landings). El Estudio de Flujos produce el media (imagenes, videos, audio) que ese contenido puede usar.

---

> **Detalle tecnico:** la decision de arquitectura, el modelo de datos, la maquina de estados, la gobernanza de gasto y el roadmap por fases estan en [ADR Creative Flow Studio V1](../../architecture/GREENHOUSE_CREATIVE_FLOW_STUDIO_DECISION_V1.md). El motor de generacion que este estudio orquesta esta en [Media Generation Foundry](../../architecture/GREENHOUSE_CONTENT_FACTORY_MEDIA_GENERATION_ARCHITECTURE_V1.md).
