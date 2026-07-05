# VFX Shot Breakdown

> **Para qué.** Desglosar una toma con VFX en sus elementos y pasos, para producirla o entregarla a
> un artista. Un breakdown claro = menos iteraciones y un composite creíble a la primera.
> Ver `modules/11_VFX_COMPOSITING.md`. Cierra el loop con `motion-critique.md` + `motion-delivery-spec.md`.

## Cabecera

- **Toma / plano:** `[nº plano | referencia storyboard]` · **Duración:** `[Xs / frames a 24fps]`
- **Tipo de VFX:** `[compositing | keying | roto | tracking/matchmove | integración CGI | simulación | cleanup | set extension]`
- **Complejidad:** `[baja (stock composited) | media (roto+track) | alta (CGI+sim+matchmove)]`
- **Mano:** `[humano (Nuke/AE/Houdini) | IA-asistido (Runway/Roto Brush/Wonder) | híbrido]`

## Elementos de la toma (capas)

| # | Elemento | Fuente | Cómo se produce | Notas |
|---|---|---|---|---|
| 1 | `[plate base / fondo]` | `[cámara real | IA módulo 09 | stock]` | `[...]` | `[encuadre, movimiento]` |
| 2 | `[sujeto / personaje]` | `[real green screen | IA + Soul ID | 3D]` | `[key/roto]` | `[consistencia]` |
| 3 | `[CGI / elemento 3D]` | `[Blender/C4D | stock]` | `[render + integración]` | `[luz/sombra]` |
| 4 | `[partículas / atmósfera]` | `[IA plate | stock | Houdini sim]` | `[composite blend]` | `[humo/polvo/flare]` |
| 5 | `[título / logo / texto]` | `[After Effects]` | `[mograph, compositeado]` | `[texto real, NO generado]` |

## Pasos de producción (orden)

1. `[track/matchmove: qué se trackea, herramienta — Mocha/Nuke/AE]`
2. `[key/roto: sujeto a aislar, tool — Roto Brush 2 / Runway / manual]`
3. `[integración: luz/HDRI, sombra de contacto, reflejos]`
4. `[composite: ensamblar capas, blend modes]`
5. `[matchear: grano, motion blur, DoF, bordes/light wrap]`
6. `[cleanup: rigs/objetos a remover]`
7. `[entrega al grade — módulo 08]`

## Checklist de credibilidad — los 7 vectores (modules/11 §2)

- [ ] Perspectiva (ángulo/lente/escala) matcheada
- [ ] Luz (dirección/dureza/temperatura) matcheada
- [ ] Sombra propia + sombra de contacto (no flota)
- [ ] Color / ambiente / bounce matcheado
- [ ] Grano/ruido igual al plate base (no demasiado limpio)
- [ ] Bordes: light wrap + defocus, sin halo/recorte duro
- [ ] Motion blur + DoF igualados al movimiento de la toma

## QC IA (si hubo roto/key/mocap IA)

- [ ] Revisión **frame-a-frame** en los cortes visibles (la IA falla en pelo/oclusión/transiciones)
- [ ] Bordes en movimiento estables
- [ ] Sin flicker de matte

## Entrega

- **Formato de composite:** `[ProRes 4444 / EXR sequence / PNG con alfa]` · **Color space:** `[Rec.709 / P3 / linear]`
- **Handoff:** `[spec + plates + refs para el artista humano, si aplica]`
- **Gasto:** `[sim propia vs stock element — decisión de gasto gobernado]`

> **Regla:** el mejor VFX es invisible. Si en el QC "se nota el efecto", vuelve a los 7 vectores antes de entregar.
