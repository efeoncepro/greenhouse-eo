# BytePlus: rostros en Seedance, biblioteca de assets y Advanced Creation Rights — investigación 2026-10-17

> **Tipo de documento:** Auditoría / investigación fechada (fuente oficial, solo lectura)
> **Fecha:** 2026-10-17 · páginas oficiales con «Updated 2026-10-13»
> **Autor:** Claude (tres subagentes en paralelo + verificación de citas contra el texto descargado)
> **Consumidores:** [Ledger de cupos](../../operations/creative-production/BYTEPLUS_VIRTUAL_PORTRAIT_LEDGER_V1.md) · [Manual BytePlus directo](../../manual-de-uso/creative-studio/byteplus-directo.md) · [ADR](../../architecture/creative-studio/EFEONCE_BYTEPLUS_DIRECT_MEDIA_CLI_DECISION_V1.md)

**Método.** Las páginas de docs.byteplus.com se renderizan con JavaScript; se leyeron descargando el HTML y el markdown
oficial (`ai.byteplus.com/ark/region:ap-southeast-1/docs/<slug>.md`). Sin login, sin llamadas a APIs, sin compras.
Cada afirmación lleva su estado: **Verificado** (lo dice una página oficial leída), **Inferido** o **No encontrado**.
Las citas clave (precios, cupo, cuota compartida, carta de compromiso, salidas confiables) se re-verificaron contra
el texto descargado.

**Cierre operativo posterior — 2026-10-17 18:17 UTC.** La investigación oficial siguiente conserva sus
hallazgos originales. En la cuenta de producción `3004839361`, el KYC quedó aprobado y Entry gratuito activo;
el lote autorizado terminó con doce assets `Active` en seis grupos. Se verificaron IDs únicos, `GroupId` y
proyecto `default` en respuestas `ListAssets` de la consola. Las dos pruebas de Antonio terminaron `succeeded`: como
referencias de rostro/cuerpo y como primer cuadro sólo de rostro, Seedance 2.5, borrador de 4 s y resolución
declarada 480p, con ambos videos descargados. Esto resuelve la duda operativa sobre `first_frame` para esa prueba,
sin convertirla en una garantía general ni aprobación creativa. El cupo y los IDs vigentes están en el
[ledger §1/§4/§7](../../operations/creative-production/BYTEPLUS_VIRTUAL_PORTRAIT_LEDGER_V1.md), cuyo cierre se
versionó en `45315b12f`. No hubo compra, cambio de plan ni modificación de credenciales.

La cuenta histórica `3003660328` es independiente y está excluida de operación. Las observaciones de su firma
a las 07:53 UTC no corresponden a la carta de producción, aceptada posteriormente por orden expresa de Julio.
No reutilizar IDs de esa cuenta. La habilitación local de Chrome fue hecha por Julio; no fue una activación de
Asset Service ni una compra de recursos. Evidencia limpia y recibos conservados fuera del repo en
`/Users/jreye/Documents/BytePlus-Asset-Service-2026-10-17/`.

## 1. Advanced Creation Rights y cupo

| Plan | Precio | Cupo | Retrato virtual | Retrato real | QPM de subida |
|---|---|---|---|---|---|
| Basic Creation Rights | Gratis | 50 assets / 50 grupos | No | Sólo consola | 3 |
| **Advanced Creation Rights (Entry)** | Gratis | 50 assets / 50 grupos | Sí (consola y API) | Sí (consola y API) | 3 |
| Advanced Creation Rights | USD 14.000/año o 1.400/mes | 1M / 1M | Sí | Sí | 120 |
| Advanced Creation Rights (Premium) | USD 42.000/año o 4.200/mes | 5M / 5M | Sí | Sí | 300 |

- **Verificado:** un asset es un archivo (imagen, video o audio) y pertenece a un grupo; un grupo agrupa los archivos
  de una misma persona o personaje. Los dos contadores son independientes.
- **Verificado:** «The capacity quota is shared between Private Virtual Avatar Asset Library and Real-human Portrait
  Library».
- **Verificado:** una suscripción activa por cuenta; assets aislados por `ProjectName`; inferir con un endpoint del
  mismo proyecto.
- **Verificado:** sin reembolso; se sube de tier pagando la diferencia; no se baja. Mensual: hasta 3 meses por compra.
- **Verificado:** al vencer un tier pagado, 15 días de gracia con cupo Entry; después se borran los assets y grupos
  creados durante el período pagado. Lo creado antes se conserva.
- **Verificado:** requisitos: verificación de organización (KYC) y aceptar cuatro textos (Terms of Use for Asset
  Library, Commitment Letter for Uploading Virtual Avatar Assets, Real Person Verification H5/API Usage Rules, Code of
  Conduct).
- **No encontrado:** si borrar libera cupo (se recomienda borrar lo que no se usa); vencimiento del plan Entry; costo
  por usar un asset (el cobro de Seedance sigue siendo por tokens).
  **Regla operativa del lote:** Julio indicó que el cupo no se recupera; conservar los assets y no borrar ni
  volver a subir para comprobar capacidad. El hallazgo documental inicial no autoriza probar un borrado.
- **Inferido:** los ~USD 1.600 que vio el operador pueden ser USD 1.400 + impuesto. Confirmar en el checkout.

Fuentes: [Purchase Guide](https://docs.byteplus.com/en/docs/ModelArk/seedance-2-0-purchase-guide) ·
[Biblioteca virtual](https://docs.byteplus.com/en/docs/ModelArk/2333565) ·
[Precios](https://docs.byteplus.com/en/docs/ModelArk/model-pricing)

## 2. Assets: requisitos, ciclo de vida y uso

- **Verificado — imagen:** jpeg, png, webp, tiff, gif, heic/heif; lados de 300 a 6000 px; proporción 0,4–2,5;
  < 30 MB. Video: mp4/mov, 2–30 s, ≤ 200 MB. Audio: wav/mp3, 2–30 s, ≤ 15 MB.
- **Verificado — recomendado por personaje:** cuerpo entero vertical frontal + primer plano vertical frontal, sin
  expresión, cara ≈ 2/3 del encuadre. Sin mínimo ni máximo por grupo.
- **Verificado — estados:** `Processing` → `Active` (usable) o `Failed`. Sin SLA de revisión.
- **Verificado — sólo se puede actualizar el nombre** de un asset; corregir la imagen = borrar y subir otro.
- **Verificado — referencia:** `asset://<Asset_Id>` (id del asset `asset-…`, no del grupo) en `content[].image_url.url`
  (`video_url`/`audio_url` para esos tipos). En el prompt se nombra «Image 1», «Video 1»; nunca el id.
- **Verificado — rol:** todos los ejemplos oficiales usan `reference_image`, incluso mezclando asset y URL normal.
  **No encontrado:** ejemplo con `first_frame`; el campo acepta asset id sin restringir rol (**inferido:** podría
  funcionar; probar con borrador). **Observado después:** funcionó en la prueba de Antonio del cierre de arriba;
  la ausencia de ejemplo oficial se conserva como hallazgo de esta investigación.
- **Verificado — modelos:** Seedance 2.5 y la serie 2.0 (2.0, fast, mini). Seedance 2.5: hasta 30 imágenes, 10 videos,
  10 audios por request. El borrador final reutiliza las referencias (no se reenvían).
- **No encontrado / inferido no:** Seedream (imagen) no acepta assets.
- **Verificado — API de gestión:** `POST https://ark.ap-southeast-1.byteplusapi.com/?Action=<Action>&Version=2024-01-01`,
  firma AK/SK V4 (service `ark`, región `ap-southeast-1`); la API key de inferencia no sirve. Acciones:
  CreateAssetGroup (`GroupType=AIGC`), CreateAsset (sólo por **URL pública**, un archivo por request), GetAsset (URL
  válida 12 h, `LastInferenceTime`), ListAssets, ListAssetGroups, Update*, Delete*. Política IAM `ark:*Asset*`.

Fuentes: [Create asset](https://docs.byteplus.com/en/docs/ModelArk/create-asset-api) ·
[Crear tarea de video](https://docs.byteplus.com/en/docs/ModelArk/create-video-generation-task-api) ·
[Guía de retratos](https://docs.byteplus.com/en/docs/ModelArk/seedance-portrait-asset-guide)

## 3. Carta de compromiso (retratos virtuales)

**Verificado** ([2275638](https://docs.byteplus.com/en/docs/ModelArk/2275638)): la documentación dice que se firma al crear el primer grupo.
**Observado (2026-10-17):** en la práctica BytePlus la pidió al activar el plan Entry, con un código enviado por correo
(07:53 UTC, junto con el KYC Questionnaire); al crear los grupos ya no apareció.
La empresa declara que el avatar es original y no se parece a ninguna persona natural; que, si usó IA, cumplió los
términos de la herramienta e hizo una selección, creación y modificación **sustancial y creativa**; que no contiene
marcas o logos de terceros sin autorización; y que conserva y puede mostrar en cualquier momento archivos fuente,
capturas o grabaciones del proceso, licencias y **registros de uso de la herramienta de IA**. Ley de Singapur.

Los personajes prediseñados de BytePlus sólo sirven para probar el modelo y uso interno ([2275639](https://docs.byteplus.com/en/docs/ModelArk/2275639)).

## 4. Filtro de rostros y salidas confiables

- **Verificado:** Seedance 2.x no acepta imágenes o videos de referencia con rostros humanos reales; tres soluciones:
  salidas confiables, personajes digitales (biblioteca) y retratos reales autorizados.
- **Verificado — salidas confiables:** salidas originales con rostro, generadas **en la misma cuenta** dentro de los
  **últimos 30 días**, por: videos de Seedance 2.5/2.0, su último cuadro (`return_last_frame`) e imágenes de
  **Seedream 5.0 lite/pro/flash texto-a-imagen**. «Only original model outputs are trusted; they cannot be used after
  secondary editing». «Compressing or forwarding files may invalidate trust verification»; se recomienda guardar el
  original directo en TOS.
- **Inferido:** Seedream imagen-a-imagen o edición sobre una imagen externa **no** cuenta (fuera del alcance nombrado y
  es edición secundaria). Ya está prohibido como «lavado» en el ledger.
- **No encontrado:** si personajes estilizados/3D/caricatura pasan el filtro; desglose por rol (primer cuadro vs
  referencia). **Inferido:** aplica a toda imagen o video de entrada.
- **Verificado — KYC:** es requisito del plan, no exención del filtro (coincide con la re-prueba del 2026-10-17).
- **Verificado — retratos reales:** quien usará los assets crea el grupo y un QR; la persona retratada entra con su
  propia cuenta, acepta, hace verificación en vivo y sube; quien usa acepta y queda `Active`. Gratis por tiempo
  limitado. Comparte cupo con la biblioteca virtual.
- **Verificado — errores (HTTP 400):** `InputImageSensitiveContentDetected.PrivacyInformation` («may contain a real
  person»), `InputVideoSensitiveContentDetected.PrivacyInformation`, `*.PolicyViolation` (posible derecho de autor),
  `Output*SensitiveContentDetected` (salida bloqueada aunque la entrada sea confiable).

Fuentes: [Guía de retratos](https://docs.byteplus.com/en/docs/ModelArk/2608626) ·
[Retratos reales](https://docs.byteplus.com/en/docs/modelark/upload-real-person-portrait-assets) ·
[Códigos de error](https://docs.byteplus.com/en/docs/ModelArk/1299023)

## 5. Consecuencias para Efeonce

1. 50 assets ≈ 25 personajes con 2 imágenes. Nexa y el elenco recurrente primero; el retrato real de Julio también
   descuenta.
2. Un personaje de una sola pieza no necesita cupo si su cuadro se genera **nativamente con Seedream 5.0
   texto-a-imagen** en esta cuenta y se usa dentro de 30 días sin editar; o se produce en Higgsfield.
3. Cada personaje subido necesita su carpeta de evidencia antes de la subida.
4. Uso documentado: `--references` con `asset://`; el primer cuadro no tenía ejemplo oficial localizado.
   La prueba propia posterior del 17/10 fue exitosa en ambos roles (cierre de arriba y ledger §7).
5. Implementar la gestión de assets por API exige AK/SK propias y URL pública por archivo: unidad aparte con revisión
   de credenciales.
