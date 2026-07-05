# 10 · Production Studio — la mano de ejecución (orquestación)

> **Tesis.** Este módulo es **cómo se produce**: la orquestación que ata el craft (01–08) y el
> pipeline IA (09) en un loop de producción real, decide **qué mano** hace cada toma (humano / IA /
> híbrido) y **gobierna el gasto y la entrega**. El estudio es *director, no dictador*: dirige y
> cura; la IA acelera; el humano hace el finish y **aprueba** antes de gastar créditos y de publicar.

> Ejecución real, herramientas conectadas y credenciales: `efeonce/STUDIO_TOOLING.md`. Cierra con
> `templates/motion-delivery-spec.md`. Frescura: el craft del loop es estable; las **herramientas IA**
> son volátiles `(as-of 2026-07 — reverificar)`.

---

## 1. El loop de producción

```
idear → storyboard → animatic → producir → editar → finalizar → entregar
```

| Fase | Qué se decide/produce | Módulo / artefacto |
|---|---|---|
| **Idear** | Concepto, mensaje, tono, arco, referencias | `modules/04` · `templates/motion-brief.md` |
| **Storyboard** | Planos, encuadres, secuencia de la historia | `modules/03/04` · `templates/storyboard.md` |
| **Animatic** | Storyboard con timing real + scratch de sonido/música | `modules/02/04/07` · `templates/animatic-shotlist.md` |
| **Producir** | Generar/animar cada toma (IA / humano / híbrido) | `modules/05/09` · `templates/shot-prompt-sheet.md` |
| **Editar** | Montaje, ritmo, continuidad, transiciones | `modules/06` · `templates/edit-decision-list.md` |
| **Finalizar** | Sonido + grade + finishing + upscale + render | `modules/07/08` · `templates/sound-design-brief.md` |
| **Entregar** | Master + versiones por destino + spec | `modules/08` · `templates/motion-delivery-spec.md` |

- **El animatic es el punto de control barato.** Corregir timing y estructura en el animatic cuesta
  minutos; corregirlo después de producir tomas IA cuesta créditos y re-tiradas. **Aprobá el animatic
  antes de producir.**
- **No saltees fases hacia adelante.** Producir sin storyboard/animatic aprobado = generar tomas que
  el edit va a descartar (gasto de créditos tirado).

---

## 2. Router de producción — humano vs IA vs híbrido

**La pregunta por toma: ¿qué mano da el mejor resultado al menor costo/riesgo?**

| Necesidad de la toma | Mano | Herramienta típica |
|---|---|---|
| **Tipografía kinética / mográfico de datos / UI / logo animado** | **Humano** | After Effects (control frame-exacto, texto legible) |
| **3D preciso (producto, logo 3D, cámara 3D controlada)** | **Humano** | Blender / Cinema 4D |
| **FX complejos (humo, fluidos, destrucción, partículas caras)** | **Humano** | Houdini / C4D |
| **Escena filmada / personaje / ambiente cinematográfico / plates** | **IA** | Higgsfield / Runway / Seedance / Veo / Kling / Omni (`modules/09`) |
| **Fondos, partículas de fondo, texturas, variación de volumen** | **IA** | text-to-video del agregador |
| **Personaje consistente hablando** | **IA** | Soul ID + LipSync + Voice Binding |
| **Escena IA con texto/logo de marca encima** | **Híbrido** | plate IA + texto/logo en AE (texto real, no generado) |
| **Escena IA con shake/move imposible** | **Híbrido** | plate IA estático + move/shake en post (`modules/09 §7`) |
| **Upscale / limpieza de detalle** | **IA (finish)** | Magnific (`modules/08 §8`) |
| **Edición, sonido, color grade final** | **Humano** | DaVinci Resolve / AE |

**Reglas de ruteo:**
- **Texto legible, logo, marca, mográfico → SIEMPRE humano/AE.** La IA derrite texto y logos
  (`modules/09 §7`). El texto de marca va real, en post.
- **Escena/personaje/ambiente → IA** por velocidad y volumen; la IA colapsa timelines de meses a
  minutos.
- **Cuando dudás, híbrido:** plate IA + capa humana encima es el default más robusto para marca.
- El **finish (edición/sonido/grade)** es **humano** siempre — es donde vive el juicio y la cohesión.

---

## 3. Herramientas y su rol

| Herramienta | Rol | Nota |
|---|---|---|
| **After Effects** | Mograph, tipografía kinética, compositing, logo, texto de marca | El caballo de batalla del motion graphics humano |
| **Blender / Cinema 4D** | 3D (producto, logo 3D, cámara 3D), previs | Blender gratis; C4D estándar de estudio |
| **Houdini** | FX procedurales (humo/fluidos/destrucción) | Solo cuando el FX lo justifica |
| **DaVinci Resolve** | Edición + color grade + finishing + audio (Fairlight) + entrega | Tier pro, gratis. Casa del finish (`modules/06/07/08`) |
| **Higgsfield (MCP)** | Generación IA de video: Cinema Studio, Soul ID, LipSync, i2v, agregador de 30+ modelos | Genera desde el chat vía MCP (`modules/09`, `efeonce/STUDIO_TOOLING.md`) |
| **Runway / Seedance / Veo / Kling / Gemini Omni** | Modelos IA por fortaleza (cine / refs / broadcast / voz / conversacional) | Elegir por toma (`modules/09 §1`) `(as-of 2026-07)` |
| **Magnific (MCP + API)** | Upscale / enhance / finish frame-consistent | Paso final, después del grade (`modules/08 §8`) |
| **greenhouse-ai-image-generator / design-studio** | Keyframes / stills / Key Visual para i2v | Upstream del pipeline (boundary) |

---

## 4. Regla dura — gasto gobernado + confirmación humana

**Producir/renderizar/upscalear con IA cuesta créditos. Entregar/publicar pasa SIEMPRE por
confirmación humana.** No es negociable:

1. **Dimensioná antes del volumen.** Estimá segundos × costo/s del modelo (`modules/09 §1/§10`) +
   upscales. Presentá el estimado **antes** de generar en masa.
2. **Prueba → validación → volumen.** Genera una toma o pocas variantes, que un humano valide
   calidad/consistencia/marca, y **recién ahí** el volumen. Nunca generar toda la pieza a ciegas.
3. **Chunks, no clips largos** (`modules/09 §7`) — controla deriva y gasto de re-tiradas.
4. **Confirmación humana en dos puertas:** (a) **antes de gastar créditos** en volumen, (b) **antes de
   entregar/publicar** el master. El estudio dirige y propone; el humano aprueba y dispara.
5. **El juicio de marca no se delega al modelo.** Curaduría, look final y aprobación son humanos.
   Ilustraciones propietarias / mascota Nexa con disciplina de marca (`efeonce/EFEONCE_OVERLAY.md`).

> Este es el mismo patrón "propose → confirm → execute" que rige el resto del ecosistema: el modelo
> propone tomas, el humano confirma, y solo entonces se ejecuta el gasto o la publicación.

---

## 5. Handoff humano con spec

Cuando una fase pasa a una mano humana (AE, Blender, edición) o a otro colaborador, el handoff va
**con spec escrita**, no verbal:

- **Qué produce:** toma(s), duración, resolución, frame rate, formato de entrega (ProRes master, etc.).
- **Contexto:** el animatic aprobado + shot list + prompt sheets como referencia de intención.
- **Marca:** tokens/color/tipo/logo de marca a respetar (Efeonce ≠ Greenhouse; `AxisWordmark` solo
  interno — SKILL §5).
- **Sonido/grade:** target de loudness (`modules/07 §6`), look/color space (`modules/08 §6/§7`).
- **Entrega:** destinos y versiones (master + cortes por red — formato por red en `social-media-studio`).

Documenta todo en `templates/motion-delivery-spec.md`. Un handoff sin spec produce re-trabajo.

---

## 6. Versiones y entrega

- **Master primero:** un master de máxima calidad (ProRes, Rec.709, loudness correcto) del que salen
  todos los deriva. No entregues el archivo de trabajo como final.
- **Versiones por destino:** cada red/canal pide formato, aspecto, duración y safe-zone distintos — la
  adaptación por red se rige por **`social-media-studio`** (esta skill produce el master; social lo
  versiona). Entrega 16:9, 9:16, 1:1 según se necesite, desde el master.
- **QC por versión:** revisa cada corte en su destino real (celular para vertical, etc.), no solo el
  master. Chequea recorte de texto en safe-zone, loudness, y que el look aguante.
- **Naming y entrega ordenada:** nombres claros (`proyecto_v03_9x16_master.mov`), spec adjunta,
  loudness/color space/codec anotados.

---

## 7. Checklist de cierre de producción

- [ ] Concepto/brief aprobado (`motion-brief.md`).
- [ ] Storyboard + **animatic aprobado antes de producir** (punto de control barato).
- [ ] Ruteo por toma decidido (humano / IA / híbrido) con criterio §2.
- [ ] Gasto IA dimensionado y **aprobado** antes del volumen; prueba validada primero.
- [ ] Consistencia de personaje/producto fijada upstream (`modules/09 §4`).
- [ ] Edición cerrada (`edit-decision-list.md`), ritmo y continuidad OK (`modules/06`).
- [ ] Sonido completo + loudness al target (`modules/07`).
- [ ] Grade + match + finishing + upscale (si aplica), color space/codec correctos (`modules/08`).
- [ ] Master + versiones por destino, QC en pantalla real de cada versión.
- [ ] Marca correcta (Efeonce ≠ Greenhouse), disclosure IA si aplica.
- [ ] **Confirmación humana antes de entregar/publicar.**
- [ ] `motion-delivery-spec.md` completa y adjunta al entregable.

> **Cierre:** todo trabajo de producción termina con un artefacto de `templates/` (no prosa). La
> ejecución con las herramientas conectadas (Higgsfield MCP, Magnific, credenciales, balance de
> créditos) vive en `efeonce/STUDIO_TOOLING.md`; el overlay de marca y la entrega a clientes Globe en
> `efeonce/EFEONCE_OVERLAY.md` y `efeonce/CLIENT_DELIVERY.md`.
