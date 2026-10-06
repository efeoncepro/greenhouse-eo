# Generar y editar con Nano Banana 2.1

`pnpm ai:nano` opera `gemini-nano-banana-2.1` por Google Cloud/Vertex `global` con las credenciales
del resolver canónico del repo. Es tooling local; no configura el producto ni promueve rutas de Globe.
Implementación: `scripts/ai/nano-banana.ts`; contrato: `src/lib/ai/nano-banana-cli.ts`.

## Uso

```sh
# Sin red ni gasto: revisa la configuración y el componente visual nominal.
pnpm ai:nano --prompt-file prompt.txt --resolution 4K --aspect 8:1 --thinking high --search both --dry-run

# Texto a imagen. --yes autoriza esta llamada; no hay retry automático.
pnpm ai:nano --prompt-file prompt.txt --out .captures/nano/primera.png --session .captures/nano/sesion.json --yes

# Edición iterativa: conserva historial, imágenes y firmas opacas del proveedor.
pnpm ai:nano --prompt 'Cambia sólo la iluminación a atardecer' --session .captures/nano/sesion.json --out .captures/nano/segunda.png --yes

# Edición / fusión con referencias explícitas (PNG, JPEG o WebP locales).
pnpm ai:nano --image base.png --image referencia.png --prompt-file edit.txt --resolution 2K --out .captures/nano/edit.png --yes

# Búsqueda web + visual y respuesta streaming.
pnpm ai:nano --prompt-file prompt.txt --search both --stream --out .captures/nano/grounded.png --yes

# Contexto multimodal: no genera video; produce imagen desde video/PDF.
pnpm ai:nano --video gs://bucket/clip.mp4 --pdf brief.pdf --prompt-file prompt.txt --out .captures/nano/poster.png --yes

# Conteo de entradas, sin generación.
pnpm ai:nano --image base.png --prompt-file prompt.txt --count-tokens
```

## Cobertura

| Superficie | CLI |
|---|---|
| `generateContent` | Sí: texto a imagen, edición por instrucciones, fusión, contexto video/PDF y sesiones locales |
| `streamGenerateContent` | Sí: `--stream`, SSE completo; no guarda resultados parciales |
| `countTokens` | Sí: `--count-tokens`; no genera imagen |
| Batch API asíncrona | No; no hay descuento Batch ni submit/status/cancel de lotes |
| Interactions API / `previous_interaction_id` remoto | No; continuidad mediante historial local `generateContent` |
| Máscara PNG nativa / inpainting con delta 0 | No; `--mask` se rechaza. El pipeline `ai:inpaint` mantiene su propio contrato |

Controles: `--resolution 1K|2K|4K` (default 1K), `--thinking minimal|medium|high` (default medium),
`--search off|web|images|both` (default off), `--system-file`, `--aspect` y `--project`.
Los 14 ratios son `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`,
`1:4`, `4:1`, `1:8`, `8:1`. Omitir ratio permite seguir el contexto de las referencias.
Hasta 14 imágenes por turno; la ficha distingue 4 personajes y 10 objetos. Video: MP4 local o GCS,
o una URL pública de YouTube; PDF local o GCS. Entradas inline agregadas: 20 MiB máximo,
con límite conservador del request de 28 MiB incluyendo historial. No se suben archivos automáticamente.
`--image` remoto se rechaza: esta CLI verifica los bytes de las referencias locales.

`--format png|jpeg|webp` convierte localmente cuando corresponde; no se presenta como control nativo
del modelo. La extensión debe coincidir. Los bytes nativos se conservan si ya tienen el formato pedido.

## Privacidad, gasto y recuperación

Sesión y metadata: permisos `0600`; contienen medios/prompts privados. Usar `.captures/` o una carpeta
privada, no un directorio público para sesiones. La sesión incluye las firmas opacas necesarias para
continuidad, pero excluye texto/imágenes de pensamiento privado. No la compartas como reporte.
La metadata `<out>.json` conserva usage, identidad de modelo, dimensiones, texto final y grounding
(incluida atribución del proveedor); revisar las exigencias de atribución antes de publicar una imagen grounded.

La sesión tiene lock por corrida y se actualiza tras una imagen completa y verificada. La CLI no sobreescribe
salidas. Tras timeout o desconexión el consumo es indeterminado: no reenvía automáticamente y no avanza la
sesión. Inspecciona el consumo de Google antes de repetir. Las credenciales se resuelven mediante
`createGoogleAuth`, sin imprimir tokens ni errores crudos del proveedor.

`--max-output-usd` (default 0,10) limita **sólo la imagen de salida nominal**, no la factura:
1K US$0,0336; 2K US$0,0504; 4K US$0,0756. Entradas, razonamiento y búsquedas son adicionales.
No se promete conservación exacta de píxeles al editar por instrucciones.

## Evidencia y límites

Evidencia local y pruebas reales del 2026-10-06: [auditoría](../../audits/ai-tooling/2026-10-06-nano-banana-2-1-cli.md).
No extrapolar una prueba de 1K/2K a la calidad de 4K, todos los ratios, 14 referencias o contexto video/PDF.
El helper del producto `google-gemini-image` sigue teniendo configuración independiente: este cambio sólo
añade la CLI. Nano Banana 2 (`gemini-3.1-flash-image`) tiene retiro anunciado el 29/10/2026 en Gemini API;
la migración del producto necesita verificación propia.

Fuentes oficiales, verificadas 2026-10-06: [modelo](https://ai.google.dev/gemini-api/docs/models/gemini-nano-banana-2.1),
[generación](https://ai.google.dev/gemini-api/docs/image-generation),
[changelog](https://ai.google.dev/gemini-api/docs/changelog),
[precios](https://ai.google.dev/gemini-api/docs/pricing),
[endpoints Cloud](https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/locations),
[búsqueda Cloud](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/grounding/grounding-with-google-search).
