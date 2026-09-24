# Película generativa con cartelas exactas y sonido separado

**Estado, 2026-09-24:** animación de cartelas y cierre validada localmente y aprobada por el operador en CMP-003 SKY, punch-v3. V17 integra cielo generado, ventana Omni revisada, rock aportado por el operador, restauración Topaz y cierre corregido; 29,5 s/708 cuadros/24 fps, masters 4K restaurado y1080p revisados técnicamente y en imagen. Escucha y aprobación final pendientes. No presentar el flujo como aprobado end-to-end.

Método completo: [operación de principio a fin](../../../../docs/operations/creative-production/VIDEO_PRODUCTION_AND_POSTPRODUCTION_V1.md).
Preparación de piezas/cámaras: [companion de producción](../companions/video-preproduction-and-production.md).
Integración/sonido/calidad: [companion de posproducción](../companions/video-postproduction-and-delivery.md).
Historia: [retrospectiva SKY](../../../../docs/operations/social/2026-09-24-sky-retrospectiva-produccion-v17.md).

## Cuándo usarlo

Cuando el operador quiere conservar una película generativa cinematográfica y controlar exactamente sólo determinados rótulos. Confirmar el alcance por elemento: una UI representada en la película no se convierte automáticamente en UI de código. En SKY se autorizó únicamente cartelas posteriores al avión y cierre.

## Contrato de capas

| Capa | Dueño en SKY | Evidencia necesaria |
| --- | --- | --- |
| Búsqueda, resultados, chat, cita, cámaras, avión, cielo | Modelo de video, con referencias aprobadas | Secuencia, legibilidad, fotorealismo y continuidad temporal |
| Cartelas y firmas posteriores | Animador local sobre transparencia | Copy exacto, tipografía, timing, alpha y aprobación visual |
| URL Bubble | SVG canónico en capa aparte, fusión Luminosidad | Comparación sobre fondos finales, geometría original |
| Música y SFX | Fuentes limpias y mezcla por eventos | Escucha integral sin voz, sincronía, sin pausas accidentales |

El cielo final de las cartelas viene de la MISMA película generada y permanece animado. Una foto de fondo en una preview sólo demuestra tipografía. No sustituirlo por foto, congelado, loop ajeno ni cielo recreado por código. Pedir una reserva natural de lectura, no un panel vacío. No enviar cartelas completas al modelo si después se compondrán: aumenta la posibilidad de texto duplicado o relectura sonora.

## Método reproducible

1. Separar aprobación de dirección, animación, película, sonido y publicación. Guardar hash de la preview exacta aprobada y de fuentes/configuración; congelar fuentes antes de experimentar.
2. Un reloj: dimensiones, fps, duración, offset y eventos en JSON. Render con seek determinista, sin aleatoriedad libre ni animación dependiente del tiempo de ejecución. En la aprobación punch-v3: 1080×1920, 24 fps, 14,25 s; inserción prevista 15,75 s. V17 desplaza el inicio a 15,25 s por el trim autorizado; son tiempos de ese caso, no constantes del método.
3. Diseñar jerarquía de energía: una entrada fuerte por idea, pausas de lectura y salidas conectadas. El signo `+` es actor causal: aterriza y provoca el despliegue del número. El mayor golpe se reserva para SEO/AEO. Gracias resuelve emocionalmente; el cierre estabiliza.
4. Comprobar tanto holds como transiciones a mayor densidad de cuadros. Sombra/extrusión fina ayudan a leer sobre cielo; evitar metal fijo, contornos pesados o golpes igualmente intensos en cada línea.
5. Exportar texto/firma en ProRes 4444 con alpha real. En SKY el archivo no contiene la URL; insertarla en una segunda capa. Ni cielo ni campo de color deben quedar horneados en los exports transparentes.
6. URL Bubble: usar geometría y gris del SVG oficial. Opacidad 0,72 incorporada en alpha; opacidad del clip 100%; modo de capa **Luminosidad**. Un MOV no almacena el modo de fusión. Verificar sobre azul y morado contra el compositor canónico; no reemplazar por rectángulo redondeado ni aplicar 0,72 dos veces.
7. Solicitar al video tiempos compatibles con la coreografía aprobada. Si deriva, medir antes de ajustar. Un cambio de timing produce variante revisable; no mover silenciosamente la aprobación a esa variante. Para perspectiva ligada a la escena hace falta tracking del material final, no un supuesto solve en la preview.
8. Cerrar primero la imagen generada y la composición sobre la placa final; revisar fotogramas y fijar el cue sheet. Sólo entonces generar música limpia y SFX según el ritmo/eventos reales, y mezclar música a velocidad constante. Ver `audio-studio/efeonce/NO_VOICE_MUSIC_SFX.md`.
9. Revisar a 1× y en cuadros alrededor de cada transición; alpha, safe areas, legibilidad, pantalla pequeña, mono/estéreo, ausencia de voz y campos de cierre. La adaptación 4:5 requiere revisión propia; la aprobación 9:16 no la cubre.

## Lecciones verificadas de SKY

- V9 avanzó en fluidez de interfaz y recorrido aéreo; la guía determinista completa también transmitió sus defectos: frontalización prematura de búsqueda, frenada al salir del chip y URL incorrecta.
- No atribuir al modelo un error que ya estaba en la referencia. Auditar guía, payload, fuente generada y composición por separado.
- Dividir música en nueve velocidades y reutilizar un stem con residuo vocal generó discontinuidad. Un ASR vacío no demostró ausencia de voz.
- Full input MP4 + full output puede facturar ambos. En fal Seedance 2.5, estimar input+output y resolución real. El helper local de salida sola no basta para R2V. Cotización no equivale a autorización.
- Las ventanas requieren aceptación de continuidad y QA de entrada, centro y salida. En SKY el operador aceptó probarlas condicionalmente: un piloto Omni de 228 cuadros falló por cielo distinto, doble avión y salto final. Pedir preservación en un prompt no bloquea píxeles; no integrar ni encadenar intentos porque la operación técnica terminó. Referencias de identidad con fondos diferentes pueden introducir conflicto: documentar esa posibilidad como hipótesis, no causalidad probada.

- V11 completo produjo 713 cuadros a 1080p y sin audio, pero no respetó el turno de usuario ni liberó la reserva: el avión permaneció hasta el cierre. Referencias de identidad no sustituyen una referencia explícita de salida/placa limpia. Esta carencia es una hipótesis de causa, no causalidad demostrada. El offset aprobado de cartelas no debe imponerse sobre un resultado incompatible.
- V11 fue estimado en USD23,88204 con presupuesto 25; fal facturó USD34,162558, verificado por request ID en Billing events. Una fórmula pública con descuento no protege un máximo. Reconciliar estimación con facturación por solicitud antes de reutilizarla; conservar saldo antes/después y detener gastos ante una discrepancia.

## Evidencia

- `ai-generations/2026-09-23_cmp003-sky-video/seedance/v10-local/README.md`: reproducción y capas.
- `approval-punch-v3.json`, `versions/approved-punch-v3/`, `qa/engine-check.json`, `qa/export-check.json`, `qa/luminosity-check.json` dentro de esa corrida.
- CDR-008 registra el alcance aprobado; el guion y plan detallado viven en la carpeta CMP-003 de OneDrive.
- Marco existente: `GREENHOUSE_GEMINI_OMNI_CLI_DECISION_V1.md` para Cloud Omni; no cambia esa integración, ni Globe, ni contratos de datos.


## Recuperación local V12, 2026-09-24

V12 recuperó búsqueda V7, chat V9 y vuelo/cielo V11 mediante montaje local. Reencuadre editorial progresivo libera las cartelas con cielo real en movimiento, sin reconstruir UI ni avión. Revisar cada enlace, preservar hashes aprobados y declarar pérdida de detalle por crop/upscale. Conformar pixfmt/color uniformes antes de overlay: metadata cambiante puede reiniciar filtros y perder cuadros. V12 exportó720 cuadros; es evidencia histórica. El estado actual es V17, arriba. Su trim de lectura de12 cuadros no se trasladó al momento de activación del botón; música y cues se reconformaron sin cortar la frase musical.
