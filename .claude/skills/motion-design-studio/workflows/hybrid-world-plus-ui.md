# Híbrido mundo-IA + UI real compuesta (el spot completo)

> **Estado:** validado como **patrón** — 2026-07-05 (decisión de arquitectura del spot AEO).
> **Evidencia:** comparativa Slice 1 (crisp vs Omni) en `~/Documents/Efeonce-AEO-Spot/`.

## La idea en una frase

Un spot que mezcla **look cinematográfico de IA** con **producto legible**: el **mundo / emoción / cámara**
salen de Gemini Omni; la **UI / citas / gauge / logo / texto exacto** son mograph crisp; se hilan con **un
POV + transiciones** (pull-back / match-cut). Resuelve la tensión "quiero que se vea pro pero necesito que
las citas y el logo sean reales".

## Cuándo usarla

- El spot tiene **beats de producto** (donde el micro-texto es el mensaje) **y beats de mundo/humano**.
- Quieres el "wow" de la IA sin sacrificar exactitud de marca.

## Reparto por beat (regla de decisión)

| Tipo de beat | Mano | Por qué |
|---|---|---|
| Ambiente, mundo, cámara, emoción, humano | **Gemini Omni** (`reference-video-to-omni.md` / `reference-chaining.md`) | look premium; el texto no importa |
| Pregunta / thinking (solo texto grande) | Omni-enhanced **o** crisp | el texto grande sobrevive; elige por look |
| Citas, nombres de motores, gauge, Share of Voice, precios, **logo** | **mograph crisp** (`ui-without-after-effects.md`) | deben ser exactos y on-brand |
| End-card (logo + claim + URL) | **mograph crisp** (asset real) | marca exacta |

## Cómo se conecta (la costura)

- **Un POV** (ej. la pantalla + el cursor) hilando los beats.
- **Transición diseñada** entre mundo y producto: **pull-back reveal** (la escena se repliega en un dato del
  dashboard) o **match-cut** (el boleto ↔ el panel de citas). Evita el corte seco entre mundos distintos.
- **Composite:** o la UI crisp **encima** del plate Omni (tracking/VFX, `modules/11`), o beats en **cortes
  separados** a pantalla completa (más simple, producible sin AE).

## Pasos (encadenados)

1. Storyboard por beats + reparto de la tabla.
2. Producí cada beat con su mano (Omni / mograph).
3. Ensamblá (edición, ritmo al beat) + costura (pull-back/match-cut).
4. **Sonido** → `audio-studio` (thinking beat, clicks, whoosh, música, sting en el gauge).
5. **Grade + finish + upscale** → `modules/08` + Magnific. Entrega 16:9 + 9:16/1:1 (`social-media-studio`).

## Qué NO hacer / gotchas

- ❌ Generar todo con IA (los beats de producto quedan ilegibles) o todo mograph (pierde el "wow" del mundo).
- ❌ Cortar entre dos mundos IA sin transición → se ve desconectado.

## Costo

Suma de los beats Omni (~$1/10s c/u) + cero de los beats mograph. Dimensiona antes de producir a volumen.

## Evidencia

Slice 1 demostró los dos extremos (crisp exacto vs Omni pro) y por qué el híbrido los une. Caso completo:
`efeonce/STUDIO_TOOLING.md` (sección Omni enhance) + el spot AEO en curso.
