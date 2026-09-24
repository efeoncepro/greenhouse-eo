# SKY — prueba local de cartelas y cierre

## Aprobación vigente · 2026-09-24

**Punch-v3 aprobado por el operador:** «GENIAL!!! Quedó muy muy bueno». Hashes y alcance en `approval-punch-v3.json`; fuentes congeladas en `versions/approved-punch-v3/`. La aprobación corresponde a las cartelas y al cierre de la preview, no al master audiovisual.

El siguiente paso es el plan canónico `PLAN-VIDEO-AUDIO-V10.md` de CMP-003 en OneDrive, enlazado desde `docs/campaigns/decisions/CDR-008-cmp003-cartelas-postproduccion-y-audio-separado.md`. No hay nueva generación pagada en esta revisión.

## Alcance confirmado

Solo cartelas posteriores al avión y cierre se animan en posproducción. El video completo, búsqueda, resultados, respuesta LLM, cita, avión y cámaras siguen siendo generativos. **El fondo final de las cartelas es el cielo animado que entregue esa misma generación**, continuo desde la salida del avión. No sustituirlo por una fotografía, loop ajeno, congelado ni fondo recreado por código.

La fotografía existente de la preview sirve únicamente para revisar tipografía. Los colores del cierre simulan el fondo que se pedirá al video. Ninguno de estos fondos está incluido en los archivos con transparencia. La preview es muda y no demuestra integración final de cámara/audio.

## Entregables

- `prueba-textos-sobre-fondo-referencia.mp4`: muestra local de 14,25 s, 1080×1920, 24 fps, sin audio.
- `titulos-y-firma-alpha.mov`: ProRes 4444 con transparencia, 14,25 s. Insertar en 15,75 s del video. Incluye títulos y logos; excluye URL Bubble.
- `url-bubble-luminosidad-alpha.mov`: capa separada, 4 s, insertar en 26 s. Gris original, opacidad 0,72 incorporada en alpha. **Componer en modo Luminosidad y opacidad de capa 100%**; no aplicar 0,72 dos veces.
- `overlay-preview.html`: reproductor local con scrub y modo transparencia; no llama servicios.
- `animator/title-plan.json`: tiempos y trayectorias editables.
- `cue-sheet.json`: acentos visuales propuestos para sonido, alineados a fotogramas. No es una pista de audio terminada.
- `AUDITORIA-Y-PLAN.md`: errores, aciertos, plan de película y límites pendientes.

Un MOV no almacena el modo de fusión de un editor. Por eso la burbuja se entrega separada; sumarla con alpha normal perdería el tratamiento. La preview usa fusión Luminosidad real, verificada contra el compositor canónico sobre azul y morado (`qa/luminosity-check.json`).

## Reproducir desde la raíz del repo

```sh
node ai-generations/2026-09-23_cmp003-sky-video/seedance/v10-local/build-overlay.mjs
node ai-generations/2026-09-23_cmp003-sky-video/seedance/v10-local/render-overlay.mjs render
node ai-generations/2026-09-23_cmp003-sky-video/seedance/v10-local/verify-luminosity.mjs
```

Requiere Node, Playwright/Chromium, Sharp y FFmpeg ya disponibles. No usa credenciales ni proveedores.

## Contrato de integración posterior

1. Generación completa con referencias del avión y movimientos aprobados; interfaz generativa legible; audio generado desactivado si no existe control verificable contra voz.
2. Desde 15,75 s: cielo animado continuo, sin textos/cartelas/logos ni paneles vacíos. Reserva natural amplia; avión abandona la zona de lectura sin frenarse. No congelar el cielo durante los holds.
3. Verificar tiempos reales antes de colocar capas. Conservar la coreografía aprobada: solicitar que el material respete los tiempos del JSON. Si no encaja, documentar el cambio y revisar la variante; no acelerar/frenar la música por trozos para forzar el encaje.
4. Si se exige perspectiva ligada al entorno, rastrear la cámara del material real y ajustar anclajes. Esta primera prueba no contiene un solve de cámara.
5. Cierre: fondo azul, firma, URL Bubble en Luminosidad; fondo pasa después a morado conservando las capas.
6. Música instrumental limpia a velocidad constante y SFX separados. La pista derivada de v7 con residuo vocal queda como referencia, no como master.
7. Revisar el montaje completo a velocidad real y escuchar antes de aprobar. ASR vacío no garantiza ausencia de voz.

Estado: animación local de cartelas y cierre aprobada; generación de fondo, integración y audio final pendientes. Gasto adicional: 0 USD. Ninguna llamada pagada autorizada por esta prueba.

## Última revisión

`prueba-cartelas-punch-v3.mp4`: coreografía conectada y progresiva. Conserva el `prueba-cartelas-punch-v2.mp4` anterior para comparar. Los archivos alpha y el HTML corresponden a la revisión vigente v3.
