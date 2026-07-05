# ANTIPATTERNS — audio-studio

> Los errores que arruinan un audio — **y los legales que arruinan una entrega**. Si detectas uno
> en lo que te piden (o en lo que ibas a hacer), **para y corrige antes de producir/entregar**.

## Craft de producción

- ❌ **Grabar sin headroom** (picos pegados a 0 dBFS) o en sala sin tratar. ✅ Picos -20 a -12 dB,
  24-bit/48kHz, y **trata la sala** (importa más que el mic).
- ❌ **Mic de frente y pegado a la boca.** ✅ 15-20cm, off-axis (esquina de la boca), pop filter — controla
  plosivas y proximity effect.
- ❌ **Una pasada agresiva de noise reduction** (voz robótica/burbujeante). ✅ Varias pasadas ligeras.
- ❌ **Masterizar "más fuerte".** La normalización de las plataformas borra esa ventaja y aplasta la
  dinámica. ✅ Masteriza al **target de loudness del destino** (música -14, podcast -16/-19, broadcast -23).
- ❌ **Música tapando la voz.** ✅ Música bajo la voz -18 a -20 dB; la voz siempre inteligible.
- ❌ **Ignorar el true peak.** ✅ Techo -1 dBTP (Amazon -2) para evitar clipping tras el codec.
- ❌ **Podcast que suena distinto cada semana.** ✅ Consistencia (mismo sonido/estructura/día) = confianza
  algorítmica + hábito del oyente. Workflow documentado.

## Voz e IA

- ❌ **Voz IA sin dirección** (ritmo plano, sin emoción). ✅ Dirige con audio tags, puntuación, pacing; el craft manda.
- ❌ **Elegir el modelo por hype.** ✅ Elige por tarea Y por licencia (`SOURCES.md`).
- ❌ **Citar de memoria qué modelo/versión/licencia aplica.** Cambia por trimestre. ✅ Reverifica con WebSearch.
- ❌ **Delegar el juicio de marca a la IA.** ✅ IA genera; el humano dirige/mezcla/masteriza/cura.

## Legal y ético (duras — arruinan la entrega)

- ❌ **Clonar una voz sin consentimiento explícito** del dueño. ✅ Consentimiento documentado, siempre.
- ❌ **Usar música IA de licencia dudosa en algo comercial/cliente.** ✅ ElevenLabs Music (comercial día 1)
  para cliente; Suno/Udio para interno/no-comercial; documenta la fuente.
- ❌ **Imitar la voz de una persona real (celebridad, cliente) sin permiso.** ✅ No lo hagas.
- ❌ **Pasar audio IA como humano cuando el contexto exige transparencia.** ✅ "Ante la duda, revela".

## Boundaries (duras)

- ❌ **Hacer el sonido *sincronizado a un video* como pieza final acá.** ✅ Lo coordina `motion-design-studio`
  (módulo 07); acá va el **craft** de voz/música/SFX que ese módulo consume.
- ❌ **Decidir la integración de Nexa en producto acá.** ✅ `greenhouse-nexa-conversational` (acá el **asset** de voz).
- ❌ **Escribir el guion/copy fino acá.** ✅ `copywriting` (acá la dirección de *performance*).
- ❌ **Diseñar la identidad visual acá.** ✅ `design-studio` (acá el sonic branding que la acompaña).

## Gobernanza y entrega

- ❌ **Generar audio IA en volumen sin dimensionar créditos** (~$0.18/min Seed Audio, etc.). ✅ Gasto gobernado.
- ❌ **Entregar/publicar sin confirmación humana.** ✅ El estudio propone/produce; el operador aprueba.
- ❌ **Entregar sin spec** (loudness/formato/sample-rate equivocados). ✅ `templates/mix-master-delivery-spec.md` + checklist.
- ❌ **Transcribir mal la marca** (Efeonce ≠ Greenhouse). ✅ `efeonce/EFEONCE_OVERLAY.md`.
