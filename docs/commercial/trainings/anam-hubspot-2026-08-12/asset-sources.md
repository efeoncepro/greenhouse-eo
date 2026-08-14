# Fuentes y estado del mockup

## Estado

- `proof-only`: mockup conceptual para revisión de la presentación.
- No contiene datos reales de ANAM ni una captura de un portal autenticado.
- No se incrustaron los assets oficiales de HubSpot marcados como `DO NOT USE`.
- La interfaz fue compuesta de forma determinística para el entrenamiento; los mockups usan el vector oficial de
  HubSpot embebido en cada cabecera, sin reconstruir el isotipo con círculos o texto aproximado.
- La portada usa la plantilla aprobada `CoverFull` de los decks: Efeonce, ANAM y la etiqueta formal de la
  capacitación sobre el degradado institucional. No se usa una portada editorial de ANAM ni un logo gigante de
  HubSpot.
- La portada consume la variante blanca exacta del sistema de diseño AXIS, exportada desde el nodo Figma
  `12550:11` dentro del bloque ANAM `12535:158`; no se recortó, redibujó ni recoloreó.
- La comparación de objetos usa la variante `diagnostic` de `ComparisonSplit`: el panel de errores no lleva
  wordmark ni URL de Efeonce para no asociar nuestra marca con el error.
- El logo de ANAM vive también en `src/lib/artifact-composer/catalogs/deck-axis/assets/clients/anam.svg` y en
  `docs/assets/public-site/aeo-brand-logos/anam.svg`; esas copias corresponden a la variante sobre fondo claro.
- La copia de trabajo de los assets conceptuales vive en `src/lib/artifact-composer/catalogs/deck-axis/assets/anam/`;
  la portada consume la exportación Figma en `assets/clients/anam-figma-dark.svg`.
- `hubspot-logo-color.svg` es la fuente vectorial local del wordmark; cada mockup lleva una copia embebida para
  que la exportación SVG sea autónoma y el logo no dependa de una ruta externa.
- La contraportada usa el SVG naranja exacto de [HubSpot Solutions Partner](../../../../public/branding/partners/hubspot/solution-partner/badge-orange-spp-hubspot.svg),
  conservado como primitive reutilizable y presentado sin recolor, recorte ni deformación.

## Referencias oficiales consultadas

- [Sales Hub de HubSpot](https://www.hubspot.com/products/sales) — navegación de producto, Sales Dashboard, Deal Pipelines y Smart Deal Progression.
- [Sales Workspace: revisar actividad de ventas](https://knowledge.hubspot.com/prospecting/review-sales-activity-in-the-sales-workspace) — tabs, tareas, feed y dashboards del workspace.
- [Lead Management & Prospecting Software](https://www.hubspot.com/products/sales/sales-leads) — jerarquía visual del Sales Workspace y gestión de prospectos.
- [HubSpot Trademark Usage Guidelines](https://legal.hubspot.com/tm-usage-guidelines) — el uso del logo estilizado queda marcado para revisión/aprobación antes de una distribución pública.
- [Logo HubSpot usado en los mockups](../../../../src/lib/artifact-composer/catalogs/deck-axis/assets/anam/hubspot-logo-color.svg) — wordmark vectorial de referencia, embebido sin alteración de geometría/color.
- [Logo ANAM original en el catálogo del repo](../../../../src/lib/artifact-composer/catalogs/deck-axis/assets/clients/anam.svg) — fuente institucional existente.
- [Variante ANAM sobre fondo oscuro](../../../../src/lib/artifact-composer/catalogs/deck-axis/assets/clients/anam-figma-dark.svg) — exportación exacta del nodo [ANAM en AXIS/Figma](https://www.figma.com/design/yyMksCoijfMaIoYplXKZaR/Design-System-%7C-AXIS?node-id=12535-158&m=dev), subnodo `12550:11`.

## Decisión de uso

Los mockups sirven para explicar los flujos `identificar objeto → separar pipeline → actualizar etapa → dejar Paso siguiente → leer panel → revisar IA → derivar con contexto`. Los pipelines muestran Growth y Fidelización/Renovación como superficies distintas; el dashboard muestra las preguntas de control, no métricas fabricadas. Las láminas finales pueden sustituir los mockups por capturas reales de ANAM solo después de contar con autorización, redacción de datos sensibles y verificación del estado live de cada función. El logo de ANAM y su variante de presentación se conservan en esta versión interna como `proof-only` hasta validar la autorización específica para distribución externa.
