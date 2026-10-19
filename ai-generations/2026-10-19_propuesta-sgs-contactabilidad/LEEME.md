# Propuesta técnica SGS Chile · Trazabilidad comercial

**Estado:** enviada a SGS el 19-10-2026 (correo de Julio, hilo «Minuta y próximos pasos | SGS + Efeonce»).
Caso, decisiones y pendientes: [`docs/commercial/prospects/sgs-chile-contactabilidad-2026/CONTINUIDAD.md`](../../docs/commercial/prospects/sgs-chile-contactabilidad-2026/CONTINUIDAD.md).

## Dónde está cada cosa

| Qué | Dónde |
| --- | --- |
| Canvas (Design, privado) | <https://claude.ai/artifact/2vcRRWEhgQ1cFZiu3QTZzv> · 33 láminas |
| PDF enviado | OneDrive `Alineación/4. Comercial/Licitaciones/SGS Chile/Efeonce-Propuesta-Tecnica-Trazabilidad-Comercial-SGS-Chile.pdf` (copia local en `entrega/`, sin versionar) |
| Enlace del correo | `https://hubs.ly/Q04BD_ds0` (archivo subido a HubSpot por Julio) |

## Cómo se arma

1. **Láminas de receta** (portada, solución, plan y contraportada): `build-intents.py` escribe `intents/`; desde la raíz
   del repo, `pnpm brand:compose -- --intent <intent> --out out/<id>` y se copia el PNG a `png/`. La portada pasa además
   por `quitar-seleccion-portada.mjs` y `quitar-pregunta-portada.mjs` (interino: la receta `cover-proposal` aún exige
   pregunta; una portada de propuesta para cliente no la lleva).
2. **Resto de láminas**: `python3 build-deck.py <dir-proyecto>` genera los `.dc.html` y `boards.json`, con las
   imágenes como `/_blob/<id>` de `blobs.json` (assets subidos al canvas).
3. **Revisión local**: `node render-shots.mjs <dir-proyecto> <salida> [archivos]` reemplaza cada blob por su archivo local.
4. **PDF**: `node export-pdf.mjs <dir-proyecto> <salida.pdf>` (una página 16:9 vectorial por lámina, `pdfunite`).
   **Escribir el PDF fuera de OneDrive y copiarlo después**: un PDF generado dentro de la carpeta sincronizada quedó
   `dataless` (solo en la nube) y HubSpot no pudo leerlo al subirlo.

Logos de terceros: `logos-cliente/FUENTES.md` (SGS desde sgs.com; Aircall desde su sala de prensa, uso por confirmar).
