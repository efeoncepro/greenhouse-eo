# BytePlus directo — conexión y canary 2026-10-12

## Alcance real

Dos claves creadas con autorización explícita del operador: `efeonce-media-directa` (ModelArk, 12 familias
seleccionadas de media, sin LLMs/futuros) y `efeonce-speech-directa` (Seed Speech, default). Readback visual
active/enabled. Valores publicados en `efeonce-group` como `greenhouse-byteplus-api-key` y
`greenhouse-byteplus-speech-api-key`; referencias locales, sin claves en archivos/versionado/logs.
Transferencias temporales 0600 eliminadas. `greenhouse-portal` recibió secretAccessor sólo en ambos secretos.
Sin IAM de proyecto, mounts remotos, compras de slots, clonación, publicación ni deploy.

[ADR](../../architecture/creative-studio/EFEONCE_BYTEPLUS_DIRECT_MEDIA_CLI_DECISION_V1.md) y
[manual](../../manual-de-uso/creative-studio/byteplus-directo.md). Catálogo: 21 entradas de imagen/video/audio,
TTS/Voice Replication, ASR de archivo/stream e interpretación, con sus identidades y recursos exactos.
Seedance 1.5 Pro no se incluye: el fabricante cerró su activación nueva.

## Evidencia del consumidor

`pnpm ai:byteplus --doctor`: ModelArk GET de tareas autenticado; Seed Speech consulta UUID inexistente,
HTTP 200 y status 45000000 (tarea inválida/no existente). No envía audio ni crea una tarea ASR. Esto no
certifica una síntesis/transcripción exitosa ni todos los permisos de inferencia de voz.

Canary interno, sintético, sin personas ni marcas. Raíz local:
`ai-generations/2026-10-12_byteplus-direct-canary/`. No habilita rutas Globe ni certifica calidad comercial.

| Salida | Modelo | Identidad de ejecución | Uso observado | Costo USD estimado con tarifa de cuenta |
|---|---|---|---|---|
| `flash.png` | Seedream 5 Flash | 02179182908627696d528c8df2143421f3e331d7739c2b1b10972 | 1 imagen, 4096 tokens, PNG 1024² | 0.018 |
| `layerize/layers/byteplus-8f35b9f5656fc2e9/layers.json` | Seedream 5 Pro Layerize | 021791829393312c891133c7aa592195d19c3080f8a135d462879 | 3 capas + base, generated_images=4, 16396 tokens | 0.081 |
| `mini.mp4` | Seedance 2 Mini | cgt-20261013021821-v49z7 | succeeded, completion_tokens=40594; H.264/AAC 864×496, 24 fps, 4.096 s contenedor | 0.0568316 |
| `seedance25.mp4` | Seedance 2.5 | cgt-20261013022425-1f0q5 | succeeded, completion_tokens=38830; H.264 854×480, 24 fps, 4.041667 s contenedor, sin audio | 0.415481 |

La primera petición de capas devolvió 400 InvalidParameter (request ID
02179182910158035b29c922ac7ba22cc26b6e12169d21310813b). No hubo outputs; no se hizo retry automático.
Una segunda petición explícita con el mismo contrato completó: causa exacta del primer rechazo no aislada.
El adapter falla ante errores y no oculta esa condición ni reenvía un POST por su cuenta.

Se inspeccionaron los píxeles de imagen y `layers-contact-sheet.png`: capas PNG con alfa real y cajas en la base,
reconstruidas y con watermark del fabricante por defecto. `pnpm ai:mask --from-layer ... --layer '#2'`
generó una máscara 1024² sobre el rectángulo rojo en (199,309), caja 211×212; preview inspeccionado.
El documento existente de inpainting es compatible. No implica un PSD/vector ni preservación de píxeles.

Consumo estimado total: **US$0.5713126**. Facturación/settlement pendiente; no se leyó una factura.
Recibos y `manifest.json` conservan IDs, uso, tamaños y SHA-256, sin URLs firmadas.
Se inspeccionó el primer cuadro de Seedance 2.5; validación técnica del MP4, sin certificar calidad de movimiento.

## Verificación local

- Suites BytePlus, adapter Layerize y contrato de capas: **24/24 pass en 3 archivos**.
- ESLint de los archivos de este alcance y `pnpm typecheck`: **pass**.
- Secretos resueltos por el consumer canónico; no se agregaron valores a `.env.local`.
- ADR/index/manual/guía y skills espejo Codex/Claude actualizados; `docs:closure-check` y `docs:context-check:strict` **pass** (0 errores/0 warnings).
- Canary y checks realizados antes del commit local autorizado. Sin build/release ni push. Checkout compartido con otros cambios preservados.

## Límites

Las tarifas son las observadas en la consola el 2026-10-12, ya descontadas. Los importes de canary son
estimaciones por salida/usage, no conciliación de factura ni ahorro liquidado. El Savings Plan de US$30
fue una compra previa del operador; este trabajo no compró otro paquete. Audio/voz: transportes y pruebas
unitarias conectados, sin generación real en este canary. Enrollment exige voz adquirida/consentimiento y
nunca compra slots. Fal/Higgsfield conservan sus conexiones; la ruta preferida del fabricante es local.
