# HubSpot · iconos semánticos para capacidades · 2026-08-31

El operador pidió completar las tarjetas sin icono y distinguir los símbolos descriptivos de las marcas
oficiales. Se aplica el patrón existente de identidad en tarjeta/panel, sin cambiar copy ni catálogo.

## Dirección y mapa

Iconos Tabler outline 3.24.0 (misma familia ya usada en la landing), azul claro `#cddeeb` tomado de su paleta.
No se recolorean ni modifican los isotipos oficiales HubSpot ni las marcas de MCP. Los nuevos gráficos son
descriptivos; no se presentan como logos oficiales ni prueban relación de producto o una acreditación.

| Capacidad | Icono Tabler | Media Elementor |
| --- | --- | --- |
| HubSpot AEO | world-search | brand_aeo_semantic_icon |
| Sales Workspace | briefcase | brand_sales_workspace_semantic_icon |
| Customer Success Workspace | heart-handshake | brand_customer_success_semantic_icon |
| Marketing Studio | palette | brand_marketing_studio_semantic_icon |
| Enablement conversacional | messages | brand_enablement_semantic_icon |

[Fuentes oficiales, modificación de color y hashes](2026-08-31-hubspot-semantic-icons-provenance.json).
Se preservan geometría y stroke de Tabler, añadiendo color al SVG raíz; licencia MIT ya presente en el plugin.
SVG pequeños locales, sin nueva librería, webfont ni JS. ALT decorativo porque el nombre de cada tarjeta
identifica la capacidad. Cinco Media nuevos compartidos con los paneles SSR y resistentes al reorder.

## Publicación y alcance

[Manifest de 13 archivos](2026-08-31-hubspot-semantic-icons-manifest.json): ocho archivos actualizados
(CSS, schema, template Hubs y cinco paneles), cinco SVG nuevos. Snapshot
`_gh_hubspot_semantic_icons_20260831_110627`; backup remoto `/tmp/eo-hubspot-before-20260831-110749.tar`.
Guard de hashes, post/metas y páginas de referencia PASS. Purga Elementor/Kinsta ejecutada.
Árbol Elementor sin cambios: `0bd64d3e7a9026f099ce0114c9a5bae1cec0e8d95a3082b6f4b4d49d5f401e09`.
Header/footer, SEO, textos, AEO, Home, Creative y formulario no se modifican. No Document::save, commit/push
ni despliegue general Greenhouse.

## QA y rollback

- PHP: 190 textos editables/escapados y Media compartido/reorder PASS; AEO no usa un logo oficial de otro Hub.
- Preview: 30 estados (cinco capacidades × tres anchos 1414/878/390 × normal/reduced motion), imágenes,
  selección, panel correcto, alineación superior derecha, teclado y cero pageErrors/overflow PASS.
- Capturas inspeccionadas en `.captures/hubspot-semantic-icons-20260831/`.
- Readback: 13 SHA exactos, 16 Media de Hubs registrados; post/metas y hashes de AEO, Home y Creative intactos.
- Cinco SVG públicos HTTP 200, hashes coincidentes y color azul claro verificados.
- Regresión MCP PASS en tres anchos y dos preferencias de motion, teclado y no-JS. SEO PASS.
- Sintaxis, diff-check, qa:gates y docs:closure-check PASS; dos avisos documentales generales del WIP
  anterior. Context strict: cero errores y advertencias.
- [Recorrido anónimo final PASS](2026-08-31-hubspot-semantic-icons-evidence.json): 30 estados sin
  interceptar requests, teclado, no-JS, cinco iconos cargados/alineados, sin overflow ni pageErrors.
  Capturas live de tarjetas y paneles revisadas.

Rollback: comprobar SHA posteriores, restaurar sólo archivos anteriores del tar y retirar los cinco SVG
nuevos de created-paths.json; no restaurar base de datos ni tocar las marcas de HubSpot/MCP. Purgar y
repetir verificación pública. Mantener el adaptador del compilador alineado con la revisión elegida.
