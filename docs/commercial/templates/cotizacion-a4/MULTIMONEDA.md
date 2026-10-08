# Monedas y equivalencias del documento A4

Contrato documental local · 08/10/2026. El precio y la moneda aprobados se conservan en `currency` y `net`. `presentation` cambia la moneda del HTML/PDF, sin cambiar el precio fuente ni crear una Quote. Las versiones ya presentadas/firmadas se conservan.

## Precio nativo

```json
{
  "currency": "PEN",
  "locale": "es-PE",
  "net": "1200.50",
  "vatRate": null
}
```

Fragmento para integrar en el JSON completo del [ejemplo PEN](ejemplo-pen.json). CLP usa pesos enteros; USD/PEN usan dos decimales. Se admiten códigos ISO soportados por `Intl` en el Node instalado, sin convertirlos en una lista de monedas habilitadas en Greenhouse. Se muestran código y símbolo; PEN usa `S/`, separadores peruanos y dos decimales.

## Equivalencia desde el precio fuente

```json
{
  "currency": "USD",
  "net": "79200.00",
  "vatRate": null,
  "presentation": {
    "currency": "PEN",
    "locale": "es-PE",
    "fx": {
      "from": "USD",
      "to": "PEN",
      "rate": "3.437",
      "date": "2026-10-06",
      "source": "BCRPData · SBS venta · PD04640PD",
      "sourceUrl": "https://estadisticas.bcrp.gob.pe/estadisticas/series/diarias/resultados/PD04640PD/html",
      "purpose": "reference_conversion"
    }
  }
}
```

Este fragmento reproduce la equivalencia referencial preparada para Pibank; no constituye precio ni tasa por defecto de otro cliente. Investigar y registrar la fuente vigente para cada pedido. La tasa representa unidades destino por una unidad origen; no se infiere ni se invierte automáticamente. Fecha válida no posterior al documento, tasa positiva, par exacto, fuente y URL HTTPS sin credenciales son obligatorios. Guardar también la respuesta original y su hash cuando se consulte un proveedor.

`reference_conversion` muestra una equivalencia, dejando moneda/tasa contractual por acordar. `fixed_quote_conversion` declara una tasa fijada para esa versión documental y sólo debe usarse si el operador aprobó ese acuerdo. Cambiar `purpose` no acredita autorización. El HTML incluye fecha, fuente y enlace; el snapshot viaja en `datos.json` y el manifiesto. La generación es reproducible desde ese snapshot y no hace llamadas FX.

Editar también textos que mencionen moneda o cifras: el renderer no convierte automáticamente cantidades incrustadas en párrafos. El renderer detallado Pibank usa `{{money:4500}}` para precios convertibles y conserva en USD metas bancarias que no son precios de la oferta.

## Impuestos, precisión y redondeo

- `vatRate` es explícito e independiente de la moneda. `null` mantiene impuesto y total facturable pendientes; `0` declara una tasa cero confirmada. Nunca transformar desconocido en cero ni asignar IVA/IGV al elegir PEN.
- El neto fuente debe respetar la unidad menor ISO. Conversión e impuestos usan ratios decimales y BigInt; el redondeo es half-up a la precisión destino. Se rechazan importes fuera de la precisión segura de representación.
- El documento A4 calcula impuestos sobre el neto convertido. Las referencias mensuales dividen los importes totales de salida antes del redondeo de visualización; no son cuotas. En el renderer Pibank, promedios y hitos dividen el importe fuente antes de convertir/redondear, evitando convertir un promedio USD previamente redondeado.
- Sumar importes redondeados puede introducir diferencias respecto del total convertido. Revisar subtotales, hitos y calendarios en cada versión; documentar cualquier ajuste explícito. Pibank con la tasa registrada concilia sin ajuste.

## Entrega de dos monedas

Nombrar archivos con el código ISO: `Cotizacion-cliente-USD.pdf` y `Cotizacion-cliente-PEN.pdf`, con sus HTML correspondientes. Guardarlos juntos en la carpeta de cliente que autorizó el operador; conservar versiones, datos fuente, snapshot FX y manifiestos/QA en el expediente o respaldo separado. No sobrescribir una entrega distinta o presentada.

Verificar SHA-256 del origen y leer de nuevo cada destino. Registrar nombres/rutas y resultado en un manifiesto de entrega, conservando si fue auditada o no la sincronización remota. Copia local verificada no acredita sincronización, envío, aceptación, registro de Quote, cambios CRM o facturación. Al entregar también otra moneda desde un snapshot, inspeccionar el PDF completo y dejar claro si la tasa es referencial o contractual aprobada.

## Frontera y verificación

El helper [document-money.mjs](../../../../scripts/documents/document-money.mjs) sólo sirve a artefactos locales. No cambia `FinanceCurrency`, el registro de moneda, proveedores FX, catálogo, economics, tax rules, pricing engine o readiness runtime. La ampliación de esos dominios requiere su contrato y decisión propios. No se crean `quote_id`, `quotation_id`, aprobaciones, facturas ni sincronización CRM desde esta conversión.

```sh
node --test scripts/documents/document-money.test.mjs scripts/documents/render-cotizacion-a4.test.mjs
node scripts/documents/render-cotizacion-a4.mjs --data docs/commercial/templates/cotizacion-a4/ejemplo-pen.json --out .captures/cotizacion-a4-pen-nueva
```

Revisar todas las páginas del PDF final, extracción de texto, fuentes, moneda, importes y estado fiscal; verificar también CLP original y el ancho móvil. El [manual principal](README.md) conserva el flujo de autoría y las reglas de revisión/entrega.
