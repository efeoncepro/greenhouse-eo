# TASK-2047 — Edición de un proyecto del portafolio: flujo

> Nodos de edición (persona en el admin y agente por WP-CLI) y de lectura (REST pública) del flujo maestro del
> programa `docs/ui/flows/EPIC-056-eo-portfolio-UI-FLOW.md` [verificar nombre final]. Pantalla:
> [`TASK-2047-eo-portfolio-admin.md`](../wireframes/TASK-2047-eo-portfolio-admin.md). Decisión:
> [PDR-028](../../public-site/decisions/PDR-028-portafolio-de-proyectos-eo-portfolio.md).

## Flow Goal

Que una persona o un agente cargue, apruebe y publique un proyecto con la misma garantía: nada inválido se guarda, nada
se publica sin aprobación del cliente, nada se pisa en silencio y todo cambio se puede deshacer.

## Happy Path

### P1 · Persona en el admin

1. Abre «Portafolio» → «Agregar proyecto». Ve las secciones vacías y el panel con «Borrador».
2. Completa Cliente y contexto, Reto/idea/ejecución, Resultados (cada uno con fuente) y Capítulos y piezas (imágenes de
   la biblioteca, videos por URL del bucket con su formato calculado).
3. Guarda con un mensaje. El servicio:
   1. verifica el permiso;
   2. valida contra `portfolio-entry.v1` y las reglas de conjunto;
   3. compara el hash (sin cambios → «Sin cambios»);
   4. compara la revisión base (conflicto → rama R3);
   5. crea la revisión con autor y mensaje;
   6. purga la caché.
4. Registra la aprobación del cliente: referencia, fecha y alcance. Las secciones que el alcance no cubre muestran
   «No se mostrará».
5. Quien tiene `eo_publish_portfolio` pulsa «Publicar». El servicio valida de nuevo y exige aprobación con alcance.
6. Ve «Publicado» con «Ver en el sitio». El proyecto aparece en la REST y, con `TASK-2048`, en `/portafolio/`.

### P2 · Agente u operador por WP-CLI (carril SSH)

1. `wp eo-portfolio export <slug>` trae el documento vigente como base (o `--revision n`).
2. Edita el JSON y corre `wp eo-portfolio validate --file`.
3. `wp eo-portfolio apply --file --message "…" --dry-run` muestra qué cambiaría; sin `--dry-run` aplica todo o nada,
   con foto previa del estado.
4. `wp eo-portfolio publish <slug>` publica sólo si la aprobación tiene alcance; si no, falla con el mismo error que ve
   la persona en el admin.

### P3 · Lectura pública

1. `GET /wp-json/eo/v1/portfolio` lista los publicados con su contexto mínimo; `…/<slug>` entrega la proyección pública.
2. La proyección aplica el alcance y nunca incluye `clientApproval`, `greenhouseOrganizationId` ni revisiones.
3. Las plantillas de `TASK-2048` leen el mismo servicio en el servidor, no la REST.

## Recovery Branches

| Rama | Disparador | Qué pasa | Cómo se sale |
|---|---|---|---|
| R1 · Validación | Campo obligatorio vacío, cifra sin fuente, medio sin dimensiones o sin `alt` | No guarda; resumen de errores y foco al primero (admin) o JSON de errores (WP-CLI) | Corregir y guardar de nuevo |
| R2 · Video ilegible | URL fuera del bucket, 404 o sin dimensiones | La pieza queda en error y bloquea publicar | Corregir la URL o volver a subir el archivo al bucket |
| R3 · Conflicto | Otra revisión se guardó sobre la misma base | No guarda; enlace para comparar con la revisión nueva | Recargar, reaplicar los cambios y guardar |
| R4 · Publicar sin aprobación | Falta `ref`, `date` o `scope` | «Publicar» deshabilitado (admin) o error (WP-CLI); nada se publica | Registrar la aprobación con alcance |
| R5 · Restaurar | Un cambio publicado salió mal | «¿Restaurar la revisión N?» crea una revisión nueva con el contenido anterior | Confirmar; el historial conserva todo |
| R6 · Esquema nuevo invalida un publicado | Versión nueva del esquema | El sitio sirve la última revisión válida y deja registro en el log | Editar el proyecto para que valide con el esquema nuevo |
| R7 · Sin permiso | Usuario sin `eo_manage_portfolio` o sin `eo_publish_portfolio` | Menú o botón ausentes, con la razón | Pedir el permiso a un administrador |

## Focus and Navigation

- Tras guardar con éxito, el foco vuelve al campo editado; tras fallar, al primer error del resumen.
- Los enlaces de «Falta para publicar» y del resumen de errores abren la sección y llevan el foco al campo.
- Salir con cambios sin guardar pide confirmación del navegador.
- «Ver en el sitio» abre `/portafolio/<slug>/` en la misma pestaña; «← Portafolio» vuelve al listado.

## GVC Scenario Plan

- **Escenario:** Playwright sobre el admin local o de staging; surface ID `wp-admin-eo-portfolio`.
- **Viewports:** 1440×900 y 1280×800; 390×844 sólo para verificar que no rompe.
- **Recorrido:** P1 completo con el fixture de PabellonToGo, luego R1 (cifra sin fuente), R2 (URL fuera del bucket), R4
  (publicar sin alcance) y R5 (restaurar).
- **Evidencia:** un frame por paso; igualdad entre lo guardado y `wp eo-portfolio export`; `curl` a la REST tras
  publicar y tras despublicar; foco al primer error.

## Design Decision Log

| Decisión | Por qué |
|---|---|
| Un solo servicio para admin y WP-CLI | Paridad: la misma regla falla igual para una persona y para un agente. |
| Publicar es un paso separado de guardar | Guardar es frecuente; publicar exige aprobación y permiso propio. |
| Restaurar crea revisión nueva | La historia nunca se borra (patrón de `eo-site-nav`). |
| Las plantillas leen el servicio, no la REST | Evita una llamada HTTP a sí mismo por cada visita; la REST queda para otros sitios. |
