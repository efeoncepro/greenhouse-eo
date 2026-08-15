# TASK-1715 — Application 360 · Documentos del candidato Flow Contract

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1715 — Application 360 documents panel: cablear el reader real, visor del CV y reveal auditado de identidad`
- Related wireframe: [docs/ui/wireframes/TASK-1715-application-360-documents-panel.md](../wireframes/TASK-1715-application-360-documents-panel.md)
- Master UI flow: [EPIC-011-hiring-ats-UI-FLOW.md](EPIC-011-hiring-ats-UI-FLOW.md) — este flujo **completa el nodo N5 (Ficha candidato)**, cuyo contrato declara `tabs (perfil/assessment/docs/decisión)`. El tab **docs** era el único de los cuatro sin reader real: N5 se declaró cubierto por TASK-355 cuando su pestaña de documentos todavía era mockup, y TASK-1362 construyó el sustrato con `UI impact: none`. Esta task cierra ese seam. No crea nodo nuevo.
- Intended route / surface: `/agency/hiring/applications/[applicationId]` (tab `documents`, sin cambio de ruta) + diálogo del visor + diálogo de reveal.
- Flow type: `single-surface` (panel server-rendered + diálogo del visor + diálogo de reveal command-backed)
- Primary primitives: `Paper variant='outlined'`, `Stack`, `GreenhouseChip`, `GreenhouseButton`, MUI `Dialog`/`Alert`/`Snackbar`, `CustomTextField`
- Copy source: `hiringDesk.application.documents.*` (es-CL + en-US)

## Flow Brief

- Primary user: reclutador / hiring manager / People Ops con `hiring.application.read`; el reveal exige además `hiring.candidate.reveal_identity` (TASK-1714).
- Entry moment: abrió la ficha del candidato para evaluarlo o preparar la contratación y necesita leer su CV.
- Successful outcome: el CV se abre en un visor en menos de dos clics; el operador ve qué documentos existen realmente y su estado; si el proceso lo exige, revela la identidad dejando una entrada de auditoría verdadera.
- Primary decision/action: **abrir** un documento (lectura, sin fricción) o **revelar** la identidad (fricción deliberada con motivo).
- Non-goals: subir/reemplazar documentos; resolver cuarentenas; editar el perfil legal; navegar a Person 360 (el candidato aún no es member).

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile / compact behavior | Primitive |
|---|---|---|---|---|
| Application 360 · tab Documentos | panel principal; dos grupos semánticos | grupos apilados, fila en una línea con acciones a la derecha | fila en columna; acciones full-width bajo el meta | `Paper` + `Stack` (patrón TASK-355) |
| Diálogo del visor | lectura del CV/portafolio SIN salir del portal | `Dialog maxWidth='lg'`, alto 90vh, documento embebido sobre blob same-origin | mismo diálogo; si el navegador no embebe PDF, estado explícito + salidas | `GreenhouseDocumentPreview` |
| Dialog "Revelar documento de identidad" | fricción + captura del motivo | `Dialog maxWidth='sm'` centrado | fullWidth con márgenes | MUI `Dialog` + `CustomTextField` |
| Snackbar | feedback de "Copiado" y de errores recuperables | bottom-right | idem | `Snackbar` existente del view |

## Flow Map

```
  Application 360 (tab Resumen/Evaluación)
            │  click tab "Documentos"
            ▼
  ┌─────────────────────────────────────────────────┐
  │ Panel Documentos (server-rendered con el reader)│
  └──────────┬───────────────────────┬──────────────┘
             │                       │
   [Abrir/Descargar]          [Revelar (requiere motivo)]
             │                       │
             ▼                       ▼
   Diálogo del visor (portal)  Dialog reveal (motivo ≥5)
   (PDF inline / descarga)              │
             │                    ┌─────┴──────┐
             │              Cancelar      Revelar y registrar
             │                    │             │
             ▼                    ▼             ▼
   vuelve al panel          panel intacto   POST /reveal (TASK-1714)
   (nada cambió de estado)   foco restaurado      │
                                          ┌───────┴────────┐
                                        200              403/500
                                          │                │
                                          ▼                ▼
                              fila revelada en memoria   Alert en el dialog
                              [Copiar] [Ocultar]        (403 → sin Reintentar)
                                          │
                                    [Ocultar] / reload
                                          │
                                          ▼
                                  vuelve a enmascarado
```

## Interaction Triggers

| Trigger | Origen | Efecto | Guarda |
|---|---|---|---|
| Click tab "Documentos" | tabs del Application 360 | muestra el panel ya renderizado en servidor | ninguna (los datos vienen con la page) |
| Click "Ver" (archivo) | fila de `files[]` | abre el diálogo del visor dentro del portal | solo si `status ∈ {available, legacy_unscanned}` |
| Click "Descargar" (archivo) | fila de `files[]` | descarga con `Content-Disposition: attachment` | idem |
| Click "Abrir" (enlace) | fila de `links[]` | abre la URL del candidato en pestaña nueva | URL ya saneada https-only en el intake (TASK-1367) |
| Click "Revelar (requiere motivo)" | fila de identidad | abre el dialog, foco al campo Motivo | solo si `canRevealIdentity === true` |
| Escribir motivo | dialog | habilita el CTA al llegar a 5 caracteres | `trim().length >= 5` (espeja el backend) |
| Click "Revelar y registrar" | dialog | `POST` reveal; bloquea Esc y el botón mientras corre | motivo válido + no hay request en vuelo |
| Click "Copiar" | fila revelada | `navigator.clipboard.writeText` + toast | valor presente en memoria |
| Click "Ocultar" | fila revelada | borra el valor del estado; vuelve a la máscara | — |
| `Esc` / click-away | dialog | cierra sin revelar; foco al disparador | bloqueado durante `revealing` |

## State Machine

```
                    ┌──────────┐
                    │  masked  │◄──────────── "Ocultar" / remount / reload
                    └────┬─────┘
              "Revelar"  │  (solo si canRevealIdentity)
                         ▼
                  ┌─────────────┐   Esc/Cancelar   ┌──────────┐
                  │ reason-entry├─────────────────►│  masked  │
                  └──────┬──────┘                  └──────────┘
            motivo ≥5 +  │
            "Revelar y registrar"
                         ▼
                  ┌─────────────┐
                  │  revealing  │  (Esc bloqueado, CTA en spinner)
                  └──┬───────┬──┘
                200  │       │  403 / 409 / 5xx
                     ▼       ▼
              ┌──────────┐  ┌──────────────────────────┐
              │ revealed │  │ reason-entry + error     │
              │ (memoria)│  │ 403 → actionable=false   │
              └──────────┘  │       (sin Reintentar)   │
                            └──────────────────────────┘
```

Estados del panel (independientes del reveal): `ready` · `reader-error` (Alert + Reintentar, **nunca** "sin documentos") · `identity-empty` (pre-decisión, estado normal) · `quarantine-present` (banner + fila bloqueada con causa).

## Routing Contract

- El tab Documentos **no cambia la ruta** — es estado local de tabs del `Application360View`, como los otros tres. No se agrega query param (consistente con TASK-355; el deep link por tab es follow-up de toda la vista, no de este panel).
- El visor **NO sale del SPA**: es un diálogo. `Esc` lo cierra y el foco vuelve al botón "Ver" que lo abrió. "Abrir en pestaña" sigue disponible como salida (accesibilidad + navegadores sin embed) y ésa sí sale, con `target='_blank' rel='noopener noreferrer'`.
- El dialog no empuja historia; `Esc` lo cierra sin afectar el back del browser.
- Sin deep link al reveal: revelar es un acto auditado, no un destino enlazable.

## Focus & Accessibility

- Al abrir el dialog: foco al campo Motivo (no al botón), porque el motivo es el trabajo real.
- Al cerrar (Cancelar / Esc / éxito): foco restaurado al botón "Revelar" que lo abrió.
- Durante `revealing`: `Esc` no cierra, el CTA queda `aria-busy='true'`; el usuario no puede disparar dos revelaciones (dos entradas de auditoría por un clic doble sería ruido en el trail).
- El valor revelado se anuncia en `role='status' aria-live='polite'`.
- Acciones deshabilitadas por cuarentena/pending llevan `aria-describedby` al texto que explica la causa.
- Cada acción tiene nombre accesible único que incluye el documento (no tres "Abrir" idénticos en el árbol).
- Orden de tabulación: grupo Archivos (fila por fila, acciones en orden visual) → grupo Identidad → dialog al abrirse (focus trap).

## Data & Command Boundaries

| Pieza | Contrato | Dónde corre | Nota |
|---|---|---|---|
| Paquete documental | `resolveCandidateDocuments({ candidateFacetId })` | server (page) | `server-only`; no degrada en silencio — si falla, la page lo captura y el panel muestra `loadError` |
| Autorización de lectura | `canAccessHiringCandidateDocument(tenant)` | server (page) + ruta de asset | capability `hiring.application.read`; `client_*` denegado por `tenantType` |
| Bytes del documento | `GET /api/assets/private/[assetId]` | ruta existente | re-autoriza con `canTenantAccessAsset`; `quarantined` rechazado por `downloadPrivateAsset` aunque la UI se equivocara |
| Reveal de identidad | `POST /api/hiring/candidate-facets/[facetId]/identity-documents/[documentId]/reveal` | ruta nueva (**TASK-1714**) | capability `hiring.candidate.reveal_identity` + motivo ≥5 + audit append-only + outbox |
| Permiso de reveal | `can(tenant,'hiring.candidate.reveal_identity','read','tenant')` | server (page) → prop | la UI **no** decide autorización; solo decide si dibuja el affordance |

**Full API Parity:** el panel es un cliente delgado. Toda la lógica (qué documentos existen, en qué estado, quién puede revelar, qué se audita) vive en `src/lib/hiring/documents/**`. Nexa y MCP operan los mismos contratos por construcción; no hay integración conversacional específica en esta task.

## Failure Paths

| Falla | Detección | Comportamiento de UI | Recuperación |
|---|---|---|---|
| El navegador no embebe PDF (móvil) | `navigator.pdfViewerEnabled === false` | el diálogo dice "tu navegador no muestra PDF dentro de la página" + Abrir/Descargar; NO descarga los bytes | abrir en pestaña o descargar |
| Reader falla (PG caído, facet inexistente) | excepción en la page | Alert `loadError` en el panel; el resto de la ficha sigue usable | Reintentar (reload del segmento) |
| Archivo en cuarentena | `status='quarantined'` | fila con chip + causa; acción sin `href` | ninguna en esta superficie (triage es de storage) |
| Archivo aún escaneando | `status='pending'` | chip Procesando + "vuelve en unos minutos" | reintentar más tarde |
| Asset borrado entre render y clic | el fetch del visor responde 404 | el diálogo muestra su estado de error con la salida "Abrir en pestaña" | cerrar y recargar la ficha |
| Sin capability de reveal | prop `canRevealIdentity=false` | el botón "Revelar" **no se dibuja**; queda el caption explicativo | pedir el permiso (copy lo dice) |
| Capability revocada entre render y POST | 403 canónico | Alert `revealDenied` en el dialog, **sin** botón Reintentar (`actionable=false`) | cerrar |
| Documento archivado/expirado | 409 `reveal_disabled_for_status` | mensaje canónico del backend | cerrar |
| Motivo <5 caracteres | validación cliente + backend | CTA disabled + helper; el backend re-valida | escribir más |
| Red caída durante el POST | error de fetch | Alert `revealError` (`actionable=true`) con Reintentar; **el motivo escrito se conserva** | Reintentar |

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/task1712-application-documents.yaml`
- Route: `/agency/hiring/applications/[applicationId]` (seed determinista con CV `available`, link de portafolio, LinkedIn, archivo `quarantined`, identidad enmascarada)
- Viewports: 1440×900 + 390×844 · Quality profile `premium`
- Required steps: tab Documentos → panel → dialog con motivo inválido → motivo válido → Esc → foco restaurado → mobile
- Required captures: `documents-panel`, `documents-quarantine-row`, `reveal-dialog-invalid`, `reveal-dialog-valid`, `focus-restore`, `mobile-panel`
- Required `data-capture` markers: `hiring-documents-panel`, `hiring-documents-files`, `hiring-documents-identity`, `hiring-documents-reveal-dialog`
- Assertions: la fila del CV expone `<a href>` real a `/api/assets/private/`; ninguna fila de archivo dice "Enmascarado"; sin errores de consola; `scrollWidth == clientWidth` en ambos viewports
- Reduced-motion / focus evidence: captura con `prefers-reduced-motion: reduce` + ciclo abrir→Esc→foco

## Design Decision Log

- **DDL-1 — Abrir ≠ revelar.** El flujo tiene dos velocidades deliberadas: leer un CV es de un clic (es el trabajo), revelar una identidad cuesta un dialog y un motivo (es la excepción). El mockup les puso el mismo precio y por eso el precio dejó de significar algo.
- **DDL-2 (corregido en implementación) — El CV se lee DENTRO del portal.** La versión original de este contrato decía "el visor es el del browser, en pestaña nueva". **Estaba mal, y el operador lo corrigió durante la implementación:** mandar el CV a otra pestaña rompe el contexto justo cuando se está evaluando a esa persona, y —peor— delegaba los 12 estados al visor del sistema, donde no podemos decir nada honesto sobre un 403, un archivo en cuarentena o una carga lenta. La decisión vigente es un **diálogo dentro del portal** que muestra el documento sobre un blob same-origin, con "Descargar" y "Abrir en pestaña" como salidas.
- **DDL-2b — El motor es el del navegador, NO `react-pdf`.** Se intentó primero con `react-pdf` (ya estaba en el repo, con dos consumidores) y **no arranca bajo `pnpm dev`**, que corre `next dev --webpack`: `pdfjs-dist` v5 es ESM y el interop de webpack lo rompe al evaluarlo. Y aun sin ese bug, el motor nativo gana donde importa: 0 KB de JS contra ~400 KB, render fuera del hilo principal, y zoom/búsqueda/impresión ya conocidos. `react-pdf` sólo se justifica cuando necesitemos algo que el navegador no da —anotar el CV, o render inline en móvil.
- **DDL-2c — El hueco de móvil se cierra por CAPACIDAD, no por viewport.** `navigator.pdfViewerEnabled === false` es la respuesta del propio navegador a "¿sé pintar un PDF embebido?". Los móviles dicen que no y muestran un marco EN BLANCO — la misma degradación silenciosa que esta task vino a eliminar del panel. Cuando la capacidad falta, el diálogo lo dice y ofrece la salida real, y ni siquiera descarga los bytes.
- **DDL-3 — Los datos llegan del servidor, no de un fetch.** `resolveCandidateDocuments` es `server-only` y es un reader canónico del 360 (no degrada en silencio). Resolverlo en la page preserva ese invariante y evita un estado de carga extra en un tab que debe sentirse instantáneo.
- **DDL-4 — El valor revelado no se persiste en cliente.** Vive en el estado del componente y muere con él. Que un reload exija revelar de nuevo (y escriba otra entrada de auditoría) es el comportamiento correcto: el trail refleja accesos reales, no una sesión que se quedó abierta.
- **DDL-5 — El affordance sigue a la capability, no al revés.** Si el operador no puede revelar, no ve un candado que lo invite a intentarlo: ve la explicación de a quién pedírselo. Un botón que siempre falla es peor que ningún botón.

## Acceptance Checklist

- [x] Cada superficie del flujo tiene su comportamiento desktop y mobile declarado.
- [x] La máquina de estados cubre éxito, error recuperable y error estructural.
- [x] El contrato de foco cubre apertura, cierre, restauración y bloqueo durante el command.
- [x] Las fronteras de datos nombran reader, command, capability y dónde corre cada uno.
- [x] Los failure paths distinguen `actionable=true` de `actionable=false` según el contrato canónico de errores.
- [x] El flujo referencia el master UI flow del programa y declara qué nodo completa (N5).
- [x] El GVC plan es ejecutable sin re-decidir arquitectura.
