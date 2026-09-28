# Render gobernado de piezas de marca — La órbita y Glitch

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-09-28 por Claude
> **Ultima actualizacion:** 2026-09-28 por Claude
> **Documentacion tecnica:** [Artifact Render Pipeline §10](../../architecture/GREENHOUSE_ARTIFACT_RENDER_PIPELINE_V1.md) · [TASK-1921](../../tasks/in-progress/TASK-1921-brand-surface-pieces-governed-production-route.md)
> **Manual de uso:** [Pedir el render de una pieza de marca](../../manual-de-uso/creative/pedir-render-de-piezas-de-marca.md)

## Qué es

Hasta ahora, las piezas de la marca Efeonce («La órbita») y las ediciones de Glitch se componían en el computador de
alguien, con `pnpm brand:compose` o `pnpm glitch:compose`. El render gobernado hace lo mismo **dentro de la
plataforma**: una persona del equipo, o un agente autorizado, pide la pieza y recibe los archivos (PDF o PNG) guardados
de forma privada en Greenhouse, con el registro de qué se usó para producirlos.

**Estado:** construido y probado, **todavía apagado**. Falta desplegarlo y probarlo en staging (ver «Qué falta»).

## Qué se puede pedir

| Pedido | Qué es | Qué se recibe |
|---|---|---|
| Pieza de La órbita | Una pieza por superficie (web, DOOH, pDOOH, motion, video) o una lámina de deck | PNG por pieza, o el PDF del deck |
| Documento de La órbita | Un brochure o una propuesta de varias páginas | Un solo PDF |
| Edición de Glitch (semanal) | Carrusel, portadas y capas de un episodio | El PDF del carrusel y los PNG de portadas y capas |

Se pide con el **mismo archivo** que usa el comando local (el intent de la pieza o el manifiesto de Glitch). Las
fotos, plates y logos no se leen del computador: se suben antes a Greenhouse y el pedido los nombra.

El **Glitch Flash** (el formato puntual de una sola noticia, sin número de edición, desde el 2026-09-28) todavía **no
se puede pedir** aquí: se compone sólo con el comando local `pnpm glitch:compose`. Entra a esta ruta cuando TASK-1921 lo
cablee.

> Detalle técnico: tres familias de pedido y seis catálogos; ver [§10.1](../../architecture/GREENHOUSE_ARTIFACT_RENDER_PIPELINE_V1.md).

## Cómo funciona

1. **Se piden** la pieza y sus fuentes (las imágenes ya subidas).
2. **Greenhouse revisa antes de encolar:** que la receta esté aprobada, que respete el contrato de AXIS y que cada
   imagen exista. Si algo falla, responde con el motivo y **no se encola nada**.
3. **Se encola:** un trabajo por cada tipo de salida (en Glitch, uno para el carrusel, otro para las portadas y otro
   para las capas).
4. **El worker compone** en la nube, con las mismas reglas que el comando local, y guarda los archivos.
5. **Se consulta el pedido** para ver el estado y descargar lo listo (la descarga exige sesión en Greenhouse).

Pedir dos veces lo mismo no duplica nada: devuelve el pedido que ya existía. Si cambia la versión de AXIS, sí es un
pedido nuevo.

## Estados

| Estado del pedido | Qué significa |
|---|---|
| `pending` | Encolado, nadie lo tomó todavía |
| `running` | Al menos un trabajo se está componiendo |
| `completed` | Todos los trabajos terminaron bien |
| `partial_failed` | Algunos terminaron y otros no: se informan los dos |
| `failed` | Ningún trabajo terminó |

Cada trabajo puede fallar y **reintentarse solo** hasta tres veces. Si el motivo no cambia al reintentar (la receta no
compone, una lámina queda vacía, el pedido ya no corresponde a lo sellado), queda en `dead_letter` y hay que revisar
el pedido.

## Quién puede usarlo

- Personas internas con el rol **designer** o **efeonce_admin**.
- Agentes internos (Nexa, gateway MCP) mediante la tool `request_brand_render`.
- Un usuario de cliente **nunca** pide ni ve piezas de marca: hoy la única marca es la de Efeonce.

## Qué no hace

- No aprueba, no agenda y no publica una pieza. Producir no es aprobar.
- No lee archivos del computador de nadie.
- No propone planes de deck (eso llega con TASK-1932).

## Qué falta para usarlo

Desplegar los dos workers, prender el flag `BRAND_RENDER_ENABLED` en los tres lugares donde se lee y probar los seis
catálogos en staging. Hasta entonces, cualquier pedido responde «render apagado».

> Detalle técnico: flag multi-runtime en [FEATURE_FLAG_STATE_LEDGER.md](../../operations/FEATURE_FLAG_STATE_LEDGER.md); señal `brand.render.stuck_job` en [§10.4](../../architecture/GREENHOUSE_ARTIFACT_RENDER_PIPELINE_V1.md).
