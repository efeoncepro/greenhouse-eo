# BytePlus directo para los comandos de media

- Status: Accepted
- Date: 2026-10-12
- Owner: AI Creative Operations
- Scope: cliente server-only, catálogo BytePlus y comandos locales de imagen, capas, video y Seed Speech.
- Reversibility: two-way
- Confidence: high para imagen/video; las superficies de voz conservan evidencia por transporte.
- Validated as of: 2026-10-12

## Context

El operador tiene el contrato CT20260924149968 efectivo en Johor y activó los modelos de media del fabricante.
La consola confirma descuentos en Seedream, Seedance Fast y Mini. El 2026-10-12 pidió crear las credenciales y
conectar todos los modelos, incluido Layerize, para consumir directamente. Los comandos actuales usan Fal.
La evidencia anterior de TASK-1656 pertenece a las rutas de Globe y no gobierna este carril local nuevo.

## Decision

Crear un cliente BytePlus server-only reutilizable y un catálogo con identidades exactas. `pnpm ai:byteplus`
opera ese cliente fuera del runtime del producto. `pnpm ai:layers --provider byteplus` conserva el mismo
`layers.json` que consumen máscaras/inpainting. No se promueve ninguna ruta de Globe, no se despierta Globe
y no se modifica ningún deploy. Se conserva Fal como proveedor explícito.

ModelArk y Seed Speech usan claves separadas, limitadas al proyecto default y a media donde la consola permite
restringir modelos. Sus valores viven en Secret Manager de `efeonce-group`; sólo referencias no secretas entran
en `.env.local`. La creación requiere la confirmación del navegador; nunca se guardan claves en documentos,
outputs de generación, comandos ni logs. El consumer canónico usa `greenhouse-portal`; se concedió
`secretAccessor` sólo sobre esos dos secretos. No se amplían roles de proyecto ni se montan secretos en runtimes remotos.

## Alternatives Considered

- Mantener Fal para todo: conserva operación conocida pero pierde las tarifas directas del contrato.
- Integrar en Globe ahora: requiere promoción de rutas y sus gates; el producto está hibernado y no fue pedido.
- Reutilizar una clave cloud general de BytePlus: concede más acceso que las claves de inferencia del servicio.

## Consequences

Cada generación conserva identidad de modelo, proveedor, request/task ID, uso y estimación, sin URLs firmadas.
Una tarifa estimada no prueba ahorro realizado. El número de capas se conoce sólo tras la respuesta; se incluye
la base y se calcula por el tamaño efectivo de cada capa en BytePlus. No se reintenta un POST de generación.
Video registra el task ID antes de polling para poder recuperar el resultado sin encolar de nuevo.
Imágenes esperan hasta 600 s sin retry automático: Pro standard con ocho referencias terminó a los 227 s
en la [prueba Nexa](../../audits/ai-tooling/2026-10-12-nexa-seedream5-pro-vs-sunburst.md). El timeout inicial
de 180 s no prueba cancelación ni cobro cero; un nuevo POST es un intento separado.

## Runtime Contract

- `src/lib/ai/byteplus-catalog.ts`: modelos, transportes y precios observados en la cuenta.
- `src/lib/ai/byteplus.ts`: resolución canónica de secretos y HTTP de ModelArk/Seed Speech.
- `scripts/ai/byteplus.ts`: comando del operador; discovery/doctor/estimación no generan.
- `scripts/ai/inpaint/adapters/layerize-byteplus.ts`: adaptación al documento de capas existente.
- Generación exige ejecución explícita; `--max-usd` permite un tope sobre el estimado conocido. El precio
  desconocido exige confirmación explícita y no acepta un límite ficticio.
- Modo borrador (2026-10-16): el catálogo declara `draft` por modelo (hoy sólo `seedance25`: 480p, final 1080p,
  7 días). `buildBytePlusDraftFinalRequest` arma el final con sólo `draft_task` y los campos que el fabricante permite;
  la CLI rechaza antes de llamar resolución inválida, parámetros reutilizados, borrador vencido o sin terminar.
- Rostros reales (2026-10-16): el rechazo `PrivacyInformation` se traduce a las vías oficiales; las imágenes locales
  viajan con sus bytes originales para no romper la confianza en salidas propias de la cuenta. Los personajes
  ficticios aprobados en la biblioteca privada de retratos virtuales entran como `asset://<id>`; crearlos (KYC de
  organización, Advanced Creation Rights, carta de autorización) es un acto del operador en la consola, no del comando.
- Voice enrollment no se prueba ni compra slots de voz durante instalación. Las voces clonadas exigen speaker ID
  adquirido y consentimiento de la persona; credencial válida no prueba ese derecho.

## Revisit When

Cambian precios, permisos, identidades de modelo o protocolo upstream; se pide un consumidor de producto/MCP;
se promueve una ruta Globe; o falta evidencia del transporte y de sus salidas reales.

## Evidence

**Delta 2026-10-16 — modo borrador en vivo.** Borrador `cgt-20261017085910-h4kbe` (Seedance 2.5, 4 s, primer cuadro
4:5, audio): 580×726, 39.887 tokens. Final `cgt-20261017090108-fzvku` desde ese borrador: 1288×1610, 196.432 tokens,
misma toma cuadro a cuadro. El mismo día, un cuadro fotorrealista con una persona (GPT Image) fue rechazado al crear
la tarea con `InputImageSensitiveContentDetected.PrivacyInformation`, sin tarea creada. Según la PDM de BytePlus,
la restricción para personas se levanta con la verificación KYC de la cuenta; pendiente de completar y re-probar.
Corrida: `ai-generations/2026-10-16_byteplus-anuncio-para-cuando/v2-gpt/byteplus-draft/`.

OmniHuman 2.0 / Vision AI fue investigado el 2026-10-15 y sigue fuera de la implementación aceptada de
ModelArk/Seed Speech de este ADR. Dos transportes oficiales (AK/SK y API Key IAM) no amplían nuestras claves
existentes. Modelo `Disabled` en la cuenta, sin inferencia. [Contrato y frontera](BYTEPLUS_OMNIHUMAN_2_API_CONTRACT_V1.md)
y [manual](../../manual-de-uso/creative-studio/omnihuman-2-api.md). Una integración futura requiere su unidad
con revisión de arquitectura, credencial, presupuesto, recuperación y canario; sin promoción Globe implícita.


- [Imagen y layer decomposition](https://docs.byteplus.com/en/docs/ModelArk/image-generation-api)
- [Crear tarea de video](https://docs.byteplus.com/en/docs/ModelArk/create-video-generation-task-api)
- [Tarifas y ejemplos](https://docs.byteplus.com/en/docs/ModelArk/model-pricing)
- [Seed Audio](https://docs.byteplus.com/api/docs/byteplusvoice/seedaudio-01)
- [TTS HTTP](https://docs.byteplus.com/en/docs/byteplusvoice/unidirectional_tts_http)
- [ASR de archivos](https://docs.byteplus.com/en/docs/byteplusvoice/asraudiofile)
