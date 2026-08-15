# TASK-1715 / Application 360 — Panel de Documentos real (abrir el CV, revelar solo la identidad)

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1715 — Application 360 documents panel: cablear el reader real, visor del CV y reveal auditado de identidad`
- Product Design asset: docs/ui/visual-directions/TASK-1715-application-360-documents-direction.md
- Visual direction mode: repo-native-benchmark
- Linaje de la dirección: deriva del canvas Hiring Desk aprobado (TASK-355, HTML Claude Design `~/Documents/carreers/Hiring-Desk/Hiring-Desk/Hiring Desk.dc.html`), tab **Documentos** de la Application 360. Esta task **conserva** la composición aprobada (filas con icon-tile + label + detalle + acción a la derecha) y corrige su semántica: el mockup trataba CV e identidad como el mismo objeto "sensible con candado". No hay asset Figma nuevo; el patrón de identidad enmascarada se toma del Person 360 legal profile (TASK-784), dirección vigente para PII. La referencia visual es el propio desk (TASK-355/1422) y el reveal enmascarado del Person 360; no hay fuente externa.
- Intended consumers: reclutador / hiring manager / People Ops en `/agency/hiring/applications/[applicationId]` (tab Documentos).
- Copy source: `src/lib/copy/dictionaries/{es-CL,en-US}/hiringDesk.ts` → namespace `application.documents.*` (nuevo) + reuso de `common.*`.
- Primitive decision: **reuse** — `Paper variant='outlined'` + filas `Stack` (composición ya aprobada en 355), `GreenhouseChip kind='status'`, `GreenhouseButton`, MUI `Dialog`/`Alert`/`Snackbar`/`Skeleton`, `CustomTextField` para el motivo. CERO primitives nuevas.
- UI ready target: `yes`

## Brief

- Primary user: reclutador/hiring manager que abre la ficha del candidato para **leer su CV** antes de evaluarlo o decidir.
- User moment: está en la Application 360, tab Documentos. Hoy ve tres filas **hardcodeadas** (`Application360View.tsx:1144-1147`) que no corresponden a ningún archivo real: el CV siempre dice "Enmascarado" aunque el candidato lo haya subido, y el botón "Revelar (requiere motivo)" solo cambia un `useState` local (`Application360View.tsx:355-368`). No hay forma de leer el CV desde el portal.
- Job to be done: abrir el CV del candidato en un visor, ver de un vistazo qué documentos existen realmente y en qué estado, y —solo cuando la ley y el proceso lo justifican— revelar el documento de identidad dejando trazabilidad real.
- Primary decision signal: el reclutador puede leer el CV sin salir del portal y sin pedirle permiso a nadie; el candado queda reservado al único dato que lo merece.
- Non-goals: subir documentos desde el desk (el intake vive en Careers/TASK-1367 y la captura de identidad en `captureCandidateIdentityDocument`); triage de cuarentena (superficie de storage, no de hiring); editar el perfil legal de la persona; PDF viewer propio (usamos el nativo del browser).

## Decisión semántica que esta task corrige (raíz del rediseño)

El modelo canónico de `src/lib/hiring/documents/types.ts` distingue **dos clases de documento** que el mockup aplastó en una:

| | `CandidateDocumentFile` (CV, portafolio) | `CandidateIdentityDocument` (RUT/pasaporte) |
|---|---|---|
| Campo de acceso | `downloadUrl: string \| null` | `displayMask` (nunca `value_full`) |
| Contrato | se **abre**; autorizado por `hiring.application.read` | se **revela**; capability + motivo + audit append-only |
| Cuándo existe | desde el apply público | solo post-decisión favorable (guardrail en `capture-identity-document.ts`) |
| `null` significa | cuarentena o pending, **no** "protegido" | — |

Consecuencia de layout: **dos grupos visualmente distintos**, no una lista uniforme con tres candados. Un candado que no protege nada enseña al operador a ignorar los candados que sí protegen.

## Layout Skeleton

### Tab Documentos — dos grupos

```
┌ Application 360 · tab Documentos ─────────────────────────────────────────┐
│ Documentos del candidato                                                   │
│ El CV se abre; la identidad se revela con motivo y queda auditada.         │
│                                                                            │
│ {si quarantinedCount > 0}                                                  │
│ [Alert warning ⚠ "1 archivo quedó en cuarentena…"]  ← solo si aplica       │
│                                                                            │
│ ┌ GRUPO 1 · Archivos y enlaces ───────────────────────────────────────┐    │
│ │ [📄] Currículum (CV)                          [Abrir ↗] [Descargar] │    │
│ │      candidato-cv.pdf · 240 KB · subido 12 ago                       │    │
│ │ ──────────────────────────────────────────────────────────────────── │    │
│ │ [🌐] Portafolio                                            [Abrir ↗] │    │
│ │      behance.net/luisina                                             │    │
│ │ ──────────────────────────────────────────────────────────────────── │    │
│ │ [in] LinkedIn                                              [Abrir ↗] │    │
│ │      linkedin.com/in/luisina-hernandez                               │    │
│ └──────────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│ ┌ GRUPO 2 · Identidad  [chip Sensible] ───────────────────────────────┐    │
│ │ [🪪] RUT · Chile              [chip Verificado]                      │    │
│ │      12.345.•••-•              [🔒 Revelar (requiere motivo)]        │    │
│ └──────────────────────────────────────────────────────────────────────┘    │
│  caption: "Revelar deja tu nombre, la hora y el motivo en la auditoría."   │
└────────────────────────────────────────────────────────────────────────────┘
```

- **Grupo 1 no tiene candados.** La autorización ya ocurrió al entrar a la ficha (`hiring.application.read` en la page + `canAccessHiringCandidateDocument` en el asset). Poner un candado aquí es teatro.
- **Grupo 2 solo aparece si `identityDocuments.length > 0`.** Antes de la decisión favorable no existe documento de identidad —por diseño legal— así que el grupo se reemplaza por una línea explicativa, no por una fila enmascarada falsa.
- El header de sección usa `Typography variant='overline'` + chip; no una card anidada (regla anti card-on-card del standard premium).

### Fila de archivo — estados por `CandidateDocumentStatus`

```
available          [📄] Currículum (CV)         cv.pdf · 240 KB · 12 ago      [Abrir ↗][Descargar]
legacy_unscanned   [📄] Currículum (CV)  [chip Sin escanear]                  [Abrir ↗][Descargar]
                        Subido antes del escaneo automático.
quarantined        [⚠] Currículum (CV)  [chip Cuarentena]                     [—  sin acción]
                        El escáner lo bloqueó. Pídele al candidato que lo reenvíe.
pending            [⏳] Currículum (CV)  [chip Procesando]                     [—  sin acción]
                        Se está escaneando. Vuelve a intentar en unos minutos.
(ningún archivo)   [📄] Currículum (CV)                                        [—]
                        El candidato no adjuntó CV.
```

`quarantined` y "no adjuntó" son **filas distintas con copy distinto**: el reader ya los distingue (`downloadUrl: null` en ambos casos, pero `status` diferente) y confundirlos hace que el reclutador culpe al candidato por un bloqueo del escáner.

### Dialog de reveal — motivo real

```
┌ Dialog "Revelar documento de identidad" ─────────────────┐
│ Vas a ver el número completo del RUT de Luisina          │
│ Hernandez.                                                │
│                                                           │
│ [Alert info] Queda registrado tu nombre, la hora y este   │
│              motivo. Es auditable.                        │
│                                                           │
│ Motivo *                                                  │
│ [CustomTextField multiline rows=3]                        │
│ helper: "Mínimo 5 caracteres. Ej.: preparación de         │
│          contrato para la contratación aprobada."         │
│                                                           │
│              [Cancelar]  [🔓 Revelar y registrar]         │
└───────────────────────────────────────────────────────────┘
        ↓ éxito
┌ Fila de identidad, revelada en esta sesión ──────────────┐
│ [🪪] RUT · Chile   [chip Verificado]  [chip Revelado]     │
│      12.345.678-9                    [Copiar] [Ocultar]  │
└───────────────────────────────────────────────────────────┘
```

- El valor revelado **vive solo en memoria del componente**: no se persiste, no entra a un store global, y "Ocultar" lo borra. Recargar la página vuelve a enmascarado (y un reveal nuevo escribe otra entrada de auditoría — correcto, no un bug).
- `Revelar y registrar` queda `disabled` hasta que el motivo tenga ≥5 caracteres, espejando la validación del backend (`revealPersonIdentityDocument` exige `reason.trim().length >= 5`).

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Header del tab | título + promesa honesta | `Typography` existentes | copy `application.documents.*` |
| 1 | Alerta de cuarentena | visible solo si `quarantinedCount > 0` | `Alert severity='warning'` | `documents.quarantinedCount` |
| 2 | Grupo Archivos y enlaces | filas de `files[]` + `links[]` | `Paper variant='outlined'` + `Stack` (patrón 355) | `resolveCandidateDocuments()` |
| 3 | Acción de archivo | abrir inline / descargar | `GreenhouseButton kind='secondaryAction'` + `component='a'` | `GET /api/assets/private/[assetId]?inline=1` |
| 4 | Grupo Identidad | fila enmascarada + reveal | `Paper variant='outlined'` + `GreenhouseChip` | `documents.identityDocuments[]` |
| 5 | Dialog de reveal | motivo + confirmación | `Dialog` + `CustomTextField` (patrón desk) | `POST …/identity-documents/[id]/reveal` (TASK-1714) |
| 5b | Diálogo del visor | leer el CV sin salir del portal | `Dialog maxWidth='lg'` 90vh + `GreenhouseDocumentPreview` | blob same-origin desde `/api/assets/private/[assetId]?inline=1` |
| 6 | Fila revelada | valor + copiar + ocultar | `Stack` + `GreenhouseButton` | respuesta del reveal (memoria) |
| 7 | Estado de error | fallo del reader o del reveal | `Alert severity='error'` | `CanonicalApiError` |

## Desktop Target

A **1440×900** el panel ocupa el canvas del tab dentro del `HiringDeskFrame`, sin card anidada
sobre card. Cada grupo es un `Paper variant='outlined'` (`borderRadius: 3`) precedido por un
`Typography variant='overline'`; el grupo Identidad suma el chip `Sensible` en su encabezado.

Cada fila mide 44 px de icon-tile + contenido, con `p: 2.5` y divisor de 1 px entre filas
(exactamente la métrica ya aprobada en TASK-355, que esta task no re-decide). El contenido se
resuelve en una línea: icon-tile → `Typography fontWeight={650}` con el label y su chip de
estado → meta secundaria en `body2 color='text.secondary'` debajo → acciones alineadas al
extremo derecho con `Stack direction='row' spacing={1}`. La columna de acciones queda alineada
verticalmente entre filas para que el ojo baje sin tropezar.

Jerarquía vertical: alerta de cuarentena (solo si aplica) → grupo **Archivos y enlaces**
(2 a 5 filas, el trabajo diario) → grupo **Identidad** (1 fila, la excepción) → caption de
consecuencia. Lo frecuente arriba y ligero; lo delicado abajo, denso y quieto.

El ancho de contenido hereda el del tab (sin `maxInlineSize` propio) para no introducir una
medida nueva en una vista que ya tiene la suya.

## Mobile Target

A **390×844** la fila colapsa a columna vía `Stack direction={{ xs: 'column', sm: 'row' }}`:
icon-tile y label arriba, meta debajo, acciones `fullWidth` al final. Las acciones **nunca**
comparten línea con el label — es el mismo overlap que el loop GVC de TASK-1422 detectó en
esta familia de filas y que aquí se evita por construcción.

El chip de estado usa `alignSelf: 'flex-start'` para no estirarse al ancho de la columna
(regresión ya vista y corregida en 1422). Los nombres de archivo largos rompen con
`overflowWrap: 'anywhere'` en vez de empujar el layout. Cuando hay dos acciones (Abrir +
Descargar) se apilan con `spacing={1}`, cada una a ancho completo, con Abrir primero por ser
la acción esperada.

El dialog de reveal va `fullWidth` con los márgenes por defecto del `Dialog` MUI; el campo
Motivo conserva sus 3 filas. `scrollWidth == clientWidth` es assertion del GVC en este
viewport.

## Action Hierarchy

| Nivel | Acción | Peso visual | Ubicación | Razón |
|---|---|---|---|---|
| 1 — primaria | **Ver** (CV) | MUI `Button variant='outlined'` + `tabler-eye` | primera acción de la primera fila | es el trabajo central del tab; abre el visor DENTRO del portal |
| 2 — secundaria | **Descargar** | `Button variant='text'` | junto a Ver | alternativa del mismo dato, no una acción distinta |
| 2 — secundaria | **Abrir** (enlaces) | `Button variant='outlined'` | filas de portafolio/LinkedIn | un enlace externo del candidato SÍ sale del portal: no es un documento nuestro |
| 3 — excepcional | **Revelar (requiere motivo)** | `tabler-lock`, en el grupo inferior, con caption de consecuencia | única acción del grupo Identidad | la fricción es el mensaje; separarla del bloque de lectura es lo que le devuelve significado |
| 4 — contextual | **Copiar** / **Ocultar** | aparecen solo tras un reveal exitoso | reemplazan a Revelar en la fila | no existen hasta que hay valor que copiar u ocultar |
| 0 — sin acción | filas `quarantined` / `pending` / sin archivo | sin botón, con causa adyacente | en su fila | un botón que siempre falla es peor que ningún botón |

No hay acción primaria de página: este tab es de lectura y su CTA dominante (`Decidir`) vive
en el header de la Application 360 y no compite con el panel.

## Visual Fidelity Mapping

| Intención de diseño | Implementación tokenizada | Prohibido |
|---|---|---|
| Contenedor de grupo | `Paper variant='outlined'` + `borderRadius: 3` | `boxShadow` literal, card dentro de card |
| Encabezado de grupo | `Typography variant='overline'` + `color='text.secondary'` | `fontSize` inline |
| Chip `Sensible` | `GreenhouseChip kind='status' variant='label' tone='warning'` | `Chip` MUI crudo con `sx={{ bgcolor: '#…' }}` |
| Chip `Cuarentena` | `GreenhouseChip … tone='error'` | color como único portador de significado (siempre ícono + texto) |
| Chip `Procesando` | `GreenhouseChip … tone='info'` | spinner infinito sin explicación |
| Chip `Sin escanear` | `GreenhouseChip … tone='warning'` | ocultar el archivo por no estar escaneado |
| Chip `Revelado` | `GreenhouseChip … tone='success'` | animación de "desbloqueo" sobre el dato sensible |
| Icon-tile de archivo | `display: grid; placeItems: center`, 44×44, `borderRadius: 2`, fondo `primary.lightOpacity` | HEX literal, PNG de ícono |
| Icon-tile sensible / bloqueado | mismo tile con `warning.lightOpacity` / `error.lightOpacity` y color del token | dos sistemas de color paralelos |
| Acción de fila | MUI `Button` `variant='outlined'` (primaria) / `variant='text'` (secundaria) + anillo de foco explícito | `variant='tonal'` (3.69:1, falla AA) · `outlineColor: 'primary.main'` en `sx` (NO se mapea a la paleta: sale como CSS inválido y el anillo no se dibuja — usar `var(--mui-palette-primary-main)`) |
| Diálogo del visor | `Dialog maxWidth='lg'` + `blockSize: 90vh`; documento sobre blob same-origin | `react-pdf`/pdf.js (roto bajo `next dev --webpack`, y ~400 KB para lo que el navegador ya hace) |
| Meta del archivo | `body2` + `color='text.secondary'` + `overflowWrap: 'anywhere'` | truncado con `…` que esconde el nombre real |
| Separador entre filas | `borderBlockEnd: 1` + `borderColor: 'divider'` | `<hr>` o border con color literal |
| Espaciado | escala `4n` del tema (`p: 2.5`, `spacing={1|2}`) | píxeles arbitrarios |
| Dialog de reveal | `Dialog maxWidth='sm'` + `CustomTextField` | drawer (el reveal es puntual, no una tarea larga) |
| Motion | transición por defecto del `Dialog`; `prefers-reduced-motion` la desactiva | animar la aparición del valor revelado |

## Copy Ledger (`hiringDesk.application.documents.*`, bilingüe es-CL + en-US)

| Copy id | Region | Text es-CL | Dynamic values | Notes |
|---|---|---|---|---|
| `documents.title` | 0 | Documentos del candidato | — | reusa la key existente `application.documentsTitle` |
| `documents.subtitle` | 0 | El CV se abre directo; la identidad se revela con motivo y queda auditada. | — | reemplaza "PII protegida por capability, motivo y auditoría" (prometía candado sobre el CV) |
| `documents.filesGroup` | 2 | Archivos y enlaces | — | `overline` |
| `documents.identityGroup` | 4 | Identidad | — | `overline` + chip `Sensible` |
| `documents.sensitiveChip` | 4 | Sensible | — | `GreenhouseChip tone='warning'` |
| `documents.view` | 3 | Ver | — | `tabler-eye`; abre el visor DENTRO del portal |
| `documents.open` | 3 | Abrir | — | `tabler-external-link`; sólo para enlaces (portafolio/LinkedIn) |
| `documents.download` | 3 | Descargar | — | `tabler-download`; solo archivos |
| `documents.cvLabel` | 2 | Currículum (CV) | — | |
| `documents.portfolioFileLabel` | 2 | Portafolio (archivo) | — | `kind='portfolio_file'` |
| `documents.portfolioLinkLabel` | 2 | Portafolio | — | `link kind='portfolio'` |
| `documents.linkedinLabel` | 2 | LinkedIn | — | `link kind='linkedin'` |
| `documents.fileMeta` | 2 | {fileName} · {size} · subido {date} | `fileName`,`size`,`date` | `size` con `formatBytes`; `date` es-CL corto |
| `documents.noCv` | 2 | El candidato no adjuntó CV. | — | ≠ cuarentena |
| `documents.noPortfolio` | 2 | Sin portafolio informado. | — | |
| `documents.statusQuarantined` | 2 | Cuarentena | — | chip `tone='error'` |
| `documents.quarantinedBody` | 2 | El escáner de seguridad bloqueó este archivo. Pídele al candidato que lo reenvíe. | — | nunca culpa al candidato de "archivo inválido" |
| `documents.statusPending` | 2 | Procesando | — | chip `tone='info'` |
| `documents.pendingBody` | 2 | Se está escaneando. Vuelve a intentar en unos minutos. | — | |
| `documents.statusLegacy` | 2 | Sin escanear | — | chip `tone='warning'` |
| `documents.legacyBody` | 2 | Se subió antes del escaneo automático. | — | honesto, no bloquea |
| `documents.quarantineBanner` | 1 | {count} archivo(s) de este candidato quedaron en cuarentena. | `count` | Alert warning |
| `documents.identityEmpty` | 4 | Aún no se registra documento de identidad. Se captura después de una decisión favorable. | — | explica el porqué legal, no simula un candado |
| `documents.identityMaskedHint` | 4 | Revelar deja tu nombre, la hora y el motivo en la auditoría. | — | caption bajo el grupo |
| `documents.reveal` | 4 | Revelar (requiere motivo) | — | `tabler-lock` |
| `documents.revealDialogTitle` | 5 | Revelar documento de identidad | — | |
| `documents.revealDialogBody` | 5 | Vas a ver el número completo del documento de {name}. | `name` | |
| `documents.revealAuditNotice` | 5 | Queda registrado tu nombre, la hora y este motivo. Es auditable. | — | Alert info — **ahora es verdad** |
| `documents.revealReasonLabel` | 5 | Motivo | — | requerido |
| `documents.revealReasonHelper` | 5 | Mínimo 5 caracteres. Ej.: preparación de contrato para la contratación aprobada. | — | espeja validación backend |
| `documents.revealConfirm` | 5 | Revelar y registrar | — | key existente `application.revealConfirm` |
| `documents.revealed` | 6 | Revelado | — | chip `tone='success'` |
| `documents.copyValue` | 6 | Copiar | — | |
| `documents.copied` | 6 | Copiado. | — | toast |
| `documents.hideValue` | 6 | Ocultar | — | borra el valor de memoria |
| `documents.revealDenied` | 5 | No tienes permiso para revelar documentos de identidad. Pídeselo a Admin o a People Ops. | — | `actionable=false` → sin botón Reintentar |
| `documents.revealError` | 5 | No pudimos revelar el documento. Intenta de nuevo. | — | `actionable=true` |
| `documents.loadError` | 7 | No pudimos cargar los documentos de este candidato. | — | reader falló; NUNCA se muestra como "sin documentos" |
| `documents.retry` | 7 | Reintentar | — | reusa `common.retry` |
| `documents.viewerTitle` | 5b | {document} de {name} | `document`,`name` | título del diálogo del visor |
| `documents.viewerLoading` | 5b | Abriendo el documento… | — | `role='status'` |
| `documents.viewerLoadError` | 5b | No pudimos mostrar este documento acá. | — | con salidas Abrir/Descargar |
| `documents.viewerNoEmbed` | 5b | Tu navegador no muestra PDF dentro de la página. Ábrelo en una pestaña o descárgalo. | — | `navigator.pdfViewerEnabled === false` (móvil) — NUNCA un marco en blanco |
| `documents.viewerUnsupported` | 5b | No podemos previsualizar {fileName} en el portal. | `fileName` | el TIPO no es previsualizable (≠ noEmbed) |
| `documents.viewerOpenInNewTab` | 5b | Abrir en pestaña nueva | — | salida accesible + fallback |
| `documents.viewerFrameTitle` | 5b | Documento {fileName} | `fileName` | nombre accesible del marco (axe `frame-title`) |
| `documents.viewAriaLabel` | 3 | Ver {document} de {name} sin salir del portal | `document`,`name` | |

(en-US mirror con las mismas keys.)

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | Documentos del candidato | grupos 1 y 2 poblados con el paquete real | Abrir / Descargar / Revelar | estado por defecto tras resolver el reader |
| loading | — | `Skeleton` con la forma de 3 filas | — | server component: el skeleton lo aporta el Suspense del tab |
| empty | — | `noCv` y `noPortfolio` en sus propias filas | — | las filas **siempre** se renderizan; el vacío se dice en la fila, no borrando la sección |
| partial | — | `quarantineBanner` + fila con chip `Cuarentena` / `Procesando` / `Sin escanear` | Abrir solo si `legacy_unscanned` | degradación honesta por archivo: `quarantined` y `pending` pierden la acción con causa adyacente; `legacy_unscanned` sí abre |
| error | — | `loadError` | Reintentar | el reader falló; jamás se muestra como "sin documentos" |
| denied | — | `revealDenied` (403) o ausencia del botón (sin capability) | sin Reintentar | `actionable=false` del contrato canónico; sin capability el affordance no se dibuja |
| identity-empty | — | `identityEmpty` | — | estado normal pre-decisión, no un error |
| revealing | — | spinner en el CTA del dialog | — | dialog no cierra; Esc bloqueado durante el POST |
| revealed | — | valor visible + chip `Revelado` | Copiar / Ocultar | solo en memoria del componente |
| mobile | — | fila en columna: meta arriba, acciones full-width abajo | — | 390px sin scroll horizontal |
| keyboard | — | foco visible en cada acción; dialog con focus trap | — | foco restaurado al botón "Revelar" al cerrar |
| reduced-motion | — | sin transición del dialog | — | guard existente del frame |

## Accessibility Contract

- Heading order: page h1 (frame Application 360) → `h5` "Documentos del candidato" → `overline` de grupo con `role='group'` + `aria-labelledby`.
- Cada fila es un `<li>` dentro de `<ul role='list'>`; el nombre accesible de la acción incluye el documento: `aria-label="Abrir currículum de Luisina Hernandez"` — nunca un "Abrir" suelto repetido tres veces.
- Acciones deshabilitadas (cuarentena/pending) no usan `disabled` mudo: llevan `aria-describedby` apuntando al body que explica la causa (un botón disabled sin explicación es una trampa de accesibilidad).
- Dialog de reveal: `Dialog` MUI (focus trap), `aria-labelledby` al título, foco inicial en el campo Motivo, `Esc` cierra salvo durante `revealing`, foco restaurado al disparador.
- Campo Motivo: `required`, `aria-invalid` + `aria-describedby` al helper; el error de longitud se anuncia `role='alert'`.
- Reveal exitoso: el valor se anuncia en un contenedor `role='status' aria-live='polite'`; el chip "Revelado" acompaña con texto, no solo color.
- Estados por color siempre acompañados de ícono + texto (cuarentena = ⚠ + "Cuarentena", no solo rojo).
- Targets ≥24px; `scrollWidth == clientWidth` en 1440 y 390.
- El valor revelado nunca entra al DOM antes del reveal (no hay `display:none` con el dato); llega del POST.

## Implementation Mapping

- Route / surface: `/agency/hiring/applications/[applicationId]` tab `documents` — page `src/app/(dashboard)/agency/hiring/applications/[applicationId]/page.tsx` + `src/views/greenhouse/hiring/Application360View.tsx`.
- Primitives: `Paper variant='outlined'`, `Stack`, `GreenhouseChip kind='status'`, `GreenhouseButton` (`secondaryAction`), MUI `Dialog`/`Alert`/`Snackbar`, `CustomTextField`. Sin kinds nuevos.
- Component candidates: extraer el panel a un client component route-local `CandidateDocumentsPanel` en `src/views/greenhouse/hiring/` (el `Application360View` ya supera 1.400 líneas; el panel tiene estado propio de reveal). No entra al registry de primitives.
- Copy source: `getMicrocopy(locale).hiringDesk.application.documents` (es-CL + en-US + type `HiringDeskCopy`).
- Data reader: **server-side en la page** → `canAccessHiringCandidateDocument(tenant)` + `resolveCandidateDocuments({ candidateFacetId: application.candidateFacetId })`. El facet id ya viaja en el DTO (`HiringApplication.candidateFacetId`, `src/lib/hiring/store.ts:426`). NO se hace fetch cliente del paquete documental.
- Command: `POST /api/hiring/candidate-facets/[candidateFacetId]/identity-documents/[documentId]/reveal` (**TASK-1714**), consumido con `throwIfNotOk` para respetar el contrato canónico de errores (`code` + `actionable`).
- Descarga: `component='a'` a `/api/assets/private/[assetId]?inline=1` (abrir) y sin `?inline` (descargar). Ruta existente; ya autoriza por `canTenantAccessAsset` → `canAccessHiringCandidateDocument`.
- API parity: el reader y el reveal son contratos gobernados server-side; la UI es un cliente más (Nexa/MCP operan los mismos por construcción). Cero lógica de negocio en el componente.
- Access / capability: viewCode `gestion.hiring_application_detail` + `hiring.application.read` (ya gatean la page); el reveal exige además `hiring.candidate.reveal_identity` (TASK-1714), resuelta server-side y pasada como prop booleana.
- Print/email/PDF: n/a.
- GVC markers: `data-capture='hiring-documents-panel'`, `data-capture='hiring-documents-files'`, `data-capture='hiring-documents-identity'`, `data-capture='hiring-documents-reveal-dialog'`.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/task1712-application-documents.yaml` (nuevo).
- Route: `/agency/hiring/applications/[applicationId]` tab Documentos, con seed determinista (candidato con CV `available`, portafolio link, LinkedIn, un archivo `quarantined` y un documento de identidad enmascarado).
- Viewports: desktop 1440×900 + mobile 390×844.
- Quality profile: `premium`.
- Required steps: entrar al tab → capturar panel completo → abrir dialog de reveal → escribir motivo corto (botón disabled) → motivo válido → cerrar con Esc (foco restaurado) → captura mobile.
- Required captures: `documents-panel`, `documents-quarantine-row`, `reveal-dialog-invalid`, `reveal-dialog-valid`, `focus-restore`, `mobile-panel`.
- Required `data-capture` markers: `hiring-documents-panel`, `hiring-documents-files`, `hiring-documents-identity`, `hiring-documents-reveal-dialog`.
- Assertions: la fila del CV expone un `<a href>` real hacia `/api/assets/private/`; ninguna fila de archivo muestra la palabra "Enmascarado"; sin errores de consola; `scrollWidth == clientWidth` en ambos viewports.
- Scroll-width checks: panel base y dialog abierto (desktop + 390px).
- Reduced-motion / focus evidence: captura con `prefers-reduced-motion: reduce`; ciclo abrir→Esc→foco restaurado.
- Review dossier: `pnpm fe:capture:review task1712-application-documents`.
- Baseline decision / surface ID: superficie nueva dentro de una vista existente → baseline nuevo para el tab Documentos; el resto de la Application 360 conserva su baseline de TASK-355.

## Design Decision Log

- Decision: **dos grupos semánticos** (archivos/enlaces sin candado, identidad con reveal auditado) dentro de la misma composición de filas ya aprobada en TASK-355.
- Alternatives considered:
  - (a) *Mantener las tres filas uniformes y solo cablear el reveal del CV* — descartado: el modelo de dominio no tiene reveal para `CandidateDocumentFile`; construirlo sería inventar una capa de protección que ninguna spec pide, encarecer el trabajo diario del reclutador y diluir el candado real.
  - (b) *Visor PDF embebido en un drawer* — descartado para V1: el browser ya renderiza PDF con `Content-Disposition: inline` (la ruta lo soporta desde antes), y un visor propio agrega superficie sin agregar capacidad. Queda como follow-up si aparece la necesidad de anotar el CV.
  - (c) *Fetch cliente del paquete documental* — descartado: `resolveCandidateDocuments` es `server-only` y el reader canónico del 360 no degrada en silencio; resolverlo en la page mantiene el invariante y evita un spinner extra.
  - (d) *Reusar `person.legal_profile.reveal_sensitive` para el reveal* — descartado en TASK-1714 (ver su decision log): esa capability solo la tienen `EFEONCE_ADMIN`/`FINANCE_ADMIN` y otorgársela a HR abriría el reveal de **toda** persona del HR module.
- Why this pattern: es el mismo vocabulario visual del desk (filas con icon-tile, chips de estado, acción a la derecha) y el mismo patrón de reveal del Person 360. El operador no aprende nada nuevo; solo deja de encontrarse con un candado falso.
- Reuse / extend / new primitive: **reuse total**; `CandidateDocumentsPanel` es composición route-local.
- Open risks: (1) un candidato con muchas postulaciones acumula varios CV — el reader los devuelve todos ordenados por fecha; la UI los agrupa por `kind` y muestra el más reciente primero, con los anteriores en la misma lista (no se ocultan: son evidencia del proceso). (2) El `downloadUrl` del reader no se usa como href directo si expira; la UI construye la ruta estable `/api/assets/private/[assetId]` — verificar en Discovery cuál expone el reader.
- Follow-up: subir/reemplazar documentos desde el desk; triage de cuarentena; visor con anotaciones.

## Acceptance Checklist

- [x] All visible strings are in the copy ledger.
- [x] Dynamic values are named and bounded (`count`, `name`, `fileName`, `size`, `date`).
- [x] Partial/degraded states are explicit (quarantined / pending / legacy / reader error / permission denied).
- [x] No copy implies a guarantee when data is estimated — y se elimina el copy que **prometía** una auditoría inexistente.
- [x] Charts have table/text alternatives (n/a — sin charts).
- [x] State and aria copy is ready for implementation.
- [x] Implementation mapping names primitive, copy source, data contract and route/surface.
- [x] GVC scenario plan is specific enough for `pnpm fe:capture`.
- [x] Design decision log explains reuse/extend/new before JSX starts.
