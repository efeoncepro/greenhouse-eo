# 10 · Pipeline de audio IA + orquestación — la mano de ejecución

> **Qué cubre.** Cómo el estudio **ejecuta** con IA: el router por tarea (voz, música, SFX,
> enhance/restore), el loop humano+IA, y las **reglas duras** de licencia, consentimiento,
> gasto y confirmación humana. La IA **genera y acelera**; el humano **dirige, mezcla,
> masteriza y cura**. **El landscape de modelos y — sobre todo — el licenciamiento es lo más
> volátil**: reverifica antes de comprometer una herramienta `(as-of 2026-07 — reverificar)`.
> Cierra con `efeonce/STUDIO_TOOLING.md`.

---

## 1. Router por tarea (qué herramienta para qué)

`(as-of 2026-07 — reverificar modelos, features y licencias por trimestre.)`

| Tarea | Herramienta(s) | Vía | Cuándo |
|---|---|---|---|
| **VOZ (TTS / performance)** | **ElevenLabs** (v3 audio tags, Flash v2.5 real-time) | MCP | Voz dirigible, 70+ idiomas, tags `[whispers]/[laughs]`, multi-speaker. |
| **VOZ (cloning)** | **ElevenLabs** IVC (instant) / PVC (professional) | MCP | Clonar una voz — **solo con consentimiento**. PVC para calidad de producción. |
| **VOZ (dubbing)** | **ElevenLabs dubbing** · **Higgsfield `dubbing`** | MCP | Doblaje multi-idioma que preserva el color de la voz original. |
| **VOZ (crear/cambiar)** | **Higgsfield** `create_voice` / `voice_change` · **Seed Audio** | MCP | Diseño de voz nueva, cambio de voz sobre una toma. |
| **VOZ+MÚSICA+SFX (una pasada)** | **Seed Audio 1.0** (~$0.18/min) | — | Prototipar una escena completa (diálogo + música + SFX) rápido. |
| **MÚSICA (comercial/cliente)** | **ElevenLabs Music** | MCP | **Licencia comercial día 1** — lo seguro para entregables de cliente. |
| **MÚSICA (calidad/interno)** | **Suno** / **Udio** | — | Máxima calidad para uso **interno/exploración** — **ojo licencia** (§3). |
| **SFX** | **ElevenLabs SFX** · **Seed Audio** · librería | MCP | Efectos generativos puntuales o cama; complementa foley humano. |
| **ENHANCE / RESTORE** | **Adobe `media_enhance_speech`** · **iZotope RX 11** · **Higgsfield `enhanceSpeechPoll`** | MCP / DAW | Limpiar voz remota mala, restaurar grabaciones, quitar ruido. |

---

## 2. El loop humano + IA

```
idear → guion/brief → [IA genera drafts: voz/música/SFX] → el humano DIRIGE
      → editar → mezclar → masterizar (craft, módulos 07/09) → confirmación humana → entregar
```

- **La IA genera y acelera:** produce variantes de voz, tracks, efectos y cleanups en minutos —
  reemplaza el "buscar en librerías" y el "esperar al proveedor".
- **El humano dirige y cura:** elige la toma, ajusta la performance (módulo 02), decide la mezcla
  y el master (módulo 09), y **juzga si sirve para la marca**. El juicio de marca no se delega.
- **Iteración barata primero:** prototipa con Seed Audio / drafts baratos, decide dirección, y
  recién ahí produce la versión final con la herramienta de mayor calidad/licencia limpia.

---

## 3. Reglas duras (no negociables)

> **(a) Licencia comercial verificada.** Todo audio que salga a un cliente o a un canal
> comercial necesita **licencia clara**. Para música IA, **ElevenLabs Music** es lo seguro
> (comercial día 1). **Suno/Udio** cambian términos por trimestre y su licencia comercial
> depende del plan — úsalos para **interno/exploración**, no los pongas en un entregable de
> cliente sin verificar el plan y los términos vigentes `(as-of 2026-07 — reverificar)`.

> **(b) Consentimiento explícito para clonar.** Nunca clones una voz (IVC/PVC/`create_voice`)
> sin **permiso documentado del dueño de la voz**. Aplica a talentos, clientes y a cualquier
> persona real. Sin consentimiento por escrito, no se clona.

> **(c) Gasto gobernado.** Producir con IA **cuesta créditos**. Dimensiona el costo antes de
> generar en volumen (ej. Seed Audio **~$0.18/min**; ElevenLabs por caracteres/minutos según
> plan). No generes 40 variantes "a ver cuál queda" sin estimar el gasto.

> **(d) Confirmación humana antes de entregar.** Ninguna pieza se publica ni se entrega sin que
> un humano la escuche completa y apruebe. La IA no cierra el loop sola.

---

## 4. Tabla tarea → herramienta → licencia (referencia rápida)

`(as-of 2026-07 — reverificar términos.)`

| Necesito… | Herramienta | Licencia / condición |
|---|---|---|
| Voz para un anuncio de cliente | ElevenLabs (voz de librería o diseñada) | OK comercial según plan; si es voz clonada → **consentimiento** obligatorio. |
| Música de fondo para entregable de cliente | **ElevenLabs Music** | **Comercial día 1** — seguro. |
| Música para explorar/moodboard interno | Suno / Udio | **Interno** — verificar plan antes de cualquier uso público. |
| Doblar un video a otro idioma | ElevenLabs / Higgsfield dubbing | OK; si preserva voz de persona real → consentimiento. |
| Clonar la voz de un talento del cliente | ElevenLabs PVC | **Consentimiento explícito escrito** + plan comercial. |
| Limpiar una entrevista remota ruidosa | Adobe `media_enhance_speech` / iZotope RX | Proceso sobre material propio — sin issue de licencia de contenido. |
| Un SFX puntual (puerta, whoosh) | ElevenLabs SFX / librería con licencia | Generado o librería licenciada — nunca SFX de origen dudoso. |

---

## 5. Handoff y craft humano

- Cuando la mezcla/master final la hace una persona en DAW, entrégale el **spec de mezcla/entrega**
  (`templates/mix-master-delivery-spec.md`): target de loudness, true peak, formato, pistas
  separadas y notas de dirección.
- Guarda siempre el **WAV master** como fuente de verdad; los derivados IA son insumos, no el
  archivo canónico de entrega.
- Documenta **la fuente y la licencia** de cada asset IA usado (qué herramienta, qué plan, qué
  consentimiento) — es lo que protege la entrega si alguien pregunta.

---

## 6. Checklist del pipeline IA

☐ Tarea clasificada y herramienta correcta del router · ☐ **licencia comercial verificada** para
todo lo que sale a cliente/comercial · ☐ **consentimiento escrito** si se clona una voz ·
☐ música de cliente vía ElevenLabs Music (Suno/Udio solo interno) · ☐ **gasto de créditos
estimado** antes de generar en volumen · ☐ prototipo barato → dirección → versión final ·
☐ humano dirige performance + mezcla + master · ☐ **confirmación humana antes de entregar** ·
☐ fuente + licencia de cada asset IA documentada · ☐ WAV master guardado.

> **Remite a** `efeonce/STUDIO_TOOLING.md` para el detalle operativo de las herramientas
> conectadas (MCP: ElevenLabs, Higgsfield, Seed Audio, Adobe), los flujos concretos de
> producción y el enrutado con confirmación humana + gasto gobernado dentro de Efeonce.
