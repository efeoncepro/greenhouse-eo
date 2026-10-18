# TASK-2041 — Admin «EO Navegación» (wireframe)

> Pantalla del admin de WordPress para editar el documento `site-nav.v1` de la navegación global. **No hay dirección de
> Product Design aprobada todavía** para esta pantalla: este documento fija estructura, campos, estados y reglas desde
> la arquitectura y el esquema. El diseño visual se aprueba dentro de la task antes de construir; hasta entonces,
> `UI ready: no`.
>
> - Arquitectura: [`PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md`](../../architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md)
>   §Plugin «EO Navegación».
> - Flujo maestro (nodo E1): [`EPIC-055-public-site-global-navigation-UI-FLOW.md`](../flows/EPIC-055-public-site-global-navigation-UI-FLOW.md).

## Product contract

- **Usuario:** persona del equipo con permiso `eo_manage_site_nav` (o `manage_options`), no técnica.
- **Tarea:** cambiar textos, enlaces, fotos, orden y estructura del menú sin romper el esquema, ver cómo queda y volver
  atrás si algo sale mal.
- **Regla:** la pantalla es cliente del mismo command de guardado que `wp eo-nav apply`. No tiene lógica propia de
  validación ni de guardado.
- **Lugar:** WordPress admin → Ajustes → «Navegación del sitio». No se usa «Apariencia → Menús».

## Layout

```text
┌ Navegación del sitio ──────────────────────────────── [Ver historial] [Vista previa] [Guardar] ┐
│ Estado: publicado · revisión 12 · 18 oct 2026 15:00 · por <autor>                              │
├────────────────────────────┬───────────────────────────────────────────────────────────────────┤
│ ÁRBOL                      │ EDITOR DEL NODO SELECCIONADO                                      │
│ ▸ Cabecera                 │ Tipo: servicio · Línea: Growth                                    │
│ ▸ Inicio                   │ Nombre ............ [Loop Marketing]                              │
│ ▸ Nosotros (desplegable)   │ Enlace ............ [/servicios/loop-marketing/]  (interno)        │
│ ▾ Soluciones (líneas)      │ Respuesta ......... [Ciclo a ciclo]                               │
│   ▾ Growth                 │ Ícono ............. [loop ▾]  (catálogo Trazo de AXIS)            │
│     · Loop Marketing  ●    │ Foto mega (880×472) [URL] [miniatura] Alt [............]          │
│     · Content Marketing    │ Foto onepage (996×1080) [URL] [miniatura]                         │
│   ▸ Brand / Engine / …     │ Lectura ........... título [....] enlace [....]                   │
│ ▸ Recursos (editorial)     │ [↑ Subir] [↓ Bajar] [Quitar]                                       │
│ ▸ Contacto                 │ Errores de este nodo (en línea, junto al campo)                   │
│ ▸ Pie del onepage          │                                                                   │
│ ▸ Contexto «Estás aquí»    │                                                                   │
└────────────────────────────┴───────────────────────────────────────────────────────────────────┘
```

- **Árbol:** refleja el esquema, con dos niveles en el onepage y líneas → servicios en Soluciones. Sólo permite
  agregar los tipos de nodo que el esquema acepta en cada lugar.
- **Fotos:** el campo acepta una URL del bucket de AXIS (`site-nav/v<N>/`) o una de la biblioteca de medios de
  WordPress (botón «Elegir de la biblioteca»). Muestra la miniatura y avisa si la medida no coincide con el recorte.
- **Texto alternativo:** es obligatorio en cada foto.
- **Vista previa:** pinta el documento en edición con el mismo render de AXIS, en una vista embebida con dos anchos
  (1440 y 390). No publica.
- **Historial:** muestra las revisiones con autor, fecha y mensaje. «Comparar» abre un diff legible; «Restaurar» crea
  una revisión nueva con el contenido anterior y pide confirmación en línea.

## States

| Estado | Qué se ve |
|---|---|
| Sin documento | Mensaje y botón «Importar documento inicial» (para la carga de `TASK-2041`), o «Crear vacío». |
| Editando sin guardar | Marca «Cambios sin guardar» y aviso al salir de la página. |
| Validación fallida | No guarda. Lista de errores arriba, cada uno con enlace al nodo, y error en línea junto al campo. |
| Guardando | Botón con «Guardando…» y deshabilitado. |
| Guardado | Aviso «Publicado como revisión N» y estado actualizado. |
| Conflicto | Otra persona o un agente guardó mientras tanto. Avisa con la revisión nueva y ofrece comparar antes de sobrescribir. Nunca pisa en silencio. |
| Sin permiso | La pantalla no aparece en el menú del admin. El acceso directo devuelve el aviso estándar de WordPress. |
| Fuente dinámica caída | En los formatos de Recursos, aviso de que se mostrará el destacado fijo. |

## Copy

Textos del admin en español neutro y tuteo, dentro del plugin (`__()` con dominio de texto propio). Los textos del menú
son contenido del documento, no copy del plugin.

## Implementation Mapping

- **Plugin:** `efeonce-public-site-runtime/wp-content/plugins/<eo-site-nav>/` (nombre de directorio a fijar en la task).
- **Pantalla:** PHP + JS liviano o componentes de `@wordpress/components`. Es admin, no sitio público, así que la
  restricción de React del frontend no aplica, pero se prefiere lo nativo de WordPress.
- **Guardado:** llama al mismo servicio PHP que usa `wp eo-nav apply` (validar → revisión → copia pública → purga).
- **Esquema:** JSON Schema `site-nav.v1` copiado del contrato de AXIS con versión fijada.
- **Vista previa:** render de servidor del primitive de AXIS vendorizado.

## GVC Scenario Plan

El admin de WordPress no está en el portal; la evidencia se toma con Playwright sobre el admin de staging o de la
instancia local, con un usuario de prueba:

- **Superficie:** `wp-admin/options-general.php?page=eo-site-nav` (surface ID `wp-admin-eo-site-nav`).
- **Viewports:** 1440×900 y 1280×800. Es admin, sin objetivo móvil; se verifica sólo que no rompa en 390.
- **Pasos:**
  1. Editar un servicio y guardar.
  2. Provocar un error de validación.
  3. Restaurar una revisión.
  4. Abrir la vista previa.
- **Verificaciones:** el documento guardado es igual al exportado por `wp eo-nav export`; el error no guarda; la
  restauración crea una revisión nueva.

## Design Decision Log

| Decisión | Por qué |
|---|---|
| Pantalla propia en vez de «Apariencia → Menús» | El menú nativo no guarda líneas, recortes de foto, respuestas ni contexto. |
| Árbol + editor de nodo | Respeta la estructura del esquema y evita JSON crudo para personas no técnicas. |
| Mismo command que WP-CLI | Full API Parity: personas y agentes no pueden divergir. |
| Conflicto visible | Personas y agentes editan el mismo documento; pisar en silencio rompe la confianza. |
| Diseño visual por aprobar | No existe dirección aprobada para esta pantalla; no se inventa. |
