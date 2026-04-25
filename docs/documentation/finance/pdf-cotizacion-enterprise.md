# PDF de Cotización — Documento Enterprise

> **Tipo de documento:** Documentación funcional (lenguaje simple)
> **Versión:** 1.0
> **Creado:** 2026-04-24 por Julio + Claude
> **Última actualización:** 2026-04-24 por Julio + Claude
> **Documentación técnica:** [TASK-629](../../tasks/complete/TASK-629-pdf-cotizacion-enterprise-redesign.md) · [RESEARCH-005 v1.5](../../research/RESEARCH-005-cpq-gap-analysis-and-hardening-plan.md)

## Qué es

Greenhouse genera un PDF profesional cada vez que se solicita la descarga o vista de una cotización. El documento se adapta automáticamente al tamaño y tipo de propuesta — desde 2 páginas para una venta simple hasta 7-8 páginas para un contrato enterprise — sin que el sales rep tenga que elegir un template manualmente.

## Por qué cambió

El PDF anterior era genérico: "Efeonce" en texto plano como logo, color azul que no era el canon, sin información del emisor (RUT, dirección), sin sub-brand identification (Globe / Wave / Reach), sin signatures, sin QR de verificación. El rediseño TASK-629 lo lleva a estándar enterprise comparable a Salesforce CPQ, con identidad de marca completa.

## Cómo funciona

El PDF se compone de **8 secciones**, de las cuales 5 siempre aparecen y 3 se activan automáticamente cuando el quote tiene la información o cumple el threshold:

| Sección | Aparece... |
|---|---|
| **Cover** (página 1) | Siempre |
| **Executive Summary** | Si `description ≥ 200 caracteres` O total > $50M CLP O tag `enterprise` |
| **About Efeonce** | Si total > $50M CLP O tag `enterprise` |
| **Scope of Work** | Siempre |
| **Commercial Proposal** (tabla detalle) | Siempre |
| **Investment Timeline** | Si hay milestones definidos |
| **Terms & Conditions** | Siempre |
| **Signatures + QR** | Siempre |

### Lo que ve el cliente

#### Cover (página 1)

- Logo Efeonce real + isotipo del sub-brand (Globe / Wave / Reach) según el business line del quote
- Quote ID + versión
- Título grande "Propuesta Comercial" + subtítulo descriptivo
- Bloques "Preparada para" (cliente) + "Preparada por" (sales rep con email + teléfono)
- Stripe de highlights: Inversión total · Inicio estimado · Equipo asignado
- Validity callout: "Válida hasta DD/MM/YYYY"
- Footer con datos legales del emisor (Efeonce Group SpA · RUT 77.357.182-1 · dirección)

#### Executive Summary (condicional)

Para propuestas grandes o con descripción extensa: resumen ejecutivo + pillars estratégicos + KPIs (inversión, duración, equipo, países).

#### About Efeonce (condicional)

Para propuestas enterprise: 4 brand cards (Globe / Wave / Reach / Efeonce) con la sub-brand activa marcada + stats (años, profesionales, países, marcas activas).

#### Scope of Work

Cada line item agrupado con descripción rich HTML (cuando el producto en el catálogo la tiene) + lista de componentes (roles + tools).

#### Commercial Proposal

Tabla detallada con cantidades, unidades, precios unitarios, subtotales. Resumen lateral: Subtotal neto / IVA / Total. Footer FX cuando aplica conversión multi-moneda.

#### Investment Timeline (condicional)

Cuando el quote tiene milestones de pago: timeline visual con fechas + nombre del milestone + monto + métodos de pago aceptados.

#### Terms & Conditions

Términos comerciales numerados (los que el sales rep marcó como incluidos).

#### Signatures + QR

Dos bloques de firma (cliente + Efeonce) con líneas para firma física + campos para nombre, cargo, RUT, fecha. Bloque de verificación con QR escaneable que valida la autenticidad del documento online.

### Cómo se ve por tamaño de quote

- **Quote chica** (1-3 líneas, < $5M CLP, sin recurring): **2-3 páginas**
- **Quote estándar** (3-10 líneas, retainer o bundle, $5-50M CLP): **4-5 páginas**
- **Quote enterprise** (> 10 líneas, > $50M CLP, o tag enterprise): **6-7 páginas**

El threshold de $50M CLP es ajustable por configuración (`GREENHOUSE_PDF_ENTERPRISE_THRESHOLD_CLP`) sin necesidad de deploy.

## Verificación de autenticidad

Cada PDF emitido contiene un código QR en la página de firmas. El cliente puede escanearlo desde su celular sin necesidad de login y obtiene una página de verificación que muestra:

- Confirmación "Documento auténtico" o "Documento inválido"
- Datos del quote (número, versión, cliente, fecha emisión, validez, total, líneas)
- Si el documento fue alterado offline (el total cambió, las líneas cambiaron), el QR detecta la alteración mostrando "Documento inválido"

El QR se construye con un token HMAC-SHA256 que incluye un hash del contenido del PDF. La página pública recompute el hash desde la base de datos al validar.

## Branding aplicado

- **Color primario**: Navy `#023c70` (Efeonce Digital)
- **Accent**: Blue `#0375db`
- **Sub-brand colors**: Globe `#bb1954`, Wave `#00BAD1`, Reach `#ff6500`
- **Headings**: Poppins (500, 600, 700)
- **Body**: DM Sans (400, 500, 700)
- **Logos**: variantes PNG renderizadas desde los SVGs canónicos vía pipeline `sharp`

## Cómo se usa

**Para sales reps**: ningún cambio en la operación. La cotización se descarga igual que antes vía botón "Descargar PDF" en el detalle de quote o vía URL `/api/finance/quotes/[id]/pdf?download=1`. El sistema decide qué secciones renderizar.

**Para admins**: si quieres forzar el modo enterprise en una quote específica (ej. cliente VIP que no llega al threshold pero quiere el documento completo), el campo `quotation.tags` puede incluir `enterprise` o el campo `forceEnterpriseTemplate=true` se puede setear en la API.

**Para developers**: el sistema de tokens vive en `src/lib/finance/pdf/tokens.ts`. Cualquier cambio visual debe pasar por ahí — los componentes en `sections/` solo consumen tokens, nunca hardcodean colores ni fuentes.

> **Detalle técnico:** ver [TASK-629](../../tasks/complete/TASK-629-pdf-cotizacion-enterprise-redesign.md), [`src/lib/finance/pdf/`](../../../src/lib/finance/pdf/), y los mockups visuales de referencia en [`docs/research/mockups/`](../../research/mockups/).

## Configuración requerida

### Variable de entorno

`GREENHOUSE_QUOTE_VERIFICATION_SECRET` — string de 32+ caracteres usado para firmar los tokens del QR. Generar con:

```bash
openssl rand -hex 32
```

Configurar en Vercel:

```bash
vercel env add GREENHOUSE_QUOTE_VERIFICATION_SECRET production
```

**Sin esta variable el PDF se renderiza idéntico pero sin sección de QR** (degradación gracefully). Es necesaria para que la verificación pública funcione.

### Pipeline de assets

Cuando cambien los SVGs canónicos en `public/branding/SVG/`, re-ejecutar:

```bash
pnpm tsx scripts/build-pdf-brand-assets.ts
```

Esto regenera los PNGs en `public/branding/pdf/` que el PDF consume vía `<Image>`.

## Limitaciones actuales (gaps conocidos)

1. **Bundle grouping en Commercial Proposal**: los line items se renderizan en lista flat. Cuando TASK-620 agregue `bundle_id` a `quotation_line_items`, el PDF agrupará automáticamente.
2. **Rich HTML descriptions**: requieren que el producto en el catálogo tenga `description_rich_html` poblado. TASK-630 traerá un editor TipTap en admin UI para poblarlas masivamente.
3. **eSignature**: el PDF ya está listo para ser enviado a DocuSign con el endpoint `/public/quote/...` como signature URL. La integración llega con TASK-619.
