# Propuestas en el portal — ver estado y descargar versiones

> **Tipo de documento:** Manual de uso (runbook operador)
> **Versión:** 1.0
> **Creado:** 2026-07-15 por Claude (TASK-1413)
> **Última actualización:** 2026-07-15 por Claude
> **Documentación técnica:** [GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md) · task specs TASK-1412/TASK-1413

## Para qué sirve

Para encontrar y descargar cualquier propuesta comercial (licitación, RFP privado o venta directa) sin
depender de OneDrive ni de preguntarle a un agente dónde quedó el PDF. La página muestra cada
propuesta con su estado, deadline y el **historial de versiones por artefacto** (deck, oferta técnica,
oferta económica, etc.), y deja bajar el archivo real de cualquier versión con un clic.

## Antes de empezar

- Necesitas rol interno **efeonce_admin** o **efeonce_account** (los clientes nunca ven esta página).
- La organización debe tener activo el entitlement `proposal_studio_v1` (hoy: solo Efeonce).

## Paso a paso

1. En el menú lateral, entra a **Administración → Propuestas** (ruta `/admin/commercial/proposals`).
2. La tabla lista las propuestas con origen, estado, deadline y cuántos artefactos tienen. Los chips de
   arriba filtran por estado; «Todos los estados» incluye también las cerradas (ganadas/perdidas/declinadas).
3. Haz clic en una fila: se abre el panel lateral con los **artefactos agrupados por tipo**. Cada tipo
   muestra su versión vigente y el historial completo (v3, v2, v1…).
4. Botón **Descargar** en la versión que necesites: baja el archivo real (PDF/Excel) directo del
   almacenamiento gobernado.
5. Para compartir un acceso directo interno, copia la URL con `?proposal=<id>` — abre la página con ese
   panel ya desplegado.

## Qué significan las señales

- **Vigente** (chip verde): es la última versión de ese artefacto — la que se entrega.
- **Interno** (chip ámbar): documento de uso interno de Efeonce (ej. benchmark, blueprint con costos).
  **Nunca se comparte con el cliente**; los roles sin permiso ni siquiera ven el botón y el backend
  devuelve 403 si se fuerza la URL.
- **Deadline en rojo**: vencido o en riesgo. El ícono ⓘ indica deadline asumido (las bases no lo
  declaran con certeza).

## Qué no hacer

- No redistribuir un artefacto marcado **Interno** fuera del equipo (lleva loaded cost y piso de
  negociación).
- No pedir el `gs://` del archivo: la única puerta de descarga es esta página o el endpoint gobernado.

## Problemas comunes

- **No veo el menú Propuestas** → te falta el viewCode/rol; pídelo a un admin (Admin Center).
- **La lista carga pero el historial dice «no está disponible»** → degradación parcial del reader de
  versiones; la lista sigue siendo confiable, reintenta o revisa `/admin/operations`.
- **Descarga 403 en un documento interno** → tu rol no tiene la capability de lectura interna; es el
  comportamiento esperado, no un bug.

## Referencias técnicas

- View: `src/views/greenhouse/commercial/proposals/ProposalStudioView.tsx`
- Reader de versiones: `src/lib/commercial/tenders/proposals/artifact-versions.ts` (TASK-1412)
- Endpoint de descarga: `/api/commercial/proposals/[proposalId]/assets/[proposalAssetId]/download`
