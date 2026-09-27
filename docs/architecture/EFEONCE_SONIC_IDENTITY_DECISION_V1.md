# Efeonce Sonic Identity «Tres puntos que se vuelven uno» — Decision V1

> **Tipo de documento:** ADR (decisión de marca)
> **Estado:** Proposed (recomendada por el operador 2026-09-26; canonización pendiente)
> **Creado:** 2026-09-26 por Claude, a pedido del operador (Julio Reyes)
> **Última actualización:** 2026-09-26 por Claude
> **Norma operativa:** [`EFEONCE_SONIC_IDENTITY_V1.md`](../operations/brand-sonic/EFEONCE_SONIC_IDENTITY_V1.md)
> **Referencia viva:** [axis.efeonce.org/references/sonic-brand](https://axis.efeonce.org/references/sonic-brand/)
> (PR `efeoncepro/axis-design-system#4`, squash `55486aa`, publicado 2026-09-26)
> **Relacionada:** [ADR de la línea gráfica «La órbita»](./EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md)

## Contexto

La línea gráfica «La órbita» le dio a Efeonce una forma que se ve, y el motion del logo V1.1 le dio movimiento. El
sonido, en cambio, era sólo el acompañamiento sintetizado de esas animaciones (`orbit-sound.mjs`): no había un logo
sonoro, ni una etiqueta con voz, ni piezas para video largo, podcast o eventos. El operador pidió una identidad sonora
producida en casa, sin músico ni compositor humano, para estos puntos de contacto en orden de prioridad: video y
redes → podcast Glitch → eventos.

## Decisión

1. **Territorio «Puntos suspensivos».** El logo sonoro es «Tres puntos que se vuelven uno»: anillo = acorde abierto de
   quinta, tres ventanas de la nave = tres notas breves en Mi, esfera = La con el único golpe, halo = el acorde de
   La mayor florece y se apaga. Motivo Mi5 · Mi5 · Mi5 → La5, notas de 140 ms, pausa de 370 ms, en La mayor (la
   tonalidad del motion V1.1).
2. **Dos registros que conviven.** Fondo (sereno, 96 BPM, síntesis propia) y energía (rock, 120 BPM: maqueta propia
   re-grabada con Stable Audio 2.5 audio-to-audio a intensidad 0,7 + la esfera propia encima). Uno por pieza.
3. **Acento por línea de servicio:** la línea cambia sólo el timbre de la esfera (Growth campana, Brand marimba,
   Engine FM, Voice eco, Revenue campana grave; Revenue HubSpot y Salesforce comparten).
4. **Etiqueta con voz en cierres:** Brian (ElevenLabs v3), «Empower your <Línea>.», en inglés y nunca traducido; la
   palabra final cae con la esfera. Las cinco tomas están aprobadas.
5. **Motion V1.1 re-sonorizado sin tocar la imagen:** la esfera cae con el golpe de encaje (sting 0,58 s, reveal
   1,87 s, apertura 1,15 s). El reveal queda en dos versiones, con voz y sin voz; la apertura, aprobada tal cual.
6. **Dónde vive:** página y JSON en AXIS (`references/sonic-brand`, esquema `axis.efeonce-sonic-brand.v1`) y archivos
   en el bucket público `gs://efeonce-group-axis-public-media/sonic/v1/`. **No** en `@efeoncepro/axis-tokens` hasta
   canonizar.
7. **Glitch (podcast) queda fuera** de esta decisión hasta que el operador elija.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Territorio «Pregunta y respuesta» (Do♯ Mi Si → La) | No elegido por el operador en la ronda de territorios |
| Territorio «Órbita abierta» (La Mi Si → Do♯) | No elegido por el operador en la ronda de territorios |
| Coro como timbre de Voice | Descartado por el operador; se eligió eco |
| Cuerda y pulso como timbre de Voice | Descartados por el operador a favor del eco |
| Híbrido con ElevenLabs Music para la pieza de energía | El empalme cae justo antes de la firma; además ElevenLabs Music v2.5 no respeta la estructura (con `strength` high y xhigh se saltó el corte y el golpe final) |
| Paquete npm de audio o tokens en `axis-tokens` antes de canonizar | Un token o un paquete fijaría como contrato algo que aún es recomendación. Los binarios (65 archivos, 74 MB) viven mejor en un bucket público con URL estable, y el JSON de AXIS da a los agentes URL, duración, LUFS, pico y SHA-256 de cada archivo sin publicar una versión de paquete. Al canonizar, los valores pasan a tokens junto a `efeonceGraphicLine.motion.sound` |

## Consecuencias

- Toda pieza sonora de Efeonce usa los archivos del kit; nadie regenera el logo, la voz ni la esfera.
- Los masters V1.1 del bucket `motion/logo/v1.1/` siguen con el sonido anterior (`orbit-sound.mjs`) hasta canonizar;
  mientras tanto conviven dos sonidos del motion (el de los masters y el recomendado del kit).
- La entrega se nivela por destino (−14 LUFS video/redes, −16 LUFS podcast, pico −1 dBFS) y nunca se comprime el
  golpe; los logos Brand, Voice y Revenue quedan cerca de −15 LUFS por eso.
- La producción de energía depende de Stable Audio vía fal, con su licencia aún por confirmar con legal.
- No aplica a clientes ni a la UI de Greenhouse; la pantalla de recepción no se sonoriza.

## Pendiente

- Decisión de Glitch (dos versiones exploradas; la recomendación intro/outro rock + cortina serena no convence aún al
  operador).
- Licencias: Stable Audio vía fal y voz de ElevenLabs.
- Prueba de reconocimiento sin logo antes de pautar (como la D14 de la órbita).
- Tokens AXIS, reemplazo del sonido de los masters V1.1 y guía en el manual de la línea gráfica.

## Reversibilidad

Alta. Nada del runtime de Greenhouse ni de los paquetes de AXIS depende de esta decisión: no hay tokens publicados y los
masters V1.1 conservan su sonido. Revertir es no mergear (o revertir) el PR de AXIS #4 y dejar de usar el kit del
bucket `sonic/v1/`; cambiar un elemento (registro, timbre, voz) es producir una `v2` del kit sin tocar la `v1`. El costo
de revertir crece al canonizar, cuando los valores pasen a tokens y reemplacen el sonido de los masters V1.1.
