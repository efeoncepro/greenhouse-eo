# Producción y QA — Design Context Lab v2

- Composición: 7 PNG 1080×1350 y PDF de 7 páginas 4:5.
- Placas fotográficas: GPT Image 2.5 Sunburst, 1152×1440. Julio: `julio-ap-04.png` + `julio-ap-11.png`; Nexa: sus anclas fotográficas de rostro y cuerpo en `ai-generations/_identidad-nexa/1-anclas/`.
- Los textos y el logo salen de capas determinísticas. Firma: `public/branding/logo-full.svg`, colocada en cartela clara; tinta oficial navy sobre papel cálido, contraste estimado superior a 4.5:1.
- Revisión de píxeles: portada, láminas 3 y 7 y hoja de contacto; el copy cabe en los paneles y los rostros quedan visibles. Se comprobó proporción 4:5 y página PDF.
- `pnpm foto:validar` sobre las placas: portada **2/4** y cierre **2/4** en los indicadores generales. La portada no alcanza el umbral automatizado del lecho fotográfico y ambas placas no están preparadas para el campo profundo de una selección colaborativa. Este carrusel no usa cursores; compone la firma y los textos dentro de cartelas de historieta. Por eso el reporte de reservas se conserva como limitación medible de las placas, no se declara aprobado.
- La referencia fotográfica de Powerpuff Girls se usó para secuenciar presentación → ingredientes → olla → revelación. La fotografía de personas permanece fotorrealista; no se copiaron fotogramas, personajes ni logotipo de la franquicia.

Las placas originales, fichas y prompts permanecen en `plates/`, `fichas/` y `prompts/`. La composición se rehace con `node ai-generations/2026-09-24_design-context-lab-v2/componer.mjs`.
