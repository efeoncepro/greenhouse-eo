# Readback SEO/AEO — Agencia de influencers

**Fecha:** 2026-08-29

**Task:** `TASK-1598`

**URL:** `https://efeoncepro.com/servicios/agencia-de-influencers/`

**WordPress:** página `251627`, `publish`

**Veredicto:** `PASS` — publicada y elegible para indexación. Este readback no afirma que Google ya la haya indexado.

## Intención y arquitectura

La landing captura intención comercial para `agencia de influencers`; `influencer marketing` conserva un rol de
categoría e intención predominantemente informacional. La URL vive bajo `/servicios/` y el menú la mantiene en
`Soluciones → Servicios Destacados → Influencer Marketing`, inmediatamente después de `Redes Sociales`. Esta ubicación
agrupa servicios de activación comercial sin mezclar la oferta con Visibility/SEO-AEO ni crear una columna nueva.

## Metadata publicada

| Campo | Valor live |
| --- | --- |
| SEO title | `Agencia de influencers y UGC para marcas | Efeonce` |
| Meta description | `Efeonce es una agencia de influencers y UGC para marcas en Chile, Colombia, México y Perú: scouting, derechos, paid usage, whitelisting y medición.` |
| Focus keyphrase | `agencia de influencers` |
| Canonical | `https://efeoncepro.com/servicios/agencia-de-influencers/` |
| Robots | `index, follow` |
| Excerpt | `Agencia de influencers y UGC para marcas: scouting, contenido, derechos, paid usage, whitelisting y medición en Chile, Colombia, México y Perú.` |
| Open Graph title | `Influencer marketing y UGC con derechos claros | Efeonce` |
| Open Graph description | `Activa creators, contenido y distribución con derechos definidos desde el inicio. Efeonce opera en Chile, Colombia, México y Perú.` |
| Twitter card | `summary_large_image` |

El title tiene 50 caracteres y la meta description 147. El HTML inicial entrega un H1, contenido crítico, ofertas y
las seis preguntas del FAQ sin depender de una interacción JavaScript.

## Imagen social

- Attachment: `251693`.
- URL: `https://efeoncepro.com/wp-content/uploads/2026/08/agencia-influencers-efeonce-og-1200x630-1.png`.
- Formato y tamaño: PNG, `1200×630`.
- ALT: `Agencia de influencers y UGC de Efeonce: creadores, contenido y derechos claros.`
- SHA-256: `7d26ce8bdc3b88e6dea95276fff8ded4212a88fcb27cff8888bdcd09506493aa`.
- Fuente reproducible: `pnpm tsx scripts/public-website/capture-influencer-og-image.ts`.

La imagen social es una captura dedicada del hero aprobado; no reutiliza el visual genérico de Home.

## Schema graph

Yoast conserva ownership de `WebPage`, `BreadcrumbList`, `WebSite` y `Organization`. El bloque page-scoped añade sólo:

- `Service`, con `provider` enlazado al `@id` canónico `https://efeoncepro.com/#organization`, cuatro mercados como
  `Country`, audiencia empresarial y un `OfferCatalog` derivado de las cinco ofertas visibles;
- `FAQPage`, con seis pares `Question`/`Answer` derivados del acordeón visible y URL
  `https://efeoncepro.com/servicios/agencia-de-influencers/#preguntas`.

El grafo final contiene un solo `BreadcrumbList`; no duplica `Organization` ni marca respuestas que no estén visibles.
Yoast sirve `og:type=article` para esta página singular. No afecta canonical, indexabilidad ni preview social; cambiarlo
requiere el filtro gobernado `wpseo_opengraph_type`, no una meta aislada del post, por lo que no se introdujo un parche
global en el runtime compartido.

## Readback y evidencia

`pnpm public-website:verify-influencer-seo-package` pasó contra producción con:

- HTTP `200`, canonical autorreferente, `index, follow` y sitemap presente;
- title `50`, description `147`, Open Graph/Twitter con la imagen PNG `1200×630`;
- tipos top-level `WebPage`, `BreadcrumbList`, `WebSite`, `Organization`, `Service`, `FAQPage`;
- `faqCount=6`, `offerCount=5`, `breadcrumbCount=1`;
- tres enlaces de menú a la ruta entre las superficies responsive del tema;
- cero bloqueo explícito de retrieval bots revisados;
- un H1, contenido crítico en HTML inicial y cero overflow desktop.

El gate visual `pnpm public-website:verify-influencer-landing-fidelity` también pasó después del resave Elementor en
1536, 1440, 890 y 390 px, además de reduced motion. Evidencia:
`.captures/task1598-influencer-fidelity-2026-08-29T02-41-33-777Z/`.

## Publicación y rollback

- Hash Elementor final: `580f4f604dd1e6ef911b397568fd9575f2117db01c6793d02dc98162bb4ac2f9`.
- Snapshot inmediato: `_gh_backup_before_task1598_seo_20260829T024347Z`.
- Snapshot SEO anterior: `_gh_backup_before_task1598_seo_20260829T023915Z`.
- `_thumbnail_id` se preservó vacío antes y después; el attachment social no reemplazó el hero Ohio.
- El publicador usó `Elementor\Document::save()`, reconstruyó indexables Yoast y purgó caché Kinsta.
- No se creó un lead ni una reserva durante la verificación.

## Riesgo residual

La URL está publicada y elegible para indexación; la indexación efectiva y el rendimiento orgánico requieren lectura
posterior en Search Console. También queda como trabajo editorial futuro añadir enlaces contextuales desde páginas
hermanas sólo cuando su copy pueda diferenciar claramente social management, producción creativa e influencer/UGC.
