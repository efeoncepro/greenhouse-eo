# Ledger de cupos — biblioteca de retratos virtuales BytePlus — V1

> **Tipo de documento:** Ledger operativo (SSOT de cupos)
> **Version:** 1.0
> **Creado:** 2026-10-17 por Claude (decisiones del operador)
> **Ultima actualizacion:** 2026-10-17 por Claude
> **Documentacion relacionada:** [Manual BytePlus directo](../../manual-de-uso/creative-studio/byteplus-directo.md) (§Rostros humanos reales) · [ADR BytePlus directo](../../architecture/creative-studio/EFEONCE_BYTEPLUS_DIRECT_MEDIA_CLI_DECISION_V1.md) · [Elenco de marca](../brand-photography/EFEONCE_BRAND_CAST_V1.md) · [Guía de retratos virtuales del fabricante](https://docs.byteplus.com/en/docs/ModelArk/2333565)

Seedance 2.x rechaza imágenes de entrada con rostros humanos fotorrealistas que no vengan de una vía de confianza.
La biblioteca privada de retratos virtuales es la vía para personajes ficticios propios. Sus cupos son escasos:
este ledger es la única fuente de qué se subió, por qué y quién lo aprobó.

## 1. Estado del plan

| Dato | Valor |
|---|---|
| KYC de organización | Enviado 2026-10-16; aprobado 2026-10-17 |
| Advanced Creation Rights | Activado 2026-10-17 en el plan gratuito (Free) |
| Cupos del plan Free | **50 avatares** |
| Usados | **0 de 50** |
| Tier siguiente | Alrededor de USD 1.600 (dato del operador). **Verificar en la consola antes de citarlo como precio vigente** |

**Decisión del operador (2026-10-17):** el tier pagado se evalúa sólo cuando la herramienta de producción (runtime)
esté armada. Hasta entonces se opera sólo con los 50 cupos gratuitos.

El KYC solo no levanta el filtro de rostros: la re-prueba del 2026-10-17 con el mismo cuadro fotorrealista de Antonio
(GPT Image) volvió a rechazarse con `InputImageSensitiveContentDetected.PrivacyInformation` (requestId
`021792214360538f9cb936a41ab283113693068986f31c344e0f1`, sin tarea ni cobro).

## 2. Qué cuenta como cupo [pendiente]

Sin verificar: si un «avatar» equivale a **una imagen** (asset) o a **un personaje** (grupo). La guía del fabricante
recomienda 2 imágenes por personaje (cuerpo entero frontal + primer plano frontal neutro). Si cada imagen cuenta,
50 cupos = **25 personajes**.

Se verifica en la consola con el **primer** personaje, antes de subir el resto. El resultado se anota acá y se
actualiza el total de §1.

## 3. Reglas de asignación

1. **Ningún personaje se sube sin decisión explícita del operador** y su fila en §4. Primero la fila, después la subida.
2. **Prioridad: personajes recurrentes de marca**, el elenco ficticio de Efeonce: Hum, Karo, Sophia, Isabella y Antonio
   ([elenco](../brand-photography/EFEONCE_BRAND_CAST_V1.md)).
3. **Personajes de cliente o de una sola pieza, sólo si recurren.** Si no, sus planos con rostro van por Higgsfield
   u otra vía antes de gastar un cupo.
4. **Nexa** es mascota no humana: probablemente no necesita cupo (el filtro apunta a rostros humanos fotorrealistas).
   Se verifica con un borrador antes de reservarle uno.
5. **Julio** (persona real) va por la biblioteca de retratos **reales** (verificación en vivo + consentimiento),
   nunca por la virtual.
6. **Prohibido «lavar» un cuadro con rostro** pasándolo por Seedream para que cuente como salida confiable. La vía de
   salidas confiables es generar el cuadro nativamente en Seedream/Seedance de la misma cuenta, no reprocesar una
   imagen externa para esquivar el filtro.

## 4. Cupos usados

Usados: **0 de 50**.

| # | Personaje | Tipo (elenco/cliente/otro) | Asset group | Asset id(s) | Imágenes | Estado | Fecha | Aprobó |
|---|---|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — | — | — |

## 5. Procedimiento para subir un personaje

1. **Decisión y fila.** El operador aprueba el personaje; se agrega su fila en §4 antes de subir.
2. **Consola:** Model Playground → My assets → Virtual Portrait → Manage assets. Se crea un grupo por personaje.
   La primera vez se firma la carta de autorización.
3. **Imágenes:** cuerpo entero frontal y primer plano frontal neutro, de 300 a 6000 px y menos de 30 MB cada una.
4. **Esperar `Active`.** BytePlus revisa cada asset. Mientras tanto la fila queda en revisión.
5. **Anotar la fila:** asset group, asset id(s), número de imágenes, estado y fecha. Con el primer personaje, resolver
   también §2.
6. **Probar con un borrador 480p** antes de cualquier final:

   ```bash
   pnpm ai:byteplus --model seedance25 --draft --image asset://<id> --prompt-file toma.txt --duration 4 --out borrador.mp4 --yes
   ```

La gestión de assets por API exige AK/SK y no está implementada: se suben por consola. El uso en la CLI
(`--image asset://<id>`) ya existe (commit `25b81dd78`).
