# Paid Media · Manifiesto compartido y handoff MCP · v1

22/09/2026. Dueño: Digital Marketing; craft: Copywriting; medición: Growth CRO; entrega creativa: Advertising/Studio.
Extiende [registro CMP](EFEONCE_CAMPAIGN_REGISTRY_V1.md) bajo el [contrato de contexto de agentes](../architecture/GREENHOUSE_AGENT_CONTEXT_ROUTER_DECISION_V1.md). No crea un proveedor MCP, runtime de anuncios ni permiso de publicación.

## 1. Autoridad y ubicación

| Fuente | Qué gobierna |
|---|---|
| BRIEF + CDR | Estrategia, decisiones y evidencia de aprobación |
| MANIFIESTO-PAUTA.json | Inventario operativo, copy externo, audiencia y configuraciones de carga |
| Catálogo HTML, control CSV, guía y handoff Markdown | Vistas generadas del mismo manifiesto |
| EJECUCIONES-MCP.json | Operaciones realizadas e IDs/estados leídos del proveedor; se crea al ejecutar |

Finales se organiza por campaña legible, tipo y ratio; no por agente, tanda ni versión técnica. Imágenes/videos finales viven una vez. Versiones, prompts, copy/layout, referencias, scripts y QA se conservan en Recursos, con mapa de rutas si se reorganiza. No reescribir recetas históricas para aparentar ejecución en una ruta nueva.

En `03. Finales/<CMP-ID - Nombre>/`: `ABRIR CATALOGO.html`, `CONTROL-DE-PAUTA.csv`, `GUIA-DE-PAUTA.md`, `PAUTA-PARA-AGENTES-MCP.md`, `LEEME.md`, `01 - Imagenes/<ratio>/`, `02 - Videos/<ratio>/`.
En `01. Recursos/<CMP-ID - Produccion y editables>/`: manifiesto, generador y paquetes reproducibles.

El JSON es editable; las vistas se regeneran juntas con `actualizar-catalogo.py`. Una solicitud humana de modificar copy se incorpora primero a la fuente. El Markdown completo lleva fecha/checksum de fuente para que un agente detecte contexto viejo. Las vistas no son formatos de importación nativa de plataformas.

## 2. Contrato mínimo del manifiesto

- Cabecera: schema_version, campaign_id, title, updated_at, base de rutas explícita, directorio final, fuentes y contexto de decisiones.
- `assets`: asset_id único, concept_id estable, título, tipo, ratio, dimensiones y evidencia, ruta, bytes, sha256 o null, disponibilidad local y estado de hash, estado creativo/activación separado, receta y registro de producción. Mantener versión/procedencia; no llamar aprobado a un archivo sólo porque existe.
- `copy_profiles`: copy_id, concept_id, canal/medio, variante, primary_text literal, headline, description opcional, CTA nativo y etiqueta visible, conteos, hipótesis y estado. No mezclar copy exterior con texto compuesto dentro del arte.
- `audiences`: rol primario/secundario y momento, mercados, targeting candidato y lógica AND/OR, exclusiones, requisitos de consentimiento/volumen y disponibilidad real o pendiente. Los cargos no son IDs de segmentos. Tamaño de empresa no prueba encaje.
- `ads`: ad_id estable, asset_id + copy_id + audience_id válidos, canal, placement, objetivo/señal, destino, UTM completa, prioridad, estado y checks pendientes. Una fila es una alternativa seleccionable, no una orden de activar toda la matriz.
- `flight`: fechas/modelo, países y evidencia, presupuesto/moneda/periodicidad/alcance, reparto/pacing, owner y estado de aprobación. Null significa desconocido; sugerido no significa autorizado. Presupuesto de producción distinto de medios.
- `operating_rules`: oferta y límites, arranque, medición, atribución, pruebas, rotación, seguimiento comercial y requisitos de publicación. `sources`: URL/fecha/uso y fallos de acceso. No presentar presupuestos editoriales como límites oficiales no verificados.

Nuevas variantes conservan el concept_id, crean IDs de variante/versionado y registran qué cambió. No reciclar ad_id para un arte distinto ya publicado. Registrar la versión/hash en ejecución para reconstruir el anuncio real.

## 3. Copy y configuración

Cargar Copywriting (voz institucional + módulo ad copy), Digital Marketing y Growth CRO. Basar el texto en brief/JTBD y evidencia; si no hubo VOC real, declarar hipótesis. Una idea por anuncio. El copy externo explica relevancia, valor y siguiente paso; no describe decorativamente la imagen ni repite todos sus textos.

Entregar por canal: primera línea, cuerpo, titular, descripción cuando aplique, botón y destino. Medir caracteres. Variante de hook cambia sólo apertura cuando se pretende aislar esa variable. No introducir garantía de ranking/cita, lift, precio, gratuidad, plazo ni testimonio por llenar un campo. La landing debe sostener la promesa; lectura pública no prueba conversión ni entrega.

Separar ratio de placement y verificar specs oficiales vigentes. Un PNG no es video; 16:9 no equivale a 1,91:1. Algunos placements no muestran headline/description. La matriz debe indicar faltantes sin inventar exports, recortes o disponibilidad de audiencias. Conservar requisitos de safe zones, firma/lecho y contraste del canon creativo.

## 4. Programación por MCP

1. Leer autorización existente, BRIEF/CDR, manifiesto y checksum del handoff. No pedir de nuevo decisiones ya confirmadas; no inferir inversión desde un final creativo.
2. Descubrir capacidades reales. Un conector social orgánico no demuestra capacidad de paid media. Verificar cuenta, identidad/página, moneda, zona horaria y permisos; no inventar herramientas o IDs.
3. Resolver archivos locales/remotos. Un agente remoto no puede usar rutas de esta Mac como URLs públicas. Descargar por conector autorizado, validar archivo real/hash y cargar por upload soportado. No publicar carpetas ni exponer enlaces temporales con secretos.
4. Buscar objetos existentes por claves/IDs. Reutilizar el objeto correcto y leer estado antes de repetir una llamada incierta. Evitar duplicados. Creación draft/paused también requiere estar en el alcance autorizado.
5. Seleccionar subconjunto de anuncios, copiar campos literales, configurar audiencia real y exclusiones, objetivo/conversión verificada y URL con UTM. No habilitar transformaciones automáticas de copy/imagen sin revisar su resultado.
6. Comprobar preview, formulario/conversión/CRM, atribución y atención comercial. No usar un submit intent como resultado aceptado ni crear eventos nuevos por nombrar hitos de negocio.
7. Aplicar presupuesto/calendario cuando estén autorizados; verificar moneda, periodo y zona horaria. Mensual no es daily budget. Registrar horario local y UTC, sin inventar hora.
8. Leer objeto persistido y conservar IDs/evidencia. Distinguir draft, paused, scheduled, in_review, rejected, active y entrega real. HTTP 2xx, upload, guardado o programación no prueban delivery.

Registro por ad_id: run_id, manifest_sha256, account/platform, IDs externos de campaña/grupo/anuncio/media, operación, estado pedido/leído, timestamps/zonas, presupuesto/moneda, destino, copy_id, hash del archivo, referencia de autorización, evidencia, error resumido y next_action. Nunca tokens/cookies. La ejecución queda separada del plan, sin inventar un ledger de acciones no realizadas.

## 5. Validación y cierre

Validar IDs únicos y referencias, conteos entre JSON/CSV/MD, rutas/bytes, caracteres/UTM, copy A/B y que los archivos no cambien al reorganizar. El checker de catálogo tolera ausentes para CI: validar además el archivo adjunto real y las copias OneDrive. Hash pendiente se declara; no se rellena de memoria.

Generar todas las vistas después de la última edición. Verificar enlaces y que cada perfil/configuración aparezca completo en el Markdown. Pruebas documentales no sustituyen revisión visual, live conversion, permisos ni activación. Reportar estados por separado.

Ejemplo instanciado: CMP-001, 25 PNG + 3 MP4, 48 perfiles de copy y 72 alternativas. Fuentes/estado actual: [CDR-006](../campaigns/decisions/CDR-006-cmp001-manifiesto-copy-y-pauta.md) y [handoff](social/2026-09-22-cmp-001-campaign-brief-handoff.md). No convertir esos conteos ni países en defaults de campañas nuevas.


## 6. Lanzamientos orgánicos derivados de assets paid

Un asset puede compartirse; el permiso, copy, destino y estado pertenecen a cada publicación.
Conservar el plan paid y un registro de lanzamiento explícito, enlazado desde sus vistas: no reemplazar todos
los destinos de una campaña para resolver un lanzamiento. Para CMP-001, `LANZAMIENTO-GRADER.json` posee el copy
de salida y `PROGRAMACION-GRADER-APROBADA.json` es el registro de ejecución existente equivalente a
`EJECUCIONES-MCP.json`; no crear un segundo ledger con los mismos IDs. El handoff del caso enlazado arriba
registra la programación y sus límites. Los videos del catálogo deben tener reproductor, controles y enlace
alternativo, no sólo enlaces a MP4; cambiar el generador para conservarlo al regenerar.

Preservar texto aprobado y anotar únicamente los cambios autorizados (p. ej. menciones). No sustituir su URL por
otra landing o agregar UTM en silencio. La sintaxis de mención, el readback y la separación orgánico/paid viven en
`social-media-studio/references/video-delivery-metricool.md`. Registrar nombre de cuenta, ID, zona, horario local/UTC,
copy literal, media, portada, estado y evidencia. No inferir publicación por PENDING ni apertura de enlaces en bio
por existir un caption con URL. No reintentar un post ya identificado sin leer su estado.
