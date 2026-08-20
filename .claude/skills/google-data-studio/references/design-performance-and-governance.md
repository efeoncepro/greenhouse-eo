# Diseño, rendimiento y gobernanza

## Arquitectura del reporte

Diseña desde el flujo de decisión:

1. contexto, fecha, fuente y estado de freshness;
2. KPIs principales con comparación válida;
3. drivers o descomposición;
4. tendencias y segmentos;
5. excepciones y detalle accionable;
6. definiciones, metodología y owners.

Una página debe tener una pregunta dominante. Si mezcla audiencias o decisiones distintas, separa páginas y conserva
controles globales solo cuando su efecto sea consistente.

## Freeform y responsive

Freeform ofrece posición y tamaño precisos, componentes superpuestos y más control de canvas. Responsive usa secciones
y un grid automático de 12 columnas que se adapta al dispositivo.

Antes de elegir:

- identifica dispositivos reales y contexto de embed;
- confirma si se necesitan report-level components, overlap, grouping o posición exacta;
- prueba el contenido más largo y la mayor cardinalidad esperada;
- evita prometer conversión sin pérdida: cambiar layout puede perder posiciones, fondos o bordes.

Responsive no soporta todas las acciones de freeform y restringe, entre otras, overlap, agrupación clásica,
report-level components y algunas opciones de canvas. Confirma la lista actual en
[Create a responsive report](https://docs.cloud.google.com/data-studio/create-a-responsive-report).

## Diseño visual y accesibilidad

- Usa grid, alineación y espaciado coherentes; evita una card por cada dato.
- Mantén jerarquía tipográfica y títulos descriptivos, no ornamentales.
- No dependas solo del color; agrega label, posición, forma o texto.
- Verifica contraste, tamaño de texto y estados de foco visibles cuando existan interacciones.
- Proporciona contexto para abreviaturas, unidades, targets y variaciones.
- Evita texto dentro de imágenes y decoraciones que parezcan controles.
- Conserva orden de lectura lógico y navegación por teclado en controles, botones y enlaces.
- Prueba labels truncados, traducciones largas, zoom y ausencia de datos.

Los themes controlan defaults globales; estilos locales deben ser excepciones deliberadas. Identifica Modern Charts
antes de replicar configuraciones antiguas. Fuentes: [Themes](https://docs.cloud.google.com/data-studio/themes) y
[Report and page layout](https://docs.cloud.google.com/data-studio/report-and-page-layout).

## Rendimiento

Diagnostica por capa:

```text
fuente/consulta → conector/cuota → data source → blend/cálculo → página/componentes → navegador
```

Checklist:

- reduce campos, filas, rango temporal y cardinalidad antes del render;
- evita repetir blends o calculated fields costosos por chart;
- preagrega en la fuente cuando la semántica es estable y compartida;
- en BigQuery considera partición, clustering, materialized views y BI Engine según costo/uso;
- configura data freshness según necesidad, costo y tolerancia a stale data;
- usa extracts cuando un snapshot estático, sus límites y su actualización programada son compatibles;
- reparte componentes complejos entre páginas si una sola página dispara demasiadas consultas;
- mide en view mode con los filtros reales; una vista sin filtros no representa el peor caso;
- no refresques agresivamente: puede limpiar caché, gastar cuota o ejecutar consultas facturables.

Freshness es un contrato visible, no un detalle técnico. Para blends se aplica la menor ventana de freshness entre sus
fuentes. Fuente: [Manage data freshness](https://docs.cloud.google.com/data-studio/manage-data-freshness) y
[Improve performance](https://docs.cloud.google.com/data-studio/improve-performance).

No confundas refresh del reporte, refresh de fields, reconnect de la fuente y auto-refresh: cambian capas distintas y
no tienen el mismo costo ni blast radius. Para límites y procedimiento lee
[`connectors-security-and-operations.md`](connectors-security-and-operations.md).

## Data sources y credenciales

### Embedded

- Viajan con el reporte al compartir/copiar según credenciales.
- Los editores del reporte también pueden editar la fuente.
- Reducen assets, pero amplían la superficie de cambio y metadata visible.

### Reusable

- Permiten modelo y gobierno compartidos entre reportes.
- Se comparten y administran como asset separado.
- Un cambio puede afectar varios reportes; no modifiques conexión o credenciales durante un ajuste visual.

### Credential types

- Owner's Credentials: viewers consultan mediante la autorización del credential owner.
- Viewer's Credentials: cada viewer debe tener acceso a la fuente.
- Service Account Credentials: solo para BigQuery en organizaciones Google Workspace o Cloud Identity; requieren
  configuración y autorización administrativa.

Sharing del reporte no concede por sí solo acceso directo al dataset, pero Owner's Credentials puede mostrar datos a
usuarios que no tienen permiso subyacente. Revisa ambas capas. Fuentes:
[Embedded data sources](https://docs.cloud.google.com/data-studio/embedded-data-sources) y
[Data credentials](https://docs.cloud.google.com/data-studio/data-credentials-article).

## Sharing, exportación y embedding

Antes de cambiar distribución registra audiencia, autenticación, posibilidad de descargar/copiar/imprimir, datos
sensibles, credenciales efectivas y exposición de parámetros/URLs.

- Prefiere personas o Google Groups antes que enlaces amplios.
- Un embed privado sigue requiriendo autenticación y opera en view mode.
- Los embeds mantienen filtros/controles, pero tienen limitaciones de menú y refresh.
- Controles, parámetros, URLs, páginas ocultas e iframes no son fronteras de autorización ni aislamiento entre tenants.
- Scheduled delivery, alertas y features Pro pueden enviar datos fuera del contexto interactivo: requieren alcance y
  destinatarios explícitos.
- La exportación depende de chart, connector y permisos; valida el caso real.
- Una copia privada puede seguir exponiendo Owner's Credentials. No la compartas por defecto.

Fuentes: [Ways to share](https://docs.cloud.google.com/data-studio/ways-to-share-your-reports),
[Embed a report](https://docs.cloud.google.com/data-studio/embed-a-report) y
[Roles and permissions](https://docs.cloud.google.com/data-studio/roles-and-permissions).

Para seguridad por fila, links personales, copias, delivery y alertas lee
[`connectors-security-and-operations.md`](connectors-security-and-operations.md).

## Terceros y Pro

Community connectors y visualizations pueden procesar datos externamente, exigir Owner's Credentials, cobrar o tener
límites propios. Registra proveedor, datos transmitidos, credenciales, costo, retención y rollback antes de aprobarlos.

Data Studio Pro agrega superficies organizacionales como workspaces y, según disponibilidad actual, controles de
seguridad/compliance. No asumas que una función Pro existe en Free ni que está habilitada en la organización.
