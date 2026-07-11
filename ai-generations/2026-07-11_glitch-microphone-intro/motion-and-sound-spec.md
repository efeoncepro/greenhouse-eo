# Especificación de motion y sonido

> **Estado de aplicabilidad:** el contrato sigue describiendo la intención creativa, pero no puede ejecutarse desde el 4K actual como frame inicial inmutable: allí la yema ya toca la rejilla y los arcos ya están visibles. Requiere un key visual precontacto aprobado o una decisión narrativa distinta antes de cualquier generación.

## Motion

### Principio dominante

El plano vive por **anticipación contenida, strike, rebound, strike, rebound y settle**. La legibilidad del doble contacto importa más que añadir movimiento de cámara o efectos.

| Sistema | Especificación |
| --- | --- |
| FPS | 24 fps de punta a punta. |
| Cámara | Macro close-up con lenguaje 70–85 mm; micro push-in físico de 2–3% total. Sin zoom, órbita, paneo, handheld ni corte interno. |
| Foco | Cambio mínimo de yema a malla durante el contacto; fondo siempre en bokeh. |
| Timing | Hover 0,00–0,54 s; descenso 1 0,54–0,62; contacto 1 de 1–2 frames y rebote antes de 0,67; hover 0,67–1,08; descenso 2 1,08–1,17; contacto 2 de 1–2 frames y rebote antes de 1,25; señal visual 1,33–1,70; settle 1,70–5,00. |
| Luz | Low-key: navy y sombras profundas, azul eléctrico/verde de consola, piel cálida, rojo práctico lejano. Sin flashes. |
| Señal | El primer tap no activa señal. Tras el segundo lift, una expansión muy tenue de los arcos azules ya presentes y actividad baja de consola. Sin hologramas, ondas gigantes ni visualizador de audio. |
| Practical | El `ON AIR` ya integrado en el key visual original es inmutable: debe entrar con el primer frame, permanecer físicamente montado en el estudio y no recibir composición posterior. Si un motor no lo conserva, se rechaza la toma o se cambia de mano. |
| Salida | Hold resuelto y corte seco; el siguiente plano recibe la música/identidad de Glitch. |

### QA visual del movimiento

- [ ] La fuente comienza y termina con la misma identidad de mano, micrófono, set y luz.
- [ ] Hay sólo una yema de índice en contacto, sin dedos extra ni articulaciones invertidas.
- [ ] La yema impacta uno o dos frames y rebota dos veces desde una separación aérea visible de 6–10 mm; la malla y el brazo del micrófono no se deforman.
- [ ] Los dos contactos se separan por un hover/lift visible; no se leen como presión sostenida, botón ni doble click mecánico.
- [ ] El movimiento no es lineal: espera, tap, lift, tap, lift y se asienta.
- [ ] La señal reacciona después del segundo contacto, no antes ni después del primero.
- [ ] El plano no parece un still con zoom, pero tampoco una cámara protagonista.
- [ ] No hay texto/wordmarks nuevos, glitch visual genérico, UI o luz que parpadee sin causa; el `ON AIR` original se conserva en el plano del estudio, no ocluye el dedo y no parece una capa añadida.

## Sonido

### Decisión de principio

**Sin música no significa sin diseño.** La intro usa silencio activo: dos respuestas aisladas del canal por la corneta/monitor del estudio y nada más. El espectador no escucha el golpe acústico de la yema contra la rejilla en primer plano; escucha que el micrófono lo captó y que el sistema tiene señal.

### Paleta sonora

| Capa | Diseño | Tratamiento |
| --- | --- | --- |
| Contacto 1 | La cápsula capta el impulso y el preamp lo entrega a una corneta/monitor del estudio. | `Pum/toc` amplificado, corto y limitado en banda, con cuerpo bajo/medio de altavoz y cola amortiguada de 80–120 ms; no se oye la yema en close-up. |
| Contacto 2 | La misma cadena `micrófono → preamp → monitor`, con una segunda respuesta natural. | Segundo golpe de señal, no doble-click; sin boom cinematográfico, whoosh, beep, uña, campana ni botón plástico. |
| Señal visual | Arcos azules y actividad baja de consola. | No tiene puntuación sonora propia ni tercer transiente. |
| Resto | Silencio. | Sin room tone, estática, voz, música, stinger ni reverb de sala. |

### Sincronía y mezcla

- Alinear los dos transientes al primer frame de contacto cercano a 0:00.62 y 0:01.17. El take I es evidencia rechazada y no determina estos tiempos.
- La primera opción es registrar o generar la **salida amplificada** de una cadena equivalente `micrófono → preamp → monitor/corneta`; el golpe acústico directo sobre la rejilla no es el sonido narrativo. El audio nativo de un modelo es guía candidata, no aprobación por defecto. Documentar fuente, prompt, cadena y sincronía.
- Nunca conservar un tercer transiente que el modelo invente para la señal visual.
- Mantener definición suficiente para traducir en móvil, sin convertir el transiente de rejilla en un click agresivo o separar el ataque de su cuerpo amortiguado.
- Mezclar esta intro en el master completo de Glitch; no perseguir por separado un target de loudness que destruya su dinámica. Para web/social, evaluar el programa terminado contra el target de entrega acordado y dejar true peak con margen.
- No filtrar música hacia atrás con J-cut: el primer elemento musical empieza después del corte visual.

### QA sonoro

- [ ] No hay música, voz, aplauso, radio estática, room tone, beep, whoosh ni stinger.
- [ ] El contacto se entiende en auriculares, laptop y móvil.
- [ ] El SFX no suena a botón, teclado, puerta, uña, campana de metal ni golpe acústico cercano; se entiende que el canal del micrófono responde por el monitor/corneta.
- [ ] Hay exactamente dos transientes, cada uno sincronizado con el frame de impacto y rebote; el hover entre ambos se entiende.
- [ ] La señal visual no tapa ni reemplaza el segundo foley; no genera un tercer acento.
- [ ] El corte deja espacio real para el primer downbeat o frase de Glitch.
