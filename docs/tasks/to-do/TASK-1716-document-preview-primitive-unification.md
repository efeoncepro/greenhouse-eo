# TASK-1716 — Visor de documentos: verificar react-pdf bajo Turbopack y unificar las tres implementaciones

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Hay **tres** implementaciones paralelas de "previsualizar un asset privado" y las dos viejas usan
`react-pdf`, que **no arranca bajo `pnpm dev`**: `pdfjs-dist` v5 es ESM y el interop de webpack lo
rompe al evaluarlo. Ninguna de las dos lo reporta — ambas tapan el fallo con un error genérico. La
primera pregunta de esta task es si el fallo también ocurre bajo Turbopack (lo que usa `pnpm build`),
porque de eso depende si hay usuarios afectados o sólo desarrolladores.

## Why This Task Exists

Durante TASK-1715 se intentó reusar `react-pdf` —ya estaba en el repo con dos consumidores— y falló
con evidencia concreta:

```
TypeError: Object.defineProperty called on non-object
  at __webpack_require__.r (…/_next/static/chunks/webpack.js)
  at eval (webpack-internal:///…/node_modules/pdfjs-dist/build/pdf.mjs:1:21)
```

El import dinámico **rechaza en silencio** — sin error de red, sin `pageerror`. `transpilePackages:
['react-pdf', 'pdfjs-dist']` no lo resuelve. Se verificó bajo `pnpm dev`, que corre
`next dev --webpack`; **no** se verificó bajo Turbopack.

Dos consecuencias abiertas:

1. **Alcance del fallo desconocido.** Si Turbopack tampoco lo soporta,
   `CertificatePreviewDialog` y `ContractorSupportDocumentsPanel` están rotos **en producción** y sus
   usuarios ven "no pudimos mostrar el documento" sin explicación. Si es sólo webpack, están rotos
   sólo para quien desarrolla — molesto pero no incidente.
2. **`ContractorSupportDocumentsPanel` tiene además un bug propio:**
   `new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)` **no resuelve un especificador de
   módulo** — `new URL` trata el primer argumento como ruta relativa, así que apunta a un 404. Aunque
   pdf.js cargara, su worker no. `CertificatePreviewDialog` usa un CDN público (`unpkg`), que saca
   bytes de documentos privados fuera del perímetro y muere sin red: tampoco es aceptable.

Y por encima de todo: **tres implementaciones del mismo problema**. `TASK-1715` creó
`GreenhouseDocumentPreview` con el fetch→blob→render, la degradación honesta y la detección de
capacidad del navegador; mientras las otras dos existan, esa reutilización es una **hipótesis**, no un
hecho — el segundo consumidor es lo único que la convierte en hecho.

## Goal

- Saber, con evidencia, si `react-pdf` funciona bajo Turbopack o está roto en los dos bundlers.
- Un solo primitive de previsualización de asset privado, con sus tres consumidores encima.
- Si pdf.js queda viable: worker self-hosteado (ni `new URL` roto ni CDN público) y render inline en
  móvil, que hoy no existe.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (§Delta 2026-08-15)
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md`

Reglas obligatorias:

- **NUNCA** servir bytes de un documento privado desde un CDN público.
- **NUNCA** dejar dos implementaciones del mismo visor conviviendo al cerrar esta task.
- **NUNCA** mostrar un marco de documento vacío: si el navegador no puede pintarlo, decirlo.
- **NUNCA** cambiar el bundler de la app para acomodar una librería de visor sin medir el impacto en
  el build completo.

## Normative Docs

- `docs/tasks/to-do/TASK-1715-application-360-documents-panel.md`
- `src/components/greenhouse/documents/GreenhouseDocumentPreview.tsx` (el primitive vigente)

## Dependencies & Impact

### Depends on

- `TASK-1715` (el primitive existe y tiene su primer consumidor)
- `react-pdf` ^10.4.1 + `pdfjs-dist` 5.4.296 (transitiva)

### Blocks / Impacts

- `CertificatePreviewDialog` y `ContractorSupportDocumentsPanel` — sus superficies cambian de motor.
- El render inline en móvil del CV (hoy degradado a "abrir/descargar") depende de esta task.

### Files owned

- `src/components/greenhouse/documents/GreenhouseDocumentPreview.tsx`
- `src/components/greenhouse/CertificatePreviewDialog.tsx`
- `src/components/greenhouse/contractors/ContractorSupportDocumentsPanel.tsx`

## Current Repo State

### Already exists

- `GreenhouseDocumentPreview` — fetch→blob, degradación honesta en tres escalones, detección por
  `navigator.pdfViewerEnabled`, salida accesible. Motor: el del navegador.
- `CertificatePreviewDialog` — `react-pdf` + worker desde CDN `unpkg`.
- `ContractorSupportDocumentsPanel` — `react-pdf` + worker vía `new URL` (roto).

### Gap

- No se sabe si pdf.js funciona bajo Turbopack.
- Tres implementaciones del mismo problema, dos con bugs de worker distintos.
- Sin render inline de PDF en móvil.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/components/greenhouse/documents/` y los dos consumidores existentes
- Future candidate home: `ui-package`
- Boundary: `GreenhouseDocumentPreview` es el único punto que resuelve bytes privados a pixeles
- Server/browser split: componente cliente; los bytes salen de una ruta que re-autoriza por request
- Build impact: `pdfjs-dist` es una dependencia pesada con worker propio; su carga es dinámica
- Extraction blocker: `none`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Medir el alcance real del fallo

- Reproducir bajo `pnpm dev:turbo` y bajo un `pnpm build` + `pnpm start`.
- Registrar el veredicto por bundler en la propia task: ¿roto en ambos, o sólo en webpack?
- Si funciona en producción: abrir issue por los dos visores rotos en desarrollo y decidir si eso
  basta para migrarlos igual.

### Slice 2 — Resolver el worker de forma correcta

- Si pdf.js queda viable: worker self-hosteado desde `pdfjs-dist` copiado en `prebuild`, con la
  versión atada al lockfile. Ni `new URL` con especificador de módulo, ni CDN público.

### Slice 3 — Un solo primitive, tres consumidores

- Migrar `CertificatePreviewDialog` y `ContractorSupportDocumentsPanel` a `GreenhouseDocumentPreview`.
- Ese es el ejercicio del segundo consumidor: hasta que sus copies y sus formas entren sin torcer la
  API, la reutilización sigue siendo hipótesis.

### Slice 4 — Render inline en móvil (condicional a Slice 1)

- Si pdf.js funciona: usarlo como motor **sólo** cuando `navigator.pdfViewerEnabled === false`, para
  que el 100% de los casos con embed nativo sigan costando 0 KB.
- Si no funciona: cerrar la puerta explícitamente en la doc y dejar el fallback como estado final.

## Out of Scope

- **Rediseño de cualquiera de las tres superficies.** `UI impact: none` es deliberado: esta task
  cambia el **motor de render** detrás de un visor que ya existe y ya fue diseñado (el de TASK-1715
  tiene wireframe, flow y contrato de dirección visual propios). El usuario ve el mismo diálogo con el
  mismo copy; lo que cambia es qué dibuja los píxeles. Si al migrar los otros dos consumidores hiciera
  falta mover su layout, eso **sale de esta task** y necesita su propio contrato UI.
- Anotar documentos dentro del portal.
- Previsualización de tipos nuevos (DOCX): el intake de Careers sólo acepta `application/pdf`.
- Cambiar el bundler de la aplicación.

## Detailed Spec

### El experimento del Slice 1, concreto

El fallo se reproduce abriendo cualquier documento desde uno de los tres consumidores y mirando la
consola. Lo que hace este bug difícil es que **no aparece como error de red ni como `pageerror`**: el
`import('react-pdf')` rechaza y, si el `catch` no loggea, el visor sólo muestra su estado de error
genérico. Por eso el primer paso es instrumentar el `catch`, no cambiar código de producción.

| Bundler | Cómo correrlo | Qué se espera registrar |
|---|---|---|
| webpack (dev) | `pnpm dev` | ya medido: `TypeError: Object.defineProperty called on non-object` |
| Turbopack (dev) | `pnpm dev:turbo` | ¿carga el módulo? ¿carga el worker? |
| Turbopack (build) | `pnpm build` + `pnpm start` | el veredicto que decide si hay usuarios afectados |

El resultado de la tercera fila es el que importa: `pnpm build` usa Turbopack, así que es el bundler
que llega a Vercel.

### Dónde vive hoy cada pieza

| Consumidor | Motor | Worker | Estado |
|---|---|---|---|
| `GreenhouseDocumentPreview` (TASK-1715) | motor del navegador | n/a | funciona; sin inline en móvil |
| `CertificatePreviewDialog` | `react-pdf` | CDN `unpkg` | bytes privados fuera del perímetro |
| `ContractorSupportDocumentsPanel` | `react-pdf` | `new URL` sobre especificador de módulo | 404 garantizado |

### La forma de la API a la que hay que llegar

`GreenhouseDocumentPreview` ya recibe `{ url, mimeType, fileName, copy, renderEscapeHatch }`. Los dos
consumidores viejos encajan sin torcerla: ambos tienen una URL de asset privado, un `mimeType` y un
nombre de archivo. Si al migrarlos apareciera un campo que no entra, **eso es la señal de que la API
está modelada alrededor del primer consumidor** y hay que corregirla antes de seguir, no agregarle un
parámetro por consumidor.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → todo lo demás. Sin saber si pdf.js es viable, los slices 2 y 4 pueden ser trabajo tirado.
- Slice 3 no depende de Slice 1: unificar sobre el motor nativo ya es una mejora, y deja un solo
  lugar donde cambiar el motor si Slice 1 lo habilita.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Migrar el panel de contractors rompe una superficie payroll-adyacente | contractor / UI | medium | GVC del panel antes/después + `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` verde | revisión visual del PR |
| El worker self-hosteado queda desalineado de `pdfjs-dist` | build | low | copia en `prebuild` desde `node_modules`, nunca un archivo versionado a mano | fallo del propio script |
| pdf.js entra al bundle de rutas que no lo usan | perf | medium | import dinámico memoizado + medición del chunk antes/después | `pnpm build` + bundle analyzer |

### Feature flags / cutover

Sin flag: el cambio es de motor de render, reversible por revert. El interruptor real es qué
consumidor usa el primitive.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | n/a (medición) | — | sí |
| Slice 2 | revert del PR | <5 min | sí |
| Slice 3 | revert del PR; vuelven las implementaciones locales | <5 min | sí |
| Slice 4 | revert; el fallback honesto sigue en pie | <5 min | sí |

### Production verification sequence

1. Reproducir el fallo en local con ambos bundlers y registrar el veredicto.
2. Abrir un PDF real desde cada uno de los tres consumidores en local.
3. Repetir en staging con persona agente.
4. Confirmar en producción tras la promoción, con un documento real por consumidor.

### Out-of-band coordination required

`N/A — repo-only change`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La task registra el veredicto de `react-pdf` por bundler (webpack / Turbopack) con evidencia.
- [ ] Si el fallo alcanza producción, existe el `ISSUE-###` correspondiente por los dos visores rotos.
- [ ] Queda **una** implementación de previsualización de asset privado en el repo.
- [ ] Ningún consumidor sirve bytes privados desde un CDN público.
- [ ] Ningún consumidor resuelve el worker con `new URL` sobre un especificador de módulo.
- [ ] El render inline en móvil está habilitado, o su imposibilidad está documentada con causa.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding`
- `pnpm fe:capture task1715-application-documents --env=local`
- Apertura manual de un PDF real desde los tres consumidores

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado ejecutado (mínimo: `TASK-1715`)
- [ ] Delta en `GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` con el veredicto por bundler

## Follow-ups

- Anotación de documentos dentro del portal, si aparece la necesidad.

## Open Questions

- ¿El visor debe soportar tipos nuevos (imágenes ya sí; ¿DOCX vía conversión server-side?) o el
  intake seguirá restringido a PDF? Hoy la restricción del intake hace la pregunta teórica.
