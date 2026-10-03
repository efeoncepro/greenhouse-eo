# EPIC-051 — Producción de video con IA: capacidades CLI por fase con garantía medida

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño. Taxonomía y matriz operación × motor publicadas el 2026-10-03; ningún canario del programa corrido todavía`
- Rank: `TBD`
- Domain: `content|platform`
- Owner: `unassigned`
- Branch: `Greenhouse develop; sin worktrees ni rama por task`
- GitHub Issue: `none`

## Summary

Convierte la producción de video con IA de Efeonce —hoy repartida entre muchos motores (Seedance 2.x, Flux 3, Wan
3.0, MiniMax H3, Gemini Omni, la API de Higgsfield con Kling y otros), recetas por caso y ffmpeg a mano— en un
**conjunto de capacidades CLI organizadas por fase (preproducción, producción, posproducción)**, cada una con la forma
de producto que exige ADR-024: canario real, contrato estable, defaults elegidos por medición, modos de falla con
detector y modelo de costo. La clasificación que lo ordena es la
[taxonomía de producción de video](../../architecture/GREENHOUSE_AI_VIDEO_PRODUCTION_TAXONOMY_V1.md); el estado de
cada operación por motor está en la [guía de selección §4.3](../../architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md).

## Why This Epic Exists

- **Una sola operación de video tiene garantía medida:** editar una zona con cámara quieta (`pnpm ai:inpaint video` +
  `flux3-edit`, canario 2026-10-02). Las demás generaciones están verificadas sólo a nivel de contrato del endpoint
  (2026-09-16/24): sabemos que devuelven un archivo con la resolución pedida, no si conservan el primer cuadro, la
  identidad o la continuidad.
- **La mayoría de las operaciones de posproducción no tienen camino propio** (borrar, seguir, reemplazar, fondo,
  relight, upscale con detalle, grade, reencuadre, retime, montaje): se hacen ad hoc o con herramientas de proveedor.
  El 2026-10-03 se verificó que la **CLI de la app de Higgsfield** (`higgsfield`, con sesión) cubre casi todas como
  puente —Veo 3.1, Genjutsu, SAM 3, Topaz, reframe, doblaje—, pero ninguna se corrió y ninguna tiene garantía.
- **El gasto real se desvió de lo estimado** (SKY V11: estimado USD 23,88, facturado USD 34,16). Un programa de
  canarios sin reconciliación por request repetiría ese error.
- No cabe en una task: son capacidades independientes (segmentación, generación comparativa, acabado determinístico,
  relight, audio) que comparten taxonomía, banco de medición y núcleo.

## Regla del programa: propio primero, proveedor como puente

*(Operador, 2026-10-03.)* Si una operación la resuelven nuestros CLIs —los que existen o los que construye este
epic—, va por ahí; mientras no exista lo nuestro, se usa la herramienta del proveedor (CLI de Higgsfield, MCP de
Higgsfield o Magnific, fal) y cada operación declara qué task la reemplaza (taxonomía §3.13). Los modelos generativos
siempre son de un proveedor: lo propio es la capa que los invoca con estimación, manifiesto y garantía, más lo
determinístico. TASK-1986 hace que el puente de Higgsfield se invoque **desde nuestros CLIs**, para que incluso el
puente quede con costo, manifiesto y, donde aplique, la verificación del pipeline.

## Outcome

- Cada operación de la taxonomía §3.5 tiene en la guía §4.3 al menos un motor con **canario de garantía** o queda
  declarada como hueco con razón.
- Un **banco de canarios de video** reusable mide cualquier motor contra el mismo brief (fidelidad del primer cuadro,
  parpadeo, deriva de identidad, costura, costo real por request).
- **Borrar y seguir objetos** en video (cámara en movimiento incluida) con la garantía del pipeline: delta 0 fuera de
  la máscara por cuadro y detector de residuo.
- **Acabado determinístico** (grade, reencuadre con franjas medidas, retime, montaje por EDL, overlays, loudness,
  export con hash) como CLI con manifiesto, a 0 créditos.
- El núcleo nuevo nace puro y sin I/O, listo para `@efeoncepro/axis-creative-core` (ADR-024 §D5, gate de TASK-1976).

## Architecture Alignment

- `docs/architecture/GREENHOUSE_AI_VIDEO_PRODUCTION_TAXONOMY_V1.md` (clasificación y vocabulario de operaciones)
- `docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md` (§4.3 operación × motor; §7 costo)
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CLI_FIRST_GRADUATION_DECISION_V1.md` (ADR-024: CLI primero, cinco
  requisitos de graduación, núcleo compartido)
- `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` (§Pipeline de inpainting: recomposición, delta 0,
  códigos de salida)
- `docs/operations/creative-production/VIDEO_PRODUCTION_AND_POSTPRODUCTION_V1.md` (método, estados y gates)
- `.claude/rules/brand-photography.md` (cast, Nexa, Sparks, mascotas de partner, uniforme, firma)

## Arquitectura

Los pasos de cada pieza se orquestan con el runner de [ADR-025 (Accepted 2026-10-03)](../../architecture/creative-studio/EFEONCE_VIDEO_PRODUCTION_PIPELINE_ARCHITECTURE_V1.md):
plan declarativo por toma, ejecutores (`cli`, `puente`, `humano`, `local`), compuertas automática, humana y de gasto, y
ledger append-only. Las demás tasks del epic son **ejecutores** de ese runner: devuelven manifiesto y código 0/2/3/1.

## Child Tasks

- `TASK-1989` — Runner de producción de video (`pnpm video:plan|run|approve|budget|status`): núcleo del plan, ledger con
  retome e invalidación, compuertas y tres recetas (ADR-025). **Espina del programa.**

- `TASK-1979` — Borrar y seguir objetos en video: SAM 2 (máscara por cuadro) + Wan VACE (borrado) sobre
  `pnpm ai:inpaint video`, con detector de residuo y deriva por banda. **Primera candidata.**
- `TASK-1980` — Banco de canarios de video (`pnpm ai:video-bench`) + canarios de generación: i2v desde still,
  consistencia de cast (r2v), primer/último cuadro y keyframes, resolución nativa; reconciliación por request.
- `TASK-1981` — Acabado determinístico de video (`pnpm video:finish`): grade, reencuadre con franjas medidas (4:5),
  retime, montaje por EDL, overlays compuestos, loudness y export con hash.
- `TASK-1982` — Extender y loop con costura medida.
- `TASK-1983` — Recorte de sujeto / reemplazo de fondo y upscale con detalle verificable.
- `TASK-1984` — Relight de video que conserva el sujeto (continuación de TASK-1977).
- `TASK-1985` — Diálogo, voz y lipsync en español sobre video (con `audio-studio`).
- `TASK-1987` — Producto físico exacto compuesto cuadro a cuadro, con oclusión de manos y pase de integración obligatorio
  ([anexo de producto e interfaces](../../architecture/GREENHOUSE_AI_VIDEO_PRODUCT_AND_INTERFACE_V1.md) §2).
- `TASK-1988` — Kit propio de motion de UI y sincronía por acción: captura o render → cursor, tap, scroll, typing, zoom,
  llamadas, marco de dispositivo; detección del cuadro del gesto para cortar en la acción (anexo §3).
- `TASK-1986` — Puente de la CLI de Higgsfield como motor de nuestros CLIs: costo en créditos, manifiesto, retome por
  job, reconciliación crédito→USD y canario de humo C11 de las capacidades puente más usadas.

**Orden:** TASK-1989 Slices 1–3 primero o en paralelo (la espina: sin gasto); TASK-1986 temprano (habilita a las demás a comparar contra el puente de Higgsfield desde el banco);
TASK-1979 y TASK-1980 en paralelo (son las de más uso y la primera candidata conocida); TASK-1981 en
paralelo desde el inicio (0 créditos, no compite por presupuesto); TASK-1982 y TASK-1983 usan el banco de TASK-1980;
TASK-1984 espera a TASK-1977; TASK-1985 al final.

## Plan de canarios priorizado

Convierte `[verificado]`/`[contrato]` en **canario de garantía**. Prioridad = lo que más usaría Efeonce (piezas
sociales y ads desde un still aprobado, con cast recurrente). **Costos estimados el 2026-10-03** con
`pnpm ai:fal --estimate` (no encola) o, donde se indica, con la tarifa publicada de la guía; 5 s por toma. **Cada
canario requiere autorización explícita del monto en chat** y `pnpm ai:fal --balance` antes y después; la estimación
no es techo de factura.

| # | Canario | Motores y operaciones | Estimado (USD) | Qué mide (garantía) | Task |
|---|---|---|---|---|---|
| C1 | **i2v desde still aprobado** (la operación más usada), **un brief por tipo de video** (taxonomía §3.1b: `fotorrealista`, `producto`, `personaje-3d`, `atmosfera`), 9:16 | Seedance 2.5 720p ≈ 2,31 · Flux 3 720p 0,85 · Wan 3.0 720p 0,50 · H3 Max 768P 0,20 · H3 Turbo 768P 0,10 · Omni 720p ≈ 0,51 (nominal, guía) · Kling 3 std (Higgsfield) ≈ 0,54 (estimate de la guía §5.8) | **≈ 5,0 por tipo** (hasta ≈ 20) | fidelidad del primer cuadro contra el still, métrica principal del tipo, parpadeo, deriva de identidad, duración y fps; costo real por request | TASK-1980 |
| C2 | **Cast entre tres tomas** (Nexa o elenco ficticio), misma ancla | Wan r2v 720p 3 × 0,50 · H3 Max r2v 768P 3 × 0,20 · Omni referencias 720p 3 × ≈ 0,51 · Seedance 2.5 r2v 720p 1 × ≈ 2,31 | **≈ 6,0** | identidad entre tomas con `foto:rostro` por cuadro muestreado; emblema con `foto:emblema` si hay uniforme | TASK-1980 |
| C3 | **Borrar un objeto** en tres clips (cámara quieta, paneo, objeto en movimiento) | SAM 2 video + Wan VACE inpainting | **[sin dato]**: medir con `--balance`; tope propuesto 3,0 | delta 0 fuera de la máscara dilatada por cuadro; residuo con SAM 2 sobre la salida; parpadeo en el borde | TASK-1979 |
| C4 | **Editar una zona con cámara en movimiento** (máscara de SAM 2) | SAM 2 + `flux3-edit` 3 × 0,15 | **≈ 0,45 + SAM 2 [sin dato]** | delta 0 por cuadro con máscara móvil; deriva medida en banda junto a la máscara | TASK-1979 |
| C5 | **Extender y cerrar en loop** | Seedance 2.5 extensión 720p ≈ 2,31 (+ video de entrada) · `flux3-extend` 720p 2,05 · Omni extender 720p ≈ 0,51 · loop por primer/último cuadro: `flux3-flf` 0,85 · `wan3-i2v --end-image` 0,50 | **≈ 6,2** | costura: diferencia en la junta, continuidad de movimiento y audio; cierre del loop | TASK-1982 |
| C6 | **Primer/último cuadro y keyframes** | `flux3-keyframes-draft` 0,30 → `flux3-enhance` del elegido (registro ≈ 0,43) · H3 Max `--end-image` ≈ 0,20 | **≈ 0,9** | fidelidad de cada cuadro fijado en su índice | TASK-1980 |
| C7 | **1080p nativo vs reescalado**, sólo con los motores que pasen C1 | Seedance 2.5 1080p ≈ 5,20 (CLI; la guía publica 5,82) · Flux 3 1080p 1,45 · Wan 1080p 1,00 · H3 Max 1080P 0,40 | **≈ 8,1** | detalle nativo (detector de TASK-1983) además de dimensiones | TASK-1980 |
| C8 | **Recorte de sujeto y upscale** | candidatos fal de matting y upscale de video | **[sin dato]**; tope propuesto 2,0 | borde sin halo; detalle nativo frente a la fuente | TASK-1983 |
| C9 | **Relight de video** | ID-V2V Relight 5 s ≈ 1,00 · LightX ≈ 0,50 (tarifas [tercero], guía §10.3) | **≈ 1,5** | sujeto exacto entre cuadros; luz coherente | TASK-1984 |
| C11 | **Humo del puente Higgsfield** (una corrida por capacidad): Veo 3.1 lite, Kling 3.0, `sam_3_video`, `video_background_remover`, `topaz_video`, `hf_mult_replace_object`, `reframe`, `dubbing` a español | Veo 3.1 lite 8 s 12 cr · Kling 3.0 5 s 8,75 cr · resto requiere subir la fuente para estimar | **≈ 21 créditos + post [sin dato]**; tope propuesto 150 créditos | entrega real, formato, tiempo y créditos reales por job; valor del crédito en USD | TASK-1986 |
| C12 | **Producto físico en mano** (hero hold + giro), tres técnicas: i2v desde still, sustituto + Genjutsu, sustituto + composición propia con integración | según motor; estimar en la task | **[sin dato]**; tope a autorizar | forma y marca del producto, oclusión de dedos, **«¿se ve pegado?»** contra el i2v nativo | TASK-1987 |
| C13 | **Persona usando nuestro portal** (feature spotlight 15 s, tenant de ejemplo): pantalla nativa «video-safe» en P3/P4 contra partir con inserto P6 | Wan 3.0 720p ≈ 3,05 · Seedance 2.5 720p ≈ 13,37 (guía §7.4) | **≈ 4,4–19,1** con reserva | legibilidad, sincronía gesto→UI (≤ 2 cuadros), coherencia pantalla nativa/inserto, manos | TASK-1988 |
| C10 | **Diálogo en español con lipsync** (elenco ficticio + voz sintética, sin persona real) | Seedance 2.5 720p ≈ 2,31 · Flux 3 720p 0,85 · Wan 720p 0,50 | **≈ 3,7** | sincronía labial y pronunciación por escucha | TASK-1985 |

**Total aproximado del programa:** ≈ USD 32–47 en fal/Omni (según cuántos tipos se corran en C1) más lo `[sin dato]` (C3, C4, C8), y ≈ 150 créditos de Higgsfield
(C11, de 4.118 disponibles el 2026-10-03). **Saldo fal al 2026-10-03:** cuenta A
USD 0,00 · cuenta B USD 11,46: alcanza para C1 + C6 (o C1 + C2 parcial); el resto requiere recarga.

**Lo que no se paga:** todo `TASK-1981` (determinístico) y los re-pasos de medición sobre salidas ya pagadas.

## Existing Related Work

- `TASK-1965` (complete) — pipeline de inpainting de imagen y video; canario de `edit.zone` con `flux3-edit`.
- `TASK-1973` (complete) — técnicas de edición de imagen; dejó VACE + SAM 2 como follow-up.
- `TASK-1976` (to-do) — núcleo de inpainting listo para extraer; su gate de frontera aplica al código nuevo de video.
- `TASK-1977` (to-do) — relight que conserva el objeto (imagen); su follow-up de video es TASK-1984.
- `TASK-1978` (to-do) — un solo motor de expansión (imagen); no se toca acá.
- Workflows de `motion-design-studio` (`workflows/*.md`) — recetas de caso que el programa no reemplaza.
- `EPIC-050` (Creative Workbench a escala) — consumidor de estas capacidades para SKY y otros clientes.

## Exit Criteria

- [ ] Las once tasks hijas quedaron `complete` o explícitamente descartadas con razón.
- [ ] Cada operación de producción y post de la taxonomía §3.5 tiene, en la guía §4.3, un motor con canario de
      garantía o una fila de hueco con razón y fecha.
- [ ] Cada canario del plan tiene README en `ai-generations/<fecha>_<task>-canary/` con costo estimado y costo real
      reconciliado por request.
- [ ] Los huecos de severidad A de la taxonomía §5 (H1, H2, H3, H9, H10, H11, H13, H14) están cerrados con evidencia.
- [ ] El núcleo nuevo pasa el gate de frontera de TASK-1976 (sin `@/`, disco ni red).

## Non-goals

- Globe (hibernado): ninguna capacidad se gradúa en este epic; sólo nace graduable.
- Motion de marca y de Glitch (repo taller `efeonce-brand-workshop`).
- Entrenar identidad (LoRA de H3, Soul ID, `elements` de Kling): follow-up después de C2.
- Interpolación de cuadros, texto en escena con detector y stream en tiempo real (huecos C de la taxonomía).
- Publicar o entregar piezas a clientes: este epic construye capacidades y mide; la entrega sigue el método.
