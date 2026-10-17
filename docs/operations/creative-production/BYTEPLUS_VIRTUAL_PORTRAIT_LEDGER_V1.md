# Ledger de cupos — biblioteca de retratos de BytePlus — V1

> **Tipo de documento:** Ledger operativo (SSOT de cupos)
> **Version:** 1.4
> **Creado:** 2026-10-17 por Claude (decisiones del operador)
> **Ultima actualizacion:** 2026-10-17 por Codex (1.4: repetición de las dos pruebas de Antonio tras activación reportada del Asset Service; ambos intentos rechazados)
> **Documentacion relacionada:** [Investigación oficial 2026-10-17](../../audits/creative-studio/BYTEPLUS_PORTRAIT_ASSETS_RESEARCH_2026-10-17.md) · [Manual BytePlus directo](../../manual-de-uso/creative-studio/byteplus-directo.md) (§Rostros humanos reales) · [ADR BytePlus directo](../../architecture/creative-studio/EFEONCE_BYTEPLUS_DIRECT_MEDIA_CLI_DECISION_V1.md) · [Elenco de marca](../brand-photography/EFEONCE_BRAND_CAST_V1.md)

Seedance 2.x rechaza imágenes y videos de entrada con rostros humanos que no vengan de una vía de confianza.
La biblioteca privada de assets de BytePlus es la vía para personajes propios. Su cupo es escaso: este ledger es la
única fuente de qué se subió, por qué y quién lo aprobó.

## 1. Estado del plan

| Dato | Valor |
|---|---|
| KYC de organización | Enviado 2026-10-16; aprobado 2026-10-17 |
| Plan activo | **Advanced Creation Rights (Entry)**, gratuito, desde 2026-10-17 |
| Cupo | **50 assets y 50 asset groups.** Un asset es **un archivo** (imagen, video o audio); un grupo es un personaje |
| Compartido con | La biblioteca de **retratos reales**: un retrato real (Julio) descuenta del mismo cupo |
| Alcance | Una suscripción por cuenta; los assets quedan aislados por proyecto (`default`) |
| Usados | **12 de 50 assets · 6 de 50 grupos** |
| Tier siguiente (oficial, 2026-10-13) | **USD 1.400/mes o USD 14.000/año**: 1M assets, 120 QPM. Premium: USD 4.200/mes o 42.000/año. Sin reembolso |

El operador vio alrededor de USD 1.600 en la consola; la tabla oficial dice USD 1.400/mes. La diferencia podría ser
impuesto (sin verificar). **Antes de comprar, leer el precio final en el checkout.**

**Decisión del operador (2026-10-17):** el tier pagado se evalúa sólo cuando la herramienta de producción (runtime)
esté armada. Hasta entonces se opera sólo con el plan Entry.

**Al vencer un tier pagado:** 15 días de gracia con cupo de Entry; después se **borran** los assets y grupos creados
durante el período pagado (lo creado en Entry se conserva). Todo personaje que deba durar se sube en Entry o se
renueva antes de vencer.

El KYC no levanta el filtro de rostros: sólo habilita el plan. La re-prueba del 2026-10-17 con el cuadro de Antonio
(GPT Image) se rechazó con `InputImageSensitiveContentDetected.PrivacyInformation` (requestId
`021792214360538f9cb936a41ab283113693068986f31c344e0f1`, sin tarea ni cobro).

## 2. Cuánto alcanza

El cupo que manda son los **50 assets**, no los 50 grupos. Con **2 imágenes por personaje** (cuerpo entero frontal y
primer plano frontal neutro, la recomendación del fabricante) caben **25 personajes**. Con 3, caben 16.

Borrar un asset es irreversible y la documentación recomienda borrar lo que no se usa (`LastInferenceTime`); no dice
explícitamente que libere cupo. No se puede reemplazar el archivo de un asset: sólo cambiarle el nombre. Corregir una
imagen = borrar y subir otra.

## 3. Reglas de asignación

1. **Ningún personaje se sube sin decisión explícita del operador** y su fila en §4. Primero la fila, después la subida.
2. **Prioridad: personajes recurrentes de marca.** Nexa (rostro humano fotorrealista, el más realista del elenco) y el
   elenco ficticio de Efeonce: Hum, Karo, Sophia, Isabella y Antonio ([elenco](../brand-photography/EFEONCE_BRAND_CAST_V1.md)).
3. **Personajes de cliente o de una sola pieza, sólo si recurren.** Si no, sus planos con rostro van por una vía sin
   cupo: generarlos nativamente con **Seedream 5.0 texto-a-imagen** en esta cuenta (salida confiable por 30 días, sin
   editar) o producirlos en Higgsfield.
4. **Julio** (persona real) va por la biblioteca de retratos **reales** (QR, verificación en vivo con su propia cuenta,
   consentimiento). Descuenta del mismo cupo. Nunca por la virtual.
5. **Un retrato virtual no puede parecerse a ninguna persona real.** Es parte de la carta de compromiso firmada.
6. **Prohibido «lavar» un cuadro con rostro** pasándolo por Seedream (edición o imagen-a-imagen) para que cuente como
   salida confiable. La confianza oficial cubre sólo Seedream 5.0 **texto-a-imagen** y salidas de Seedance, originales.
7. **Los personajes prediseñados de BytePlus** sólo sirven para probar el modelo y uso interno: nunca en piezas de
   cliente.

## 4. Cupos usados

Usados: **12 de 50 assets · 6 de 50 grupos**.

| # | Personaje | Tipo (elenco/cliente/real) | Asset group | Asset id(s) | Assets | Estado | Evidencia | Fecha | Aprobó |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Antonio | elenco virtual | `Antonio — elenco Efeonce` · `group-20261017163741-plssb` | Rostro: `asset-20261017163742-t66nd` (`antonio-1-rostro.png`); cuerpo: `asset-20261017164311-42bch` (`antonio-2-cuerpo.png`) | 2 | Ambos: `warehoused` (literal de consola), sin error de carga. La UI no muestra el literal `Active`; uso por inferencia sin validar: ambas pruebas rechazadas con HTTP 400 `InvalidParameter` (§7) | `ai-generations/2026-10-17_byteplus-retratos-elenco/` (prompts, logs, intermedias y `SUBIR/SHA256SUMS`); origen `_identidad-elenco/antonio/`, selección `antonio-elegida.png` v3a; captura `pruebas-antonio/antonio-consola.jpg` | 2026-10-17 | Julio |
| 2 | Nexa | elenco virtual | `Nexa — Efeonce` · `group-20261017164814-5zvxt` | Rostro: `asset-20261017164815-fxjrl` (`nexa-1-rostro.png`); cuerpo: `asset-20261017164949-jrtdr` (`nexa-2-cuerpo.png`) | 2 | Ambos `warehoused`, sin error en consola; API `Active` no verificado | `ai-generations/2026-10-17_byteplus-retratos-elenco/` (fuentes, prompts, logs, intermedias y `SUBIR/SHA256SUMS`) | 2026-10-17 | Julio |
| 3 | Hum | elenco virtual | `Hum — elenco Efeonce` · `group-20261017165042-vpj42` | Rostro: `asset-20261017165043-v7vzs` (`hum-1-rostro.png`); cuerpo: `asset-20261017165146-7p22d` (`hum-2-cuerpo.png`) | 2 | Ambos `warehoused`, sin error en consola; API `Active` no verificado | `ai-generations/2026-10-17_byteplus-retratos-elenco/` (fuentes, prompts, logs, intermedias y `SUBIR/SHA256SUMS`) | 2026-10-17 | Julio |
| 4 | Isabella | elenco virtual | `Isabella — elenco Efeonce` · `group-20261017165249-zj7gv` | Rostro: `asset-20261017165250-xfvwb` (`isabella-1-rostro.png`); cuerpo: `asset-20261017165355-2l59r` (`isabella-2-cuerpo.png`) | 2 | Ambos `warehoused`, sin error en consola; API `Active` no verificado | `ai-generations/2026-10-17_byteplus-retratos-elenco/` (fuentes, prompts, logs, intermedias y `SUBIR/SHA256SUMS`) | 2026-10-17 | Julio |
| 5 | Karo | elenco virtual | `Karo — elenco Efeonce` · `group-20261017165458-zqhpz` | Rostro: `asset-20261017165458-kc6kj` (`karo-1-rostro.png`); cuerpo: `asset-20261017165600-rqqgj` (`karo-2-cuerpo.png`) | 2 | Ambos `warehoused`, sin error en consola; API `Active` no verificado | `ai-generations/2026-10-17_byteplus-retratos-elenco/` (fuentes, prompts, logs, intermedias y `SUBIR/SHA256SUMS`) | 2026-10-17 | Julio |
| 6 | Sophia | elenco virtual | `Sophia — elenco Efeonce` · `group-20261017165708-vln4l` | Rostro: `asset-20261017165709-knb82` (`sophia-1-rostro.png`); cuerpo: `asset-20261017165815-bnrr2` (`sophia-2-cuerpo.png`) | 2 | Ambos `warehoused`, sin error en consola; API `Active` no verificado | `ai-generations/2026-10-17_byteplus-retratos-elenco/` (fuentes, prompts, logs, intermedias y `SUBIR/SHA256SUMS`) | 2026-10-17 | Julio |

### Autorización y carga completada (2026-10-17)

Aprobada por el operador el 2026-10-17 («súbelo»): **Antonio, Nexa, Hum, Isabella, Karo y Sophia**, 2 imágenes cada
uno = **12 assets en 6 grupos**. Paquete listo con QA y checksums en
`ai-generations/2026-10-17_byteplus-retratos-elenco/SUBIR/` (ver su `LEEME.md`). Orden: Antonio solo primero, borrador
de prueba y verificación del contador; después el resto. La tabla conserva el estado literal observado en consola.

**Primera carga:** Antonio consumió 2 assets y 1 grupo; las pruebas de referencia y primer cuadro fallaron (§7).
Se detuvo inicialmente la cola por la condición del operador.

**Instrucción posterior del operador (2026-10-17):** «Subelas». Autoriza continuar con Nexa, Hum, Isabella, Karo y
Sophia aunque la prueba 3a haya fallado. Se cargaron en ese orden, dos PNG originales del paquete `SUBIR/` por
personaje y un grupo por personaje, con los nombres exactos del LEEME. No se volvió a cargar Antonio.

**Readback final de consola:** **12/50 assets y 6/50 grupos usados**, **38 assets y 44 grupos disponibles**
(actualizado 2026-10-17 05:58:18, zona no indicada por la UI). Esta continuación consumió **10 assets y 5 grupos**;
el total desde el inicio de la tarea es **12 assets y 6 grupos**. Los doce archivos muestran `warehoused` sin error
en la consola. En ese cierre no se verificó por API el literal `Active` ni se repitieron las pruebas de generación;
la repetición posterior está registrada en §7.

**Plan y firma:** Entry gratuito, sin compra ni cambio de plan. No apareció una nueva carta de compromiso durante
estas cargas y no se aceptó ninguna; si aparece más adelante, la firma sigue reservada a Julio.

**Evidencia de cierre:** `ai-generations/2026-10-17_byteplus-retratos-elenco/pruebas-antonio/elenco-grupos-final.jpg`
(seis grupos y nombres) y `elenco-cupo-final.jpg` en la misma carpeta (12/50 assets, 6/50 grupos y plan gratuito).

## 5. Evidencia obligatoria (carta de compromiso)

Al subir retratos virtuales, Efeonce declara que el personaje es original, que hizo una selección y modificación
creativa **sustancial** si usó IA, y que puede mostrar en cualquier momento:

- archivos fuente del proceso (proyectos, fichas, imágenes intermedias);
- capturas o grabaciones del proceso;
- licencias o cesiones, si aplican;
- registros de uso de la herramienta de IA (prompts, logs de generación).

Antes de subir un personaje, su carpeta de evidencia (ficha, prompts, logs de `pnpm ai:image`/`pnpm foto:generar`,
intermedias y la imagen final) queda en un lugar durable y se anota en la columna «Evidencia».

## 6. Procedimiento para subir un personaje

1. **Decisión y fila.** El operador aprueba el personaje; se agrega su fila en §4.
2. **Evidencia** reunida según §5.
3. **Consola:** Model Playground → My assets → Virtual Portrait → Manage assets → un grupo por personaje. La primera vez
   se firma la carta de compromiso. (Por API exige AK/SK y URL pública; no está implementado.)
4. **Imágenes:** jpeg/png/webp, entre 300 y 6000 px por lado, proporción entre 0,4 y 2,5, menos de 30 MB. Cuerpo
   entero vertical frontal y primer plano vertical frontal, sin expresión, con la cara cerca de 2/3 del encuadre.
5. **Esperar `Active`** (`Processing` → `Active` o `Failed`). No hay plazo garantizado de revisión.
6. **Anotar la fila:** grupo, id de cada asset (`asset-…`), cantidad, estado, fecha.
7. **Probar con un borrador 480p.** El uso documentado es como **imagen de referencia**; en el prompt se nombra
   «Image 1», nunca el id:

   ```bash
   pnpm ai:byteplus --model seedance25 --draft --references --image asset://<asset-id> --prompt-file toma.txt --duration 4 --out borrador.mp4 --yes
   ```

   Como primer cuadro (`--image` sin `--references`) no está documentado: probarlo antes de planificar con él.

## 7. Pruebas de Antonio — 2026-10-17

### Primera ejecución — 08:44 UTC

**Resultado: no funcionó como referencia ni como primer cuadro.** Los dos intentos terminaron con HTTP 400
`InvalidParameter`, código de salida 1 y sin archivo de video. No se obtuvo id de tarea ni `receipt.json` en ninguno.
El error registrado por la CLI no identifica qué parámetro rechazó el proveedor; no permite atribuirlo al estado del
asset, al modelo ni al tipo de entrada. No se reintentó ni se volvió a subir ningún archivo. El cobro real no se verificó.

Se utilizó `seedance25`, `--draft`, `--resolution 480p`, `--duration 4` y la toma de
`ai-generations/2026-10-16_byteplus-anuncio-para-cuando/v2-gpt/byteplus-draft/s07-prompt.txt`, conservada íntegra
con una instrucción de identidad al principio. La variante de referencias nombra **Image 1** (rostro) e **Image 2**
(cuerpo); la variante de primer cuadro nombra **Image 1** (rostro). Ningún prompt contiene ids de assets.

| Prueba | Entrada | Inicio–fin (UTC) | Resultado | Request id | Evidencia local |
|---|---|---|---|---|---|
| Referencias (paso 3a) | `--references`, rostro y cuerpo mediante `asset://` | 2026-10-17 08:44:40–08:44:43 | HTTP 400 `InvalidParameter`; sin `antonio-ref.mp4` | `02179222668293607b4b942199433a510c68da6d01b36ec9b5e92` | `pruebas-antonio/referencia/`: `s07-prompt.txt`, `ejecucion.log`, `resultado.json` |
| Primer cuadro (paso 3b) | Sin `--references`, sólo rostro mediante `asset://` | 2026-10-17 08:44:43–08:44:46 | HTTP 400 `InvalidParameter`; sin `antonio-primer-cuadro.mp4` | `021792226686060023ef2751affb9822ae18449966cb6b910d437` | `pruebas-antonio/primer-cuadro/`: `s07-prompt.txt`, `ejecucion.log`, `resultado.json` |

Las rutas de evidencia son relativas a `ai-generations/2026-10-17_byteplus-retratos-elenco/`. Cada `resultado.json`
conserva el comando exacto, las fechas UTC, el código de salida y la comprobación de existencia del video. El log
conserva el error. La estimación previa del intento con referencias fue **USD 0,4112**, no un cobro confirmado;
para primer cuadro la CLI indicó precio variable sin cota calculable.

**Cierre de la primera etapa:** se habían cargado sólo los dos PNG de Antonio y la cola quedó detenida por el
fallo de referencia. La instrucción posterior «Subelas» autorizó completar los cinco personajes restantes; su
carga y el cupo final están en §4. Los checksums de los doce PNG del paquete `SUBIR/` se verificaron antes de
cada etapa. No se afirma estado API `Active` ni compatibilidad por el solo estado visual `warehoused`.

### Repetición autorizada tras activación reportada del Asset Service — 09:05–09:06 UTC

**Resultado: ambas pruebas volvieron a fallar, sin video.** Julio transmitió la indicación de Claude de que ya había
activado el Asset Service y pidió repetir los mismos comandos. Se ejecutó una vez cada comando conservado en
`resultado.json`, sin cambiar modelo, prompt, ids, roles, duración (4 s), resolución (480p), modo draft ni rutas de
salida. Las ejecuciones anteriores y sus errores se conservaron.

| Prueba | Inicio–fin (UTC, 2026-10-17) | Resultado | Request id |
|---|---|---|---|
| Referencias (paso 3a) | 09:05:55–09:05:57 | HTTP 400 `InvalidParameter` en `content[1].image_url.url`; salida 1; sin `antonio-ref.mp4` | `02179222795750111300f35b2a874e35aceb4d35afb57b8f9aa5d` |
| Primer cuadro (paso 3b) | 09:05:57–09:06:01 | HTTP 400 `InvalidParameter` en `content[1].image_url.url`; salida 1; sin `antonio-primer-cuadro.mp4` | `02179222796077630d072d337ea6fcc7bbfbe2f0c485be2873587` |

**Diagnóstico devuelto:** en ambos rechazos, la CLI clasificó el mensaje del proveedor como
`asset_service_not_activated` y explicó que los `asset://` requieren activar Asset Service en ModelArk, región
`ap-southeast-1`. Se comprobó en el código vigente que esa clasificación exige que el mensaje del proveedor
contenga `not activated the Asset Service`; no es una deducción a partir de cualquier HTTP 400.
Por tanto, **la activación reportada aún no quedó validada para la cuenta utilizada por estas llamadas**. No se
verificó si existe una diferencia de cuenta, región o propagación de la activación. La repetición no demuestra uso
válido de estos assets como referencias ni como primer cuadro.

**Evidencia:** en cada carpeta `pruebas-antonio/referencia/` y `pruebas-antonio/primer-cuadro/` quedaron
`ejecucion-reintento-asset-service.log` y `resultado-reintento-asset-service.json` (comando exacto, fechas UTC,
salida 1 y `videoExists: false`), junto al prompt y los registros originales. No se obtuvo id de tarea ni recibo
en estos intentos. La estimación de referencias volvió a ser USD 0,4112; primer cuadro indicó precio variable.
El cobro real no se verificó. No hubo reintentos automáticos adicionales ni subidas.

**Karo y Sophia:** ya estaban cargadas antes de esta nueva instrucción, por el «Subelas» previo de Julio (§4).
Durante esta repetición no se volvió a subir ninguno de sus archivos ni se modificó la biblioteca o el plan.
