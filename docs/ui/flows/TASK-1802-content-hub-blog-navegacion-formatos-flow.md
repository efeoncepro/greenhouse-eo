# TASK-1802 — Flow del Content Hub Efeonce

## Entry points

- `/blog` desde header/footer, CTA, búsqueda externa, newsletter o social.
- Canonical de artículo/recurso que devuelve al hub por breadcrumbs/related navigation.
- Archivo, tema, tipo o query compartida mediante URL estable.

## Explorar lo reciente

```text
/blog
  -> latest server-rendered
  -> seleccionar pieza
  -> canonical propio de la pieza
  -> volver conserva posición/estado del browser
```

### Invariantes

- Latest sale de fuentes publicadas y deduplica destacados.
- Glitch/Tool/Video/Webinar se identifican por formato antes de abrir.
- No hay click intermedio ni card que apunte a `#`.

## Recuperar contenido anterior

```text
/blog
  -> Archivo visible
  -> página cronológica 1
  -> página N por número o Siguiente
  -> artículo canonical
```

### Invariantes

- Máximo dos decisiones visibles para entrar al contenido histórico.
- Cada página funciona sin JavaScript y tiene URL directa.
- Current page, Anterior/Siguiente y rango disponible son comprensibles por lector de pantalla.
- Back/Forward y refresh conservan página, tipo, tema y query compatibles.

## Explorar por tipo o tema

```text
/blog
  -> Tipo o Tema
  -> resultado filtrado + heading/contexto + URL
  -> pieza o paginación
  -> reset a Todos / Archivo
```

### Invariantes

- Tipo no se convierte en categoría temática.
- Tema vacío no se promociona; si se alcanza por URL, responde con estado honesto.
- Combinaciones de filtros tienen policy SEO explícita para evitar index bloat.

## Buscar en el hub

```text
/blog
  -> Search
  -> query no vacía
  -> resultados allowlisted
     -> pieza
     -> no results -> editar query / limpiar / Archivo / Temas
```

### Invariantes

- Query vacía no devuelve todo el inventario.
- Search editorial no mezcla pages, attachments, e-landing-page ni portfolio.
- El input conserva la query, label visible y submit accesible.

## Recursos federados

```text
/blog
  -> Tools / Videos / Webinars
  -> colección desde registro verificado
  -> canonical WP / Think / YouTube / otra superficie
```

### Invariantes

- Una pieza sin canonical/owner/state no se expone.
- Falla del registro no tumba artículos WordPress.
- Link externo/cross-runtime se comporta como navegación normal; no copia la pieza para simular integración.

## Newsletter

```text
hub
  -> completar form + consentimiento
  -> pending server-side
  -> receipt confirmado | error recuperable
```

### Invariantes

- Click no equivale a conversión.
- PII no entra a URL, dataLayer o logs crudos.
- Error conserva datos seguros y foco; éxito anuncia el receipt.

## Failure and recovery

- Query WP falla: módulo muestra estado degradado y no inventa cards; hub mantiene navegación estática útil.
- Curated ID inválido/no publicado: fallback query y señal de diagnóstico.
- Página fuera de rango: redirect/canonical seguro a última válida o 404 coherente, decidido en Discovery.
- Resource registry degradado: ocultar/explicar bloque; artículos y archivo continúan.
- Cutover defectuoso: restaurar documento/ruta desde snapshot y purgar caché.

## Analytics boundary

- Medir `hub_view`, `hub_type_select`, `hub_topic_select`, `hub_archive_open`, `hub_page_select`, `hub_search`,
  `hub_resource_open` y receipt de suscripción con vocabulario final del tracking plan.
- Nunca registrar query con PII, email, texto libre ni títulos completos como sustituto de IDs públicos.
- Distinguir interacción, navegación, envío y conversión confirmada.

