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
- ❌ **Un barrido de ruido continuo cuando la dirección prohíbe whooshes.** Medido en el espectrograma (Glitch,
  2026-09-27): el soplo de ruido de las transiciones sonaba a whoosh. ✅ Lluvia de micro-clics, uno por celda de la
  animación, que viaja en estéreo con la imagen.
- ❌ **Una cola de campana larga sobre el evento siguiente.** Medido (Glitch, 2026-09-27): la campana de la manzana
  tapaba el golpe de texto que venía después. ✅ Acorta el decaimiento (se aceleró 2,2 veces) y revisa en el
  espectrograma, con marcas de cuadro, que cada golpe quede limpio.
- ❌ **Recortar los medios de una cama para abrirle espacio a la voz.** Medido (Glitch, 2026-09-27): una cama con EQ
  −6 dB a 700 Hz, −7 a 1,8 kHz y −3 a 3,2 kHz quedó con **13 %** de su energía entre 300 Hz y 3 kHz (sub +
  chisporroteo agudo) contra **45 %** de la intro aprobada, y el operador la rechazó: «Vuelvo a sentir en tono
  arcade». Además, **una maqueta sintetizada delgada contagia la re-grabación**: la IA conserva la falta de cuerpo.
  ✅ El espacio lo da el **ducking** (sidechain desde la voz), no la EQ; parte de instrumentos reales (grabación con
  IA desde texto o re-grabación de una maqueta con cuerpo) y mide los medios (≥ ~35 %; la cama aprobada tiene 38 %)
  antes de pedir el oído del operador. Receta: `modules/07_PODCAST_PRODUCTION.md` §5.
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

- ❌ **Generar audio IA en volumen sin estimate/reservation/approval** o convertir costo vendor en credits.
  ✅ Estima por operación/segundos/tier/attempt; mix/master/export determinístico = `0 credits`.
- ❌ **Entregar/publicar sin confirmación humana.** ✅ El estudio propone/produce; el operador aprueba.
- ❌ **Entregar sin spec** (loudness/formato/sample-rate equivocados). ✅ `templates/mix-master-delivery-spec.md` + checklist.
- ❌ **Transcribir mal la marca** (Efeonce ≠ Greenhouse). ✅ `efeonce/EFEONCE_OVERLAY.md`.
