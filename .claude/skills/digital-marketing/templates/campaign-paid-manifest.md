# CMP-### · Manifiesto operativo y handoff de pauta

Usar el canon `docs/operations/EFEONCE_PAID_MEDIA_MANIFEST_AND_MCP_HANDOFF_V1.md`. Esta ficha guía la construcción; no es un registro de ejecución ni autorización de gasto.

## Fuente y decisiones

Campaña [ ] · BRIEF/CDR [ ] · Updated_at [ ] · Schema [ ] · Raíz de rutas [ ].
Países aprobados/evidencia [ ] · Ventana [ ] · Presupuesto/moneda/periodo [ ] · Aprobación [ ] · Owner [ ].

## MANIFIESTO-PAUTA.json

- assets[]: ID, concepto, título, tipo, ratio, dimensiones/evidencia, ruta/bytes/hash/disponibilidad, receta, estado creativo y activación.
- copy_profiles[]: ID, concepto, canal/medio, variante, primera línea/texto literal, headline/description, CTA y caracteres.
- audiences{}: roles, momento, geografía, targeting candidato y lógica, exclusiones, consentimiento/volumen y estado.
- ads[]: ID interno, asset/copy/audience IDs, canal/placement, objetivo/conversión real, URL/UTM, prioridad y pendientes.
- flight: fechas y zona, presupuesto de medios (separado de producción), moneda, pacing, owners y autorización.
- sources/decision_context/operating_rules: límites de evidencia, referencias y reglas de medición/ejecución.

No inventar valores de cuenta, IDs, métricas o aprobaciones. Desconocidos como null con razón. Países y montos de otra campaña no son defaults.

## Vistas generadas

Finales/<campaña>: catálogo HTML, control CSV, GUIA-DE-PAUTA.md, PAUTA-PARA-AGENTES-MCP.md y exports por tipo/ratio.
Recursos/<campaña>: JSON único, actualizar-catalogo.py, recetas y mapa de rutas. No mantener copy editable paralelo.

## Markdown para agentes

Incluir autoridad y pendientes, rutas locales/remotas, presupuesto/horarios, audiencias, TODOS los copy_profiles literales y ads completos, evidencia/UTMs y protocolo MCP. Añadir checksum de la fuente. Descubrir herramientas; comprobar cuenta/moneda/zona; prevenir duplicados; validar preview/conversión; leer estado después de escribir. Registro de ejecución separado, sin credenciales ni éxitos supuestos.

## Cierre

[ ] IDs y referencias únicos/válidos · [ ] assets existentes/rutas/bytes · [ ] hashes o pendientes explícitos · [ ] copy/UTM/caracteres · [ ] vistas regeneradas · [ ] enlaces · [ ] autorización/runtime reportados sin inferencia.
