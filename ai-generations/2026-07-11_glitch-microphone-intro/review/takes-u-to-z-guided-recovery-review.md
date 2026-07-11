# Revisión de recuperación U–Z

> Veredicto: **ninguna toma pasa los gates; no existe candidata final ni se publica nada.** El gasto generativo se detuvo después de Z. Los binarios se conservan sólo como evidencia del piloto.

## Contrato evaluado

- El PNG 4K `fde797…4608e` es la verdad de diseño: encuadre, micrófono, consola, paleta y practical rojo `ON AIR`.
- El practical debe existir dentro del estudio desde el primer frame. Se prohíben overlay, tracking, máscara, crop y recomposición posterior.
- Acción obligatoria: `hover → contacto de 1–2 frames → rebote y aire → pausa → contacto de 1–2 frames → rebote`.
- No se permite retime correctivo de la actuación.
- El sonido final no es el golpe acústico directo de piel contra malla. Es la respuesta que el micrófono captura y que el preamp y la corneta/monitor reproducen: exactamente dos impulsos breves, sin música, voz, ambiente ni tercer acento.

## Requests, artefactos y costo

| Take | Motor / request | Input y objetivo | Resultado | Costo estimado |
| --- | --- | --- | --- | ---: |
| U | Seedance 2.0 Standard reference-to-video · `019f51e3-9364-7e32-9d5f-0d5403c27185` | 4K + guía temporal + guía de dos respuestas de monitor; 1080p con audio nativo | Rechazado: cada contacto se expande a varios frames; audio con actividad anticipada/extendida | US$2.05 + tokens |
| V | Seedance 2.0 Standard reference-to-video · `019f51ed-9c41-7be1-a704-259a7367a3cd` | 4K + guía visual más breve; 1080p silencioso | Rechazado: contacto visible de aproximadamente cinco frames, no rebote balístico | US$2.05 + tokens |
| W | Veo 3.1 image-to-video · `019f51f6-c03f-75c3-a4d5-986506fd6c7f` | Frame hover no editado de V; 1080p silencioso | Rechazado: dos contactos largos y aparición de un orbe/luz blanca ajeno al set | US$0.80 |
| X | Seedance 2.0 Fast reference-to-video · `019f51fc-e47f-7032-9759-625f709b85a0` | 4K + guía mínima `aire-contacto-aire`; 720p silencioso | Rechazado: el modelo vuelve a expandir cada contacto a aproximadamente 5–6 frames | US$0.73 + tokens |
| Y | Kling O3 Pro video edit · `019f5204-9161-7c42-8c86-51a9a937d166` | Editar sólo la actuación de W y restaurar el set desde el 4K | Rechazado: presión sostenida, persiste el orbe y la mano desaparece después | US$0.67 |
| Z | Seedance 2.0 Fast reference-to-video · `019f520d-5406-7411-8113-3dec310bb415` | 4K como verdad visual + O como referencia de cadencia humana; 720p silencioso | Rechazado: abre ya apoyado y produce una ventana larga, no dos taps separados | US$0.73 + tokens |

El costo estimado de T–Z después de la recarga es **US$10.44 más token billing de Seedance**: T US$3.41, U US$2.05, V US$2.05, W US$0.80, X US$0.73, Y US$0.67 y Z US$0.73. Son estimaciones basadas en el tarifario oficial de Fal consultado el 2026-07-11; la factura de Fal es la fuente contable definitiva.

## Gates por toma

| Gate | U | V | W | X | Y | Z |
| --- | --- | --- | --- | --- | --- | --- |
| Diseño/cromática/composición | Pasa | Pasa | Pasa al inicio | Pasa | Falla al final | Pasa |
| `ON AIR` practical diegético | Pasa | Pasa | Pasa, pero aparece luz ajena | Pasa | Falla por continuidad del set | Pasa |
| Hover inicial | Pasa | Pasa | Pasa | Pasa | Pasa | **Falla: abre apoyado** |
| Dos contactos de 1–2 frames | Falla | Falla | Falla | Falla | Falla | Falla |
| Dos rebotes y aire inequívoco | Falla | Falla | Parcial | Falla | Falla | Falla |
| Audio de corneta, sólo dos eventos | Falla audio nativo | Pendiente, no procede | Pendiente, no procede | Pendiente, no procede | Pendiente, no procede | Pendiente, no procede |

## Evidencia reproducible

- Metadata/hashes: `masters/glitch-microphone-intro-{u,v,w,x,y,z}-*.metadata.json`.
- Prompts: `prompts/seedance-2-reference-guided-tap-tap*.md`, `prompts/veo-3-1-hover-source-double-tap.md` y `prompts/kling-o3-pro-tap-rebound-edit.md`.
- Renderers: `render-seedance-2-reference-guided-tap-tap.mjs`, `render-veo-3-1-hover-source-double-tap.mjs` y `edit-kling-o3-pro-tap-rebound.mjs`.
- Contact sheets/frames binarios: `review/take-{u,v,w,x,y,z}-*`; quedan archivados remotamente, no como bundle de producción.
- Fuentes auxiliares: guías bajo `refs/`; ninguna es un master aprobado.

## Decisión

No se mezcla audio ni se prepara entrega candidata porque el gate visual de actuación falla antes. Tampoco se retima el dedo ni se recompone el `ON AIR`: ambos recursos contradicen el contrato V2 y falsearían el resultado de la prueba.

La auditoría posterior corrigió el alcance de esta conclusión: no se agotaron todos los modelos generativos; se agotó repetir el contrato con una fuente que ya abre en contacto y con señal visible. El siguiente paso no es otro prompt ni 3D. Es decidir la narrativa y, si se mantienen hover + dos taps, aprobar primero un key visual precontacto fiel al 4K. Ver [source-state-and-creative-video-workflow-audit.md](./source-state-and-creative-video-workflow-audit.md). Hasta entonces, el estado correcto es **sin master aprobado / producción bloqueada**, no “final”.
