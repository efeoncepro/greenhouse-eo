# Producir una infografía editorial Efeonce

## Antes de diseñar

1. Cierra el copy y los claims de la sección.
2. Escribe en una frase qué comprensión nueva entregará la pieza.
3. Define qué no demuestra y qué fuente/as-of necesita.
4. Decide si es body, featured, OG o social; no mezcles esos contratos.
5. Completa `.codex/skills/content-marketing-studio/templates/editorial-infographic-contract.md`.

Si el delta sólo dice “resumir” o “decorar”, detente: no hace falta una infografía.

## Diseñar

1. Elige el arquetipo por la relación: mapa, circuito, escala, recorrido, cadena, comparación o dataviz.
2. Haz primero un wireframe monocromo y comprueba la ruta en tres segundos.
3. Para body Efeonce, reserva el footer desde el inicio.
4. Usa `public/branding/logo-full.svg` o `logo-negative.svg` y el sello
   `src/lib/artifact-composer/catalogs/deck-axis/assets/url-lum.svg`.
5. No pongas logo, URL o watermark arriba; no uses burbujas o fondos decorativos.
6. Produce mobile y dark como composiciones reales cuando el contrato sea art-directed/light-dark.

## Construir y verificar

1. Conserva source SVG editable y delivery SVG saneado por separado.
2. Contornea tipografía en delivery cuando necesites fidelidad portable.
3. Ejecuta:

```bash
pnpm content:editorial-svg:audit -- <delivery.svg...>
pnpm content:visual-manifest:lint -- <manifest.json>
```

4. Revisa al 100%: copy, puntuación, clipping, colisiones, conectores, fuente y footer.
5. Revisa columna desktop, mobile, light, dark y thumbnail del canal declarado.
6. Para SVG compara bytes raw/gzip/Brotli; no generes `@2x`.

## Integrar en WordPress

1. Sube el delivery por la Media Library gobernada.
2. Lee de vuelta ID, URL, MIME, dimensiones, bytes, ALT y caption.
3. Usa un `<picture>` sólo si hay art direction, con un único `<img src>` fallback.
4. Verifica GET `200`, `image/svg+xml`, carga real, variante correcta y cero overflow.
5. Mantén featured/OG como derivados raster con sus propios Media IDs.
6. El texto trazado del SVG no sustituye contenido HTML: alt, caption y párrafo cercano explican la tesis.
7. Mantén el post privado hasta la autorización humana.

## Cierre

Registra source, delivery, hashes, variante, Media ID/URL, provenance, QA y estado por canal. No llames
`social-ready` a una preview efímera ni `indexed` a una imagen sólo porque ya responde `200`.

Canon: [Editorial Infographic Operating Model V1](../../operations/public-site-content-factory/EDITORIAL_INFOGRAPHIC_OPERATING_MODEL_V1.md).
