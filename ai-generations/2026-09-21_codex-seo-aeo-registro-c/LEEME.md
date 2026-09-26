# Prueba SEO/AEO — registro C

2026-09-21. Prueba interna de tres estáticos para una campaña de diagnóstico SEO/AEO. Registro C en construcción: objetos digitales tangibles, luz lateral motivada, azul en objetos y acento naranja. No publicada; desempeño aún no medido.

## Entregables

- [Vista conjunta](out/campana-seo-aeo-contacto.png).
- [Presencia: ¿Sales tú?](out/01-presencia.png): la ausencia visible en una respuesta digital plantea la pregunta de visibilidad.
- [Relevancia: Sé relevante.](out/02-relevancia.png): una pieza iluminada entre alternativas representa la selección por relevancia.
- [Diagnóstico: Mídelo.](out/03-diagnostico.png): una lente física revela una brecha en la respuesta.

Exportaciones 1080 × 1350, 4:5. CTA compartido: «Solicita un diagnóstico SEO/AEO». Las interfaces y objetos son metáforas; no son resultados de clientes ni capturas de un producto real.

## Producción y prompts

Modo built-in: motor de imagen integrado de Codex (`image_gen`); el servicio no expuso el identificador de modelo ni su versión. Diez generaciones/ediciones en total, con originales y revisiones conservados en `plates/`. No se infiere un modelo comercial específico.

Las fichas y prompts completos están en [brief/](brief/), compilados con el pipeline canónico `foto:prompt` / `construirPrompt`. Plates seleccionados:

| Pieza | Plate | Último prompt |
| --- | --- | --- |
| Presencia | `plates/01-presencia-v2.png` | [01-presencia-v2.prompt.txt](brief/01-presencia-v2.prompt.txt) |
| Relevancia | `plates/02-relevancia-v4.png` | [02-relevancia-v4.prompt.txt](brief/02-relevancia-v4.prompt.txt) |
| Diagnóstico | `plates/03-diagnostico-v4.png` | [03-diagnostico-v4.prompt.txt](brief/03-diagnostico-v4.prompt.txt) |

Los prompts iniciales y las ediciones intermedias permanecen junto a los últimos prompts para reproducir la secuencia. Plates nativos de 1122 × 1402; exportación normalizada por el compositor. Texto Bricolage/Poppins, selección y firma SVG oficial compuestos después mediante `pnpm foto:componer` y [piezas.json](piezas.json). Sin scrim.

Referencias inspeccionadas: contacto curado y K1/K3 de `2026-09-19_lenguaje-fotografico-efeonce`; d1/d2 experimentales de `2026-09-21_registro-c-respuesta`; mascota de `2026-09-17_codex-poses-3d/final/efeonce-codex-3d-01-frente-heroe-1x1-1600x1600-v01-transparente.png`. Las referencias experimentales no se presentan como campañas aprobadas.

## Verificación y alcance

- Los tres plates seleccionados pasan 5/5 reservas evaluadas por `foto:validar --zona-texto`; reportes en `brief/*.reservas.txt`. La reserva de selección sobre objeto no aplica: la selección está sobre el titular.
- Contraste mínimo de texto: 12,44:1 / 10,42:1 / 12,55:1. Firma: 20,12:1 / 20,08:1 / 19,41:1. [QA del compositor](out/qa.json).
- Revisión visual de la vista conjunta y previews de feed; previews de 390 px conservados en `out/preview-390/`.
- Las iteraciones despejaron reservas laterales y redujeron las figuras de relevancia/diagnóstico. Hay variaciones de textura propias de la generación; no se certifica fidelidad perfecta de personaje.
- Prototipo interno: el uso paid de la mascota requiere revisar derechos y aprobación de marca según su kit. No implica respaldo de un proveedor ni aprobación para pauta.
- Son tres conceptos exploratorios, no un A/B controlado: cambian imagen y mensaje. Un siguiente test debe mantener cuerpo/CTA/audiencia/placement y variar solo el gancho. No hay datos de thumb-stop, CTR o conversión que permitan declarar un ganador.
