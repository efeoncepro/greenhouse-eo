# KSB Chile — anexo económico (06/11/2026)

Emitido con el Cotizador V3: `compose quote` → `compose document` → plantilla A4, versión 2. Son **borradores** de
cotizaciones en revisión («Borrador · Sin validez comercial» en la portada): precios sin aprobar por Julio.

| PDF (`entrega/`) | Cotización | Honorarios netos | Mes | Con IVA |
| --- | --- | --- | --- | --- |
| `KSB-anexo-economico-1-nivel-minimo.pdf` | `../pricing/base-performance.v5` | $30.720.000 | $2.560.000 | $36.556.800 |
| `KSB-anexo-economico-2-esencial-pauta-y-leads.pdf` | `../pricing/ese-performance.v3` | $59.880.000 | $4.990.000 | $71.257.200 |
| `KSB-anexo-economico-3-esencial-contenidos-y-redes.pdf` | `../pricing/ese-creative.v2` | $35.760.000 | $2.980.000 | $42.554.400 |

- **Esencial = documentos 2 + 3** ($95.640.000 netos, $7.970.000 al mes). El cotizador no emite un documento con dos
  cotizaciones ni con dos alternativas: cada uno es su propia cotización y su propio PDF.
- **Medios:** 40 UF/mes (mínimo recomendado en la FAQ V2) a UF 41.263,57 = $1.650.543, declarados `client_direct`:
  se imprimen fuera del total y no cambian el fee. Mínimo: Google y LinkedIn; Esencial: Google, LinkedIn y Meta.
- **IVA 19 %** (`tax:cl-iva-19`): las bases piden valores más IVA.
- **UF (Julio, 06/11: «mejor en UF, nos protege de la inflación»):** cláusula «Reajuste en UF»: los valores se fijan
  en UF al día de la oferta y cada factura se emite en pesos a la UF de su emisión. Los montos se imprimen en pesos
  porque el Cotizador V3 no emite en UF (CLF) y la plantilla v2 no convierte; imprimirlos en UF exige ese cambio en
  el cotizador. Referencia interna a UF 41.263,57: Mínimo ≈ 62,04 UF/mes; Esencial ≈ 120,93 + 72,22 = 193,15 UF/mes.
- **Supuestos del texto a confirmar por Julio:** factura mensual al cierre de cada mes; vigencia de 90 días; RUT de KSB 96.691.060-7 tomado de un directorio
  público (dígito verificador correcto, sin verificar en el SII).
- Fuentes: `briefs.py` (textos), `*.document-brief.json`, `*.datos-*.json` y las carpetas `pdf-uf-base-performance.v5`,
  `pdf-uf-ese-performance.v3` y `pdf-uf-ese-creative.v2` (PDF, HTML, manifiesto y capturas). Las demás carpetas `pdf*`
  son corridas anteriores (portada que no cabía o textos corregidos).
