# Pibank · AEO X-Ray publicado, experiencia temprana y propuesta técnica v12

> **Fecha:** 2026-10-09 (trabajo del 08 y 09-10) · **Tipo:** registro de sesión (uso interno)
> **Piezas:** muestra AEO X-Ray de Pibank Perú publicada en Think (carril `sample_*`, no listada) y propuesta
> técnica SEO/AEO 2027 v12 (47 láminas 16:9, línea Engine)
> **Canvas:** https://claude.ai/artifact/XpdEeKjFLWrCikqBEvnSfw, página «tecnica», versión 67 (el delta de la v11
> anotó la 66; vale la 67)
> **PDF:** `ai-generations/2026-10-07_pibank-propuesta/out/Pibank-Propuesta-tecnica-SEO-AEO-2027-v12.pdf` y copia en
> OneDrive `Alineación/4. Comercial/Licitaciones/Banco Pichincha/`. **No enviado.**
> **Expediente del X-Ray (fuera de Git):** `~/Documents/Banco Pichincha Peru — Prospect Case/09-XRay-Pibank/`. La clave
> del enlace vive sólo en `SAMPLE_KEY.txt` (0600) de ese expediente; no se copia a Git ni a este registro.
> **Antecedente:** [propuesta técnica v11 del 2026-10-08](2026-10-08-pibank-propuesta-tecnica-v11.md)
> **Guía del X-Ray:** [Preparar un AEO X-Ray para otro cliente](../../think/aeo-xray-nuevo-cliente.md) ·
> [Manual](../../think/radiografia-aeo-manual.md)

## 1. Qué la motivó

- La propuesta técnica vende un programa (pilar Cuenta Soles M1–M2, comparativas desde M3, panel AEO mensual,
  comunidad desde M3), pero no mostraba cómo se vería ese trabajo con datos de Pibank. Una muestra breve y real del
  X-Ray sirve de prueba dentro de la propuesta.
- La muestra de Banco Pichincha mostraba la pieza terminada; para Pibank se quiso además que el banco viviera cómo
  sería trabajar con Efeonce: qué dice hoy la IA, qué lee hoy la máquina de su página, cómo se revisa cada dato y cuál
  es el siguiente paso. Eso pidió extender el contrato a 0.2.0.
- Quedaban tres pendientes de la v11 por cerrar antes del envío.

## 2. Cambios

### 2.1 Muestra AEO X-Ray de Pibank Perú (publicada en Think)

- Dos piezas: la landing «Cuenta Soles Pibank» (artifact `cuenta-soles`) y el artículo «¿Qué cuenta de ahorros te
  conviene? Compara rendimiento, costos y liquidez» (artifact `comparar-cuentas`).
- Publicada como muestra no listada `sample_*` en el carril de muestras publicadas de efeonce-think:
  `src/lib/aeo-xray/published/pibank.json` + registro en `published.ts` + medios en `public/aeo-xray-media/<clave>/`.
  Es la segunda muestra de ese carril, junto a la de Banco Pichincha.
- El intent se genera con `build-intent.py` del expediente a partir del modelo de Pichincha; se valida y construye con
  `node scripts/aeo-xray/client-kit.mjs validate|build --dir <expediente>` y el manifest se copia al JSON publicado.
- Medios: banners y piezas sociales compuestos con `media/compose-media.mjs` (Poppins; paleta Pibank navy `#0F265C` y
  amarillo `#FFDC00`). Investigación con capturas de AI Mode y SERP en `research/`.
- Commits efeonce-think: `be453b0` (publicación inicial y scripts de verificación con `XRAY_VERIFY_ARTIFACTS`),
  `eb9c35d` (bloques 0.2.0 y muestra renovada), `5594128` (música en el video).

### 2.2 Contrato `efeonce.aeo-xray` 0.2.0

- AXIS `909229a`. Aditivo y opcional: 0.1.0 sigue vigente y Pichincha no cambia. Fuente en AXIS
  (`packages/contracts/src/aeo-xray*.ts`, `docs/agent-composition/aeo-xray.md`); export con
  `scripts/export-aeo-xray.mjs` → `docs/generated/aeo-xray/` → copias en `greenhouse-eo/src/lib/axis/aeo-xray/` y
  `efeonce-think/src/lib/axis/aeo-xray/`. El verificador `scripts/qa/verify-aeo-xray-distribution.mjs` (en ambos repos)
  acepta 0.1.0 y 0.2.0. Tests AXIS 212/212.
- Campos nuevos en `experience`: `aiPanel`, `today`, `review`, `measure`, `nextStep`; en `ui`: `welcomeTitle` y
  `welcomeEnter`; en `brand`: `logoOnDarkAssetId` (logo oficial para fondos oscuros, sin el recuadro claro en encabezado
  y cortina). Detalle de campos y reglas en la [guía, §«Bloques de experiencia temprana»](../../think/aeo-xray-nuevo-cliente.md#bloques-de-experiencia-temprana-contrato-020-2026-10-09).
- Think suma `AiPanel.astro`, `TodayCompare.astro`, `ReviewPanel.astro` y `NextStep.astro`, el copy `early` en
  `src/lib/aeo-xray/copy.ts`, `measure` en ValueExplorer y el título de bienvenida en WelcomeCurtain.
- Greenhouse: copia del contrato, verificador, guía y lámina 20 en el commit `12d63b542`.

### 2.3 Contenido de experiencia temprana (datos reales)

- **Panel AEO, 7 observaciones.** Google AI Mode del 08/10/2026 (Perú, español, escritorio, vía DataForSEO):
  - 4 consultas genéricas: Pibank aparece en 1 de 4 («cuenta de ahorros que paga más intereses peru», con 5.00% TREA
    correcta; cita Afluenta, Comparabanca, Infobae, Andina y Efectibank, no pibank.pe). Cita pibank.pe en 0 de 4.
  - 2 consultas de marca («pibank», «pibank es seguro»): aparece, dato correcto, cita pibank.pe.
  - Resumen de IA de Google del 06/10/2026 para «cuenta de ahorros sin mantenimiento»: le atribuyó 11.00% E.A. (dato de
    Pibank Colombia, fuente rankia.co). El 08/10 ya no lo mencionaba.
- **SERP re-capturada el 08/10/2026** (la del 06/10 se reemplazó porque la observación muestra la fecha de
  `preparedAt`): «cuenta de ahorros sin mantenimiento», 19 orgánicos, top 5 interbank, viabcp, bbva, scotiabank,
  bancofalabella; «mejor cuenta de ahorros peru», 18 orgánicos, top 5 youtube, comparabancaperu, scotiabank, mibanco,
  viabcp. Pibank no aparece en ninguna. Con `--target`, DataForSEO devuelve 40102 «No Search Results» cuando el dominio
  no aparece.
- **Hoy vs. con la pieza** (lectura pública del 09/10/2026 de `pibank.pe/cuenta-soles-pibank/`): título «Cuenta Soles
  Pibank - Pibank Perú»; descripción sin tasa; 3 H2, uno junta «Beneficios» y «Abrir cuenta»; ya marca FinancialProduct,
  Organization y BreadcrumbList (se conserva); FAQ visible sin FAQPage; la base 360 no aparece; 15 de 17 imágenes sin alt
  o con alt vacío. El mapa del sitio tiene 8 páginas y 51 FAQ, sin guía de comparación: el artículo «se suma».
- **Revisión:** ejemplo ilustrativo, declarado como tal, con documentos (cartilla y tarifario del 28/09/2026, FSD
  set–nov 2026), responsables de Producto y Cumplimiento y comentarios; plan en Notion y aprobación en Frame.io, como en
  la propuesta.
- **Cierre:** «Revisemos la muestra con tu equipo» → `mailto:` a sales@efeoncepro.com, semana del 12 de octubre.
- Se retiró el texto defensivo («no acredita ranking…», «no garantía de visibilidad») por regla del operador. Cortina:
  «Preparado para el equipo de Pibank / Ver la muestra». Cada pieza derivada declara su origen específico.

### 2.4 Video vertical de 12 s con música (receta en `09-XRay-Pibank/video/`)

- Híbrido: 2 cuadros clave verticales editados desde las fotos aprobadas del X-Ray (`pnpm ai:image --image …`,
  `gpt-image-2.5-sunburst`, 1024×1536), animados con Gemini Omni 1.1 image-to-video (`pnpm ai:omni --task image
  --staging-uri gs://… --aspect 9:16 --resolution 1080p --duration 5`, unos US$0,76 cada uno).
- Capa gráfica determinística en HTML (`graphics.html` + `render-graphics.mjs`, `seek(t)` por cuadro, PNG con alfa a
  30 fps): titular cinético, tarjeta con tres criterios cuyos checks se dibujan, cortina navy y el punto amarillo de
  Pibank que crece, llena la pantalla y se encoge hasta ser el punto del logo blanco sobre navy (el logo entra como SVG
  y el punto se mide con `getBoundingClientRect`).
- Montaje por segmentos con ffmpeg: un filtro único con zoompan + xfade quedó trabado sin consumir CPU.
- Música: Eleven Music (`eleven_music_v2_5`) por el conector remoto oficial de ElevenLabs (`creative_generate_in_flow`,
  node_type `music`), US$0,35 por pista, 5–7 min por pista. Pistas verificadas sin voz con `whisper-cli`. Mezcla a
  −16 LUFS (medido −15,5) con fades.
- El video vive en el formato «Story + video» (campo `reel`) de ambas piezas del X-Ray.

### 2.5 Propuesta técnica v12

- **Lámina 20 nueva, «Muestra X-Ray»** (capítulo 2, tras «Comunidad y PR»): mockup dibujado en HTML, no captura, de la
  ventana del X-Ray en «La radiografía» más un celular con la guía, el QR y el enlace. La clave y el QR se leen del
  expediente fuera de Git. El mockup usa el logo blanco de Pibank sin recuadro. Total: 47 láminas.
- `render-pdf.mjs` copia los enlaces externos de cada lámina como anotaciones clicables del PDF; antes se perdían porque
  cada lámina entra como JPEG.
- Glosario (46) a tres columnas, con «Solicitud iniciada»: evento a acordar con Analítica de Pibank en M1, sin tasa.
- Commits Greenhouse: `c0c9954fa`, `68bd5cab5`, `0068fee71`, `12d63b542`.

## 3. Verificación

- efeonce-think: `pnpm test:aeo-xray-v2` 23/23; `astro check` sin errores; build correcto.
- Gates de navegador sobre Pibank, en local y en producción: v2 198, motion 49, value 87, curtain 44.
- Regresión de Pichincha en local y en producción: v2, motion, value, curtain y media 113. Los gates aceptan
  `XRAY_VERIFY_ARTIFACTS=landingId,articleId` (por defecto, los IDs de Pichincha); el gate `media` es específico del video
  de Pichincha (720×1280, 10 s).
- AXIS: tests 212/212; el verificador de distribución acepta 0.1.0 y 0.2.0 en Greenhouse y Think.
- Música: pistas sin voz confirmadas con `whisper-cli`; sonoridad medida −15,5 LUFS.

## 4. Pendientes de la v11 cerrados

1. Gate `pnpm tender:canonical-gate`: no aplica; Pibank es prospecto, no licitación.
2. Foto de cierre: BR3f aprobada por el CEO (logo completo); BR3e descartada.
3. «Solicitud iniciada»: definida en el glosario (ver 2.5).

## 5. Trampas encontradas

- **Fixture local sólo raster.** El cargador local `fixture-case` acepta sólo webp/png/jpg/avif: un SVG de logo o un mp4
  no cargan en la vista local por `XRAY_CASE_DIR`. El carril publicado sí sirve mp4.
- **Módulo de condiciones de la landing.** Agrupa la tabla por la primera columna y muestra la tercera como cifra
  grande: la tabla necesita pocas categorías cortas (Tasa/Costos/Uso) y valores cortos («Digital», no «100% digital»);
  si no, desborda a 320 px.
- **Fecha de la observación SERP.** Sale de `preparedAt`, no de la captura: la SERP debe ser del mismo día.
- **Vista local aislada.** `astro dev` no permite dos servidores en el mismo repo. Para una vista aislada se copia el
  repo al scratchpad con `node_modules` clonado (`cp -cR`); un symlink rompe la resolución de Vite.
- **Integración Git de Vercel en efeonce-think.** Una vez no reaccionó al push y se lanzó el deploy de ese commit por la
  API de Vercel con `gitSource`; la segunda vez desplegó sola. Tras cada push, confirmar el deployment del SHA.
- **Conectores de ElevenLabs.** Los conectores locales `elevenlabs` y «ElevenLabs Player» tienen la clave mal cargada (un
  ID en vez de `sk_…`); funcionó el conector remoto oficial. Si un conector falla, probar los demás del mismo servicio
  antes de declarar bloqueo.
- **ADC vencida.** Un intento de video falló antes del envío por credenciales de Google vencidas, sin cobro; se renovó
  con `pnpm gcloud:auth:playwright -- --force`, que pidió login del operador.
- **WIP ajeno en un repo hermano.** Antes de publicar en efeonce-think se comparó el WIP con origin (era byte a byte igual
  a un commit ya publicado) y se respaldó antes de igualar el árbol.

## 6. Costos

- Video: unos US$1,9 en imagen + Omni y US$0,70 en música (dos pistas a US$0,35).
- El intento fallido por ADC vencida no generó cobro.

## 7. Reglas del operador registradas

- Sobre fondos navy se usa el logo blanco del cliente con su color propio, sin recuadro blanco. Sobre fondos del mismo
  color que el acento del logo (amarillo) hay que resolverlo aparte.
- Sin texto defensivo en la muestra («no acredita ranking», «no garantía de visibilidad»).

## 8. Pendiente

1. Envío de la propuesta v12 a Jesús en la misma cadena: lo hace el operador.
2. Revisión de la muestra con el equipo de Pibank, propuesta para la semana del 12 de octubre.
