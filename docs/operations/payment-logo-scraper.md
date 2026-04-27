# Payment Logo Scraper

## Objetivo

`scripts/payment-logo-scraper.ts` busca logos SVG para el catalogo de instrumentos de pago, valida si son seguros y suficientemente confiables, y solo los guarda en `public/images/logos/payment` cuando se ejecuta con `--apply`.

El script esta pensado para humanos y agentes de IA:

- salida textual breve para operar en terminal
- reporte JSON auditable en `artifacts/payment-logo-scraper/report.json`
- modo plan por defecto, sin modificar assets
- modo apply explicito
- escritura idempotente: una corrida repetida no reescribe SVGs ni mueve timestamps del manifest si el asset y la metadata no cambiaron
- umbral de score y bloqueo cuando requiere revision humana
- manifest auditable en `public/images/logos/payment/manifest.json`

## Comandos

```bash
pnpm logos:payment:scrape -- --all
pnpm logos:payment:scrape -- --provider mastercard,visa
pnpm logos:payment:discover -- --provider previred
pnpm logos:payment:scrape -- --provider mastercard --variant full-positive,mark-positive --apply
pnpm logos:payment:scrape -- --provider mastercard --variant full-positive --ai-review
pnpm logos:payment:discover -- --provider banco-chile --variant full-positive
pnpm logos:payment:agent -- --provider banco-chile --variant full-positive --candidate-url https://.../logo.svg --candidate-source official --apply
```

Opciones utiles:

- `--min-score 80`: exige mas confianza antes de seleccionar.
- sin `--variant`: ejecuta la matriz completa `full-positive`, `full-negative`, `mark-positive`, `mark-negative`.
- `--variant full-positive,mark-positive`: limita la busqueda a logo completo positivo e isotipo positivo solo cuando se necesita una prueba estrecha.
- `--ai-review`: usa Gemini como segunda opinion sobre los mejores candidatos determinísticos.
- `--ai-required`: bloquea seleccion/apply si Gemini no aprueba o no esta disponible.
- `--ai-timeout-ms 25000`: limita cada revision Gemini para que el scraper no quede colgado.
- `--candidate-url https://.../logo.svg`: valida/aplica una URL explicita, sin descubrir candidatos.
- `--candidate-source official`: clasifica la fuente de `--candidate-url` (`official`, `wikimedia`, `simple-icons` o `direct-url`).
- `--review-html artifacts/payment-logo-agent/review.html`: genera una consola HTML local para revision humana.
- `--allow-review-required`: permite guardar aunque el candidato necesite revision humana.
- `--report artifacts/payment-logo-scraper/mastercard.json`: cambia el destino del reporte.
- `--output-dir public/images/logos/payment`: cambia la carpeta de salida.

## Workflow agentic V1

El flujo canonico es `discover -> review -> publish`:

1. `discover`: produce candidatos y una consola HTML, sin escribir assets. Por defecto debe correr la matriz completa de variantes; usa `--variant` solo para investigar una variante puntual.
   ```bash
   pnpm logos:payment:discover -- --provider bci,banco-chile --min-score 80
   ```
2. `review`: una persona o agente abre `artifacts/payment-logo-agent/review.html`, compara visualmente y copia el comando sugerido del candidato correcto.
3. `publish`: se aplica un candidato explicito con `--candidate-url`; no se repite la busqueda amplia.
   ```bash
   pnpm logos:payment:agent -- --provider banco-chile --variant full-positive --candidate-url https://.../logo.svg --candidate-source official --min-score 80 --apply
   ```

Este modelo evita que el scraper guarde por accidente un logo parecido pero incorrecto. La busqueda produce evidencia; la publicacion usa una URL exacta y auditable.

## Fuentes y scoring

El scraper usa `scripts/config/payment-logo-sources.json` como manifest de hints por marca:

- `simpleIconsSlug` para Simple Icons/CDN/GitHub.
- `searchTerms` para Wikimedia Commons.
- `officialSvgUrls` cuando exista un brand center oficial con URL SVG estable.
- `preferredFileBase` para nombrar el archivo final.
- `requiredBrandSignals` para exigir tokens concretos cuando una marca puede confundirse con otra.
- `blockedBrandSignals` para bloquear bancos/íconos parecidos que ya causaron falsos positivos.

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

Cuando el scraper corre con `--apply`, actualiza automaticamente la entrada del proveedor seleccionado con `sourceUrl`, `licenseSource`, `logo`, `compactLogo`, `lastVerifiedAt` y la variante especifica aplicada. `full-positive` es la fuente canonica del entry; `mark-positive` solo actualiza `compactLogo`; las variantes negativas y derivadas viven en `variants.*` para evitar que una corrida cambie metadata canonica en cada ejecucion.

Si una marca no publica isotipo SVG separado, una variante puede declararse como `curatedSvgPath` apuntando a un SVG local revisado y `curatedSourceUrl` apuntando a la fuente oficial usada para reconstruirlo. El scraper la valida como candidato local, la incluye en report/review y mantiene la idempotencia sin volver a buscar assets dudosos.

El estado funcional por instrumento se resume en `docs/operations/payment-logo-inventory.md`. Si un candidato se rechaza por marca incorrecta o porque falta una variante confiable, dejarlo como `Pending` en ese inventario en vez de forzar un asset dudoso.

La escritura es idempotente:

- si el SVG seleccionado ya existe con el mismo contenido, el archivo queda intacto
- si la variante del manifest ya apunta al mismo asset, fuente y licencia, conserva `lastVerifiedAt`
- `updatedAt` del manifest solo cambia cuando hay un cambio real en el manifest
- el reporte JSON de `artifacts/` puede cambiar por `generatedAt`, pero esa carpeta no se versiona

## Capa AI opcional

La validacion AI no reemplaza las reglas deterministicas. Gemini se usa como segunda opinion para revisar:

- si el SVG corresponde a la marca correcta
- si es logo completo o isotipo segun la variante pedida
- si parece version positiva o negativa
- si hay riesgo de logo historico, co-brand, baja calidad o mala aplicacion visual

El runtime usa Vertex AI Gemini con:

- `PAYMENT_LOGO_AI_MODEL` si existe, aceptando una lista separada por comas
- fallback `GREENHOUSE_AGENT_MODEL`, tambien aceptando lista separada por comas
- fallback final escalonado: `gemini-3-flash-preview`, `gemini-2.5-pro`, `gemini-2.5-flash`, `google/gemini-2.5-flash@default`

`gemini-3-flash-preview` se intenta primero por mejor razonamiento visual/semantico para distinguir marcas parecidas. Si una region, cuota o proyecto no lo soporta, el scraper baja automaticamente al siguiente modelo disponible. Para fijar una politica por ambiente:

```bash
PAYMENT_LOGO_AI_MODEL=gemini-3-flash-preview,gemini-2.5-pro,gemini-2.5-flash
```

Gemini 3 Flash Preview usa endpoint `global` en Vertex AI. El scraper lo enruta automaticamente a `location=global`; los modelos no-Gemini-3 usan `GOOGLE_CLOUD_LOCATION` o `us-central1`.

Cuando `--ai-review` esta activo, el scraper renderiza el SVG candidato a PNG con `sharp` y manda esa imagen a Gemini como evidencia visual primaria. El excerpt SVG queda solo como contexto tecnico. Esto evita que el LLM juzgue calidad de bordes, proporcion o legibilidad leyendo XML.

El scraper sigue funcionando sin AI. Usa `--ai-required` solo cuando quieras bloquear cualquier candidato sin aprobacion LLM.

El scoring favorece:

- fuente oficial
- Simple Icons o Wikimedia cuando hay trazabilidad
- HTTPS
- coincidencia de marca en URL/titulo
- senales de actualidad como `current`, `official`, año actual/anterior o `last-modified`
- SVG pequeno, sin scripts, sin `foreignObject`, sin event handlers y sin referencias externas
- paginas oficiales declaradas en `officialPages`, siempre que el SVG extraido tenga senal distintiva de marca en ruta/titulo

## Regla de seguridad

El script rechaza SVGs con:

- `<script>`
- `<foreignObject>`
- event handlers inline como `onclick`
- `href/src` externos o `data:`
- payload mayor a 250 KB
- contenido que no sea SVG
- iconos de UI o redes sociales detectables por ruta/nombre (`whatsapp`, `chevron`, `close`, `menu`, etc.)

Para marcas locales que no viven en Simple Icons, preferir:

- `officialSvgUrls` cuando el sitio de la marca publica una URL SVG estable
- `officialPages` solo como descubrimiento asistido; no debe aceptar iconos genericos de la pagina
- Wikimedia como fallback auditable, con revision humana o AI si no hay senal de actualidad

## Variantes faltantes y generacion asistida

No se debe inventar un logo de marca desde memoria del modelo. Si faltan negativo o isotipo:

1. partir de un SVG oficial verificado de la misma marca
2. derivar la variante con transformacion vectorial auditable cuando sea mecanica (por ejemplo, full positivo oficial a full negativo blanco)
3. usar modelos de imagen en Vertex, como Nano Banana/Gemini image, solo como apoyo de normalizacion o revision visual, no como fuente primaria de identidad
4. mantener salida SVG versionable; cualquier raster generado queda fuera del flujo final salvo aprobacion humana explicita
5. registrar en el manifest `sourceUrl`, `licenseSource`, variante derivada y `lastVerifiedAt`

### Vectorizacion de PNGs curados

Si una marca entrega un PNG transparente de alta resolucion y no publica SVG usable, usar la herramienta local basada en VTracer:

```bash
python3 -m pip install --user vtracer Pillow
pnpm logos:payment:vectorize -- --input public/images/logos/payment/que-es-global66-que-ofrece.png --output public/images/logos/payment/global66.svg --variant full-positive --label Global66 --brand-clean global66
```

La herramienta:

- detecta el bbox por alpha y recorta `full-*` o `mark-*`
- vectoriza con VTracer en modo color/spline
- inyecta `viewBox` estable para render responsive
- puede aplicar limpieza de marca antes de trazar (`--brand-clean global66`) para eliminar antialiasing sucio y bordes mordidos
- para marcas con geometria simple y fuente raster oficial, puede usar limpieza deterministica por marca (`--brand-clean previred`) y emitir primitivas SVG limpias cuando VTracer seguiria ruido de borde
- no embebe PNG dentro del SVG final

Despues de vectorizar, correr:

```bash
pnpm logos:payment:discover -- --provider global66 --min-score 80 --ai-review
pnpm logos:payment:publish -- --provider global66 --min-score 80
```

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
