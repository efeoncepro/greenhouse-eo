# Greenhouse Visual Capture

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-05-12 por Claude (round 4 deep audit / sesión de microinteractions)
> **Ultima actualizacion:** 2026-05-30 por Codex
> **Documentacion tecnica:** [GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md](../../architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md)
> **Manual operativo:** [captura-visual-playwright.md](../../manual-de-uso/plataforma/captura-visual-playwright.md)

## Qué es

**Greenhouse Visual Capture** (`GVC`) es la herramienta interna para **grabar lo que pasa en una pantalla del portal** sin que tengas que abrir el browser y hacer screenshots manuales. Su comando principal es `pnpm fe:capture`.

Sirve para revisar visualmente cómo se ve y cómo se comporta una ruta — incluyendo pantallas largas con scroll, animaciones, hover, cambios de estado y transiciones.

La idea: en vez de que cada persona escriba código nuevo cada vez que necesita ver "¿cómo se ve esta página en staging?", hay UN comando único.

## Regla vigente para agentes

Para cambios o diagnósticos de UI visible, `pnpm fe:capture` es el camino canónico de evidencia visual. Esto aplica a screenshots, secuencias de frames, microinteractions, responsive, revisión visual, design QA y comparaciones antes/después.

El orden esperado es:

1. Usar un scenario existente con `pnpm fe:capture <scenario> --env=staging`.
2. Si no hay scenario, usar `pnpm fe:capture --route=<path> --env=staging --hold=3000`.
3. Si la revisión requiere checklist UI/UX, correr `pnpm fe:capture:review`.
4. Si se compara antes/después, correr `pnpm fe:capture:diff`.
5. Solo usar Playwright ad-hoc como complemento para consola, red, payloads API o un gesto no soportado por el DSL; los artifacts igual deben quedar bajo `.captures/`.

## Para qué sirve

| Caso | Comando |
|---|---|
| "¿Cómo se ve esta página en staging?" | `pnpm fe:capture --route=/finance/cash-out --env=staging --hold=3000` |
| "Quiero validar que la animación del filtro funciona" | `pnpm fe:capture offboarding-queue-microinteractions --env=staging` |
| "Quiero capturar una pantalla larga completa" | scenario con `mark fullPage: true` |
| "Quiero capturar una sección específica después de hacer scroll" | scenario con `scroll selector` + `mark clipSelector` |
| "Quiero comparar antes/después" | `pnpm fe:capture:diff .captures/<prev> .captures/<curr>` |
| "Quiero revisar la salud de capturas recientes" | `pnpm fe:capture:health` |
| "Necesito un GIF para adjuntar al PR review" | mismo comando + `--gif` |
| "Quiero ver el browser mientras corre" | mismo comando + `--headed` |

## Qué entrega

Una carpeta nueva en `.captures/` con:

- **Un video** (`.webm`) del lifecycle completo
- **Stills PNG** en momentos clave (por ejemplo: "antes del hover", "durante el hover", "después del click")
- **Un GIF** opcional (loop reproducible en cualquier visor)
- **Un manifest JSON** con metadata (qué ruta, qué env, cuándo, cuánto duró)

Todo eso queda fuera del repo (gitignored). Si querés compartirlo, lo adjuntás manualmente.

## Por qué existe

Antes, cada persona que necesitaba ver una pantalla escribía su propio script de Playwright. En una sesión se observaron 6 versiones distintas — todas con leves diferencias, todas reinventando lo mismo (autenticación, headers, viewport, recording). Eso es deuda silenciosa.

La herramienta consolida ese patrón en una sola CLI canónica que:

- Reusa la autenticación de agente que ya existe (no reinventa cookies).
- Usa los storage states canónicos por entorno (`.auth/storageState.<env>.json`).
- Aplica el bypass de Vercel SSO automáticamente para staging.
- Tiene 5 capas de seguridad: bloquea production por default, enmascara passwords, valida que el output no escape de `.captures/`, registra cada captura en un audit log.

## Cómo se compone

3 piezas:

1. **CLI (`pnpm fe:capture`)** — el comando que invocás.
2. **Scenarios declarativos** (archivos `.scenario.ts`) — describís los pasos (hover, click, mark) en TypeScript tipado.
3. **Output estructurado** (`.captures/<timestamp>_<scenario>/`) — siempre la misma forma para que un visor / agente sepa qué buscar.

## Niveles de uso

### Nivel 1 — Captura simple (sin código)

Si solo necesitás un screenshot + un breve video de una ruta:

```bash
pnpm fe:capture --route=/hr/offboarding --env=staging --hold=3000
```

`--hold` controla cuántos ms espera post-mount antes de la screenshot.

### Nivel 2 — Scenario con interacciones o scroll estable

Si necesitás validar microinteractions, pantallas largas o secciones específicas, escribís un scenario:

```ts
import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'mi-feature',
  route: '/finance/cash-out',
  viewport: { width: 1440, height: 900 },
  steps: [
    { kind: 'wait', selector: 'h4', timeout: 5000 },
    { kind: 'mark', label: 'initial' },
    { kind: 'hover', selector: '[role="tab"]:nth-child(2)' },
    { kind: 'mark', label: 'tab-hover' },
    { kind: 'scroll', selector: '[data-capture="timeline"]', scrollBlock: 'center' },
    { kind: 'mark', label: 'timeline', clipSelector: '[data-capture="timeline"]' }
  ]
}
```

Y lo corrés: `pnpm fe:capture mi-feature --env=staging`.

Para una pantalla completa con scroll:

```ts
{ kind: 'mark', label: 'full-page', fullPage: true }
```

Para ir al inicio o final del documento:

```ts
{ kind: 'scroll', scrollTo: 'bottom' }
{ kind: 'scroll', scrollTo: 'top' }
```

Convención: si una sección se va a capturar más de una vez, agregar `data-capture="<nombre-seccion>"` al wrapper de esa sección. Esto es más estable que depender de texto visible, posición o cantidad de cards.

### Nivel 3 — Captura con mutaciones (escritura)

Por default un scenario es read-only. Si necesitás llenar un formulario y submitir (lo cual crea una entidad real en staging), tenés que declararlo explícitamente:

```ts
mutating: true,
safeForCapture: true,  // confirmación explícita
```

Esta doble confirmación previene que alguien grabe un screenshot y termine creando 50 casos de offboarding en staging accidentalmente.

## Salvaguardas

| Riesgo | Cómo se previene |
|---|---|
| Captura accidental contra production | Triple gate: env var + flag + capability futuro |
| Cookie de agent expirada (a 24h) | Detección automática + refresh proactivo si <1h restante |
| Password / secret en el recording | CSS blur + transparent + text-shadow sobre password inputs |
| Outputs commiteados al repo | `.captures/` está en `.gitignore` |
| Capturas viejas acumulando GBs | `pnpm fe:capture:gc --apply` purga >30 días |
| Scroll que cambia por copy o layout | Selectores estables + `scrollBlock` + `clipSelector` |
| Captura incompleta de pantallas largas | `mark fullPage: true` |
| Scenarios mutating ejecutándose sin querer | Doble flag (`mutating: true` + `safeForCapture: true`) requerido |
| Agente reinventa la autenticación | El helper delega siempre a `scripts/playwright-auth-setup.mjs` |

## Quién lo usa

- **Desarrolladores frontend**: para validar visualmente cambios antes de PR.
- **Agentes (Claude, Codex, Cursor)**: como parte de su flujo de auditoría visual.
- **QA**: para reproducir bugs visuales y adjuntar artifacts.
- **Diseñadores**: para revisar implementaciones contra mockups Figma.

## Quién NO lo usa

- **Production users**: nunca tienen acceso al CLI. Es interno.
- **Tests de CI** que necesitan assertions: para eso están los Playwright Tests bajo `tests/e2e/`. Este helper produce artifacts, no aserta nada.
- **Tests visuales con assert pixel-perfect**: `GVC` produce evidencia y diff estructural; no reemplaza un visual regression gate pixel-perfect si se define uno futuro.

## Cómo extender

- **Nuevo scenario**: agregar `scripts/frontend/scenarios/<name>.scenario.ts`. Ver guía completa en `scripts/frontend/scenarios/_README.md`.
- **Nuevo tipo de step**: extender `CaptureScenarioStep` en `scripts/frontend/lib/scenario.ts` + agregar caso en `runStep`, tests en `scripts/frontend/lib/scenario.test.ts` y ejemplo en `scripts/frontend/scenarios/_README.md`.
- **Nuevo caso de scroll/captura larga**: primero intentar componer con `selector`, `scrollTo`, `fullPage` y `clipSelector` antes de agregar primitives nuevas.
- **Mobile viewport**: pasar `--device="iPhone 13"` o cualquier preset Playwright.
- **Visual diff**: usar `pnpm fe:capture:diff`; pixel-perfect sigue fuera del contrato V1.

> Detalle técnico: [GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md](../../architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md) describe el contrato completo, los tipos del DSL, las 5 capas de defense-in-depth, y el roadmap V1.1+.

## V1.1 — Delta 2026-05-12

6 capacidades nuevas entregadas el mismo día:

1. **Mobile viewport** — `--device="iPhone 13"` (o cualquier preset Playwright) overridea viewport + userAgent + DPR. Útil para validar responsive layouts.
2. **Visual diff** — `pnpm fe:capture:diff <prev> <curr>` compara 2 capturas y emite stdout summary + HTML report side-by-side.
3. **GCS upload** — `--upload=<bucket>` sube el run al bucket + retorna signed URL del manifest (7 días). Para compartir con el equipo.
4. **Health probe** — `pnpm fe:capture:health` lee `.captures/audit.jsonl` y reporta failure rate + last failure + mean duration. Útil antes de invocar un loop intensivo.
5. **UI review dossier** — `pnpm fe:capture:review <scenario>` corre la captura + genera `review-dossier.md` con la 13-row checklist canónica, listo para pegar en Claude Code con la skill `greenhouse-ui-review`.
6. **Triple Gate completo** — capability `platform.frontend.capture_prod` declarada en `entitlements-catalog` + migration seed canónica. Production captures requieren los 3 gates (env var + flag + capability declaration).

## V1.3 — Delta 2026-05-30

Greenhouse Visual Capture agrega soporte robusto para scroll y pantallas largas:

1. `scroll selector` + `scrollBlock` / `scrollInline` para llegar a secciones sin offsets frágiles.
2. `scrollTo: 'top' | 'bottom'` para anclas de documento.
3. `mark fullPage: true` para capturar la pantalla completa.
4. `mark clipSelector` para capturar solo una sección.
5. Validación del DSL para rechazar combinaciones ambiguas.
6. Scenarios de referencia: `contractor-admin-workbench`, `offboarding-fullpage-capture` y `sample-sprints-scroll-anchors`.

Backlog: pixel-perfect diff, PG-backed reliability signal, Anthropic SDK orchestration directa, validación PG real del actor capability.
