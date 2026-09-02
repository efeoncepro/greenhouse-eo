# HubSpot · logos MCP reutilizados desde AEO · 2026-08-31

Pedido del operador: incorporar ChatGPT, Claude y Gemini de la página AEO en la tarjeta MCP.
Se reutilizan las URLs PNG que el HTML público de `https://efeoncepro.com/aeo-2/` sirve desde
`assets/img/engines/engine-{gpt,claude,gemini}.png`; no se duplican ni recolorean archivos.
[Provenance, URLs y hashes](2026-08-31-hubspot-mcp-logos-provenance.json).

## Implementación y alcance

Tres Media nativos `brand_chatgpt_logo`, `brand_claude_logo`, `brand_gemini_logo`. Grupo compacto de
logos sobre discos claros en la esquina derecha de la tarjeta MCP y la identidad de su panel seleccionado.
Los mismos controles gobiernan ambas instancias mediante el renderer compartido existente. ALT identifica
cada marca. No se añade JS, librería ni conexión de producto. Copy, cifras y naming permanecen iguales;
mostrar Gemini responde al pedido visual, no certifica una integración o flujo operativo nuevo.

El adaptador source-led mantiene las claves anteriores y añade el grupo al panel 12. No toca AEO,
Home, Creative, header/footer, timeline, ANAM, formulario ni SEO. No añade Perplexity.

## Publicación y rollback

[Manifest](2026-08-31-hubspot-mcp-logos-manifest.json): cuatro archivos del plugin (CSS, schema Hubs,
template Hubs y panel 12). Snapshot `_gh_hubspot_mcp_logos_20260831_110128`, backup remoto
`/tmp/eo-hubspot-before-20260831-110223.tar`. Publicación guardada por hashes y página, con purga Kinsta.
Árbol Elementor y post intactos: `0bd64d3e7a9026f099ce0114c9a5bae1cec0e8d95a3082b6f4b4d49d5f401e09`.
AEO protegido por hash `b506d651992fdf10f009c848c8bba5461c7fd76b7ff516b3f489afe848d905de`.
Sin Document::save, commit/push ni despliegue general Greenhouse.

Rollback: comprobar hashes posteriores, restaurar sólo los cuatro archivos del tar, purgar Elementor/Kinsta
y repetir QA. No requiere restaurar base de datos ni eliminar los logos compartidos de AEO.

## Verificación

- PHP: 190 textos raíz editables/escapados, Media compartido y reorder PASS.
- Preview: 1414/878/390 px × motion normal/reducida, tres logos decodificados, tarjeta/panel sincronizados,
  teclado, cero pageErrors y sin colisiones u overflow PASS. Capturas inspeccionadas.
- [Recorrido anónimo final PASS](2026-08-31-hubspot-mcp-logos-evidence.json): URL normal sin interceptar
  requests, seis estados responsive/motion, teclado, no-JS, imágenes cargadas y sin overflow. Capturas live inspeccionadas.
- Readback: cuatro SHA coinciden; once Media de Hubs registrados; árbol Elementor, AEO, Home y Creative intactos.
- SEO PASS; sintaxis, diff-check, qa:gates y docs:closure-check PASS. Dos avisos documentales globales
  corresponden al WIP anterior; no se crean contratos generales ni nuevas skills.
