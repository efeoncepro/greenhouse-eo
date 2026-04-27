# Payment Logo Scraper

## Objetivo

`scripts/payment-logo-scraper.ts` busca logos SVG para el catalogo de instrumentos de pago, valida si son seguros y suficientemente confiables, y solo los guarda en `public/images/logos/payment` cuando se ejecuta con `--apply`.

El script esta pensado para humanos y agentes de IA:

- salida textual breve para operar en terminal
- reporte JSON auditable en `artifacts/payment-logo-scraper/report.json`
- modo plan por defecto, sin modificar assets
- modo apply explicito
- umbral de score y bloqueo cuando requiere revision humana
- manifest auditable en `public/images/logos/payment/manifest.json`

## Comandos

```bash
pnpm logos:payment:scrape -- --all
pnpm logos:payment:scrape -- --provider mastercard,visa
pnpm logos:payment:scrape -- --provider mastercard --variant full-positive,mark-positive --apply
pnpm logos:payment:scrape -- --provider mastercard --variant full-positive --ai-review
```

Opciones utiles:

- `--min-score 80`: exige mas confianza antes de seleccionar.
- `--variant full-positive,mark-positive`: limita la busqueda a logo completo positivo e isotipo positivo.
- `--ai-review`: usa Gemini como segunda opinion sobre los mejores candidatos determinísticos.
- `--ai-required`: bloquea seleccion/apply si Gemini no aprueba o no esta disponible.
- `--ai-timeout-ms 25000`: limita cada revision Gemini para que el scraper no quede colgado.
- `--allow-review-required`: permite guardar aunque el candidato necesite revision humana.
- `--report artifacts/payment-logo-scraper/mastercard.json`: cambia el destino del reporte.
- `--output-dir public/images/logos/payment`: cambia la carpeta de salida.

## Fuentes y scoring

El scraper usa `scripts/config/payment-logo-sources.json` como manifest de hints por marca:

- `simpleIconsSlug` para Simple Icons/CDN/GitHub.
- `searchTerms` para Wikimedia Commons.
- `officialSvgUrls` cuando exista un brand center oficial con URL SVG estable.
- `preferredFileBase` para nombrar el archivo final.

El inventario auditable vive en `public/images/logos/payment/manifest.json`. Cada entrada mantiene:

- `slug`
- `brandName`
- `category`
- `country`
- `sourceUrl`
- `licenseSource`
- `logo`
- `compactLogo`
- `lastVerifiedAt`
- `variants.full-positive`
- `variants.full-negative`
- `variants.mark-positive`
- `variants.mark-negative`

Cuando el scraper corre con `--apply`, actualiza automaticamente la entrada del proveedor seleccionado con `sourceUrl`, `licenseSource`, `logo`, `compactLogo`, `lastVerifiedAt` y la variante especifica aplicada.

## Capa AI opcional

La validacion AI no reemplaza las reglas deterministicas. Gemini se usa como segunda opinion para revisar:

- si el SVG corresponde a la marca correcta
- si es logo completo o isotipo segun la variante pedida
- si parece version positiva o negativa
- si hay riesgo de logo historico, co-brand, baja calidad o mala aplicacion visual

El runtime usa Vertex AI Gemini con:

- `PAYMENT_LOGO_AI_MODEL` si existe
- fallback `GREENHOUSE_AGENT_MODEL`
- fallback final `google/gemini-2.5-flash@default`

El scraper sigue funcionando sin AI. Usa `--ai-required` solo cuando quieras bloquear cualquier candidato sin aprobacion LLM.

El scoring favorece:

- fuente oficial
- Simple Icons o Wikimedia cuando hay trazabilidad
- HTTPS
- coincidencia de marca en URL/titulo
- senales de actualidad como `current`, `official`, año actual/anterior o `last-modified`
- SVG pequeno, sin scripts, sin `foreignObject`, sin event handlers y sin referencias externas

## Regla de seguridad

El script rechaza SVGs con:

- `<script>`
- `<foreignObject>`
- event handlers inline como `onclick`
- `href/src` externos o `data:`
- payload mayor a 250 KB
- contenido que no sea SVG

## Regla de actualidad

El scraper no declara automaticamente que un logo no oficial sea el mas actual si no hay senales de frescura. En ese caso marca el candidato como `reviewRequired` y no lo guarda salvo que se use `--allow-review-required`.

Para cerrar una marca con confianza alta, agrega una URL oficial al manifest:

```json
{
  "providers": {
    "mastercard": {
      "officialSvgUrls": ["https://.../mastercard-logo.svg"]
    }
  }
}
```

## Flujo recomendado

1. Ejecutar `pnpm logos:payment:scrape -- --provider <slug>`.
2. Revisar `artifacts/payment-logo-scraper/report.json`.
3. Confirmar visualmente el candidato contra brand center o sitio oficial.
4. Si el candidato es confiable, ejecutar con `--apply`.
5. Revisar diff de assets, `public/images/logos/payment/manifest.json` y `src/config/payment-instruments.ts` si cambia el nombre final.
6. Validar `npx tsc --noEmit --pretty false`.
