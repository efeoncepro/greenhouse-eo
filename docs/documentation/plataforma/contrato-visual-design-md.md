# Contrato Visual DESIGN.md — Cómo Greenhouse protege su sistema visual

> **Tipo de documento:** Documentación funcional (lenguaje simple)
> **Versión:** 1.0
> **Creado:** 2026-05-04 por agente (TASK-764)
> **Última actualización:** 2026-05-04
> **Documentación técnica:** [GREENHOUSE_DESIGN_TOKENS_V1.md](../../architecture/GREENHOUSE_DESIGN_TOKENS_V1.md)

---

## Qué es el contrato visual DESIGN.md

`DESIGN.md` es un archivo en la raíz del repo de Greenhouse que describe en formato máquina-legible el sistema visual completo: cada color, cada tipografía, cada componente. Está en formato Google Labs `@google/design.md` (un estándar emergente para documentar design systems en YAML+Markdown).

Sirve para que cualquier agente IA (Claude, Codex, etc.) que toque la interfaz pueda leer el contrato compacto antes de tomar decisiones visuales y use exactamente los mismos tokens que el código de producción.

Antes era un archivo decorativo: estaba ahí pero no se validaba. Después de TASK-764 (cerrada 2026-05-04) es un contrato vivo, automáticamente verificado y conectado al CI.

---

## Qué problema resuelve

Antes del hardening:

- **Cualquier PR podía romperlo silenciosamente**. No había validación automática.
- **17 warnings activos** (tokens definidos pero nunca usados por ningún componente). Ruido que tapaba problemas reales.
- **Drift entre `DESIGN.md` y la spec extendida `GREENHOUSE_DESIGN_TOKENS_V1.md`** sin que nadie lo notara.
- **Agentes IA no lo cargaban automáticamente** — dependía de la memoria del operador.
- **`pnpm design:diff` directamente roto** (apuntaba a un archivo `DESIGN.prev.md` que no existía).

Después:

- **CI gate strict** que bloquea cualquier PR que rompa el contrato.
- **0 errores, 0 warnings** en estado actual.
- **Sync verificada** entre `DESIGN.md` y la spec extendida en cada cambio.
- **Skills UI cargan `DESIGN.md` por default** como mandatory context.
- **`pnpm design:diff` funciona** contra cualquier ref de git.

---

## Cómo funciona ahora

### El flujo completo de un cambio visual

```
1. Operador o agente IA modifica DESIGN.md
       ↓
2. Validación local: pnpm design:lint
       ↓
3. Commit + push + PR
       ↓
4. CI workflow "Design Contract" se dispara automáticamente
       ↓
       ├─ 0 errors + 0 warnings → ✅ check verde, PR mergeable
       └─ cualquier error o warning → ❌ check rojo, PR bloqueado
                                            (con anotación exacta de qué falló)
```

### Las 3 capas de protección

**Capa 1 — Validación local antes de commit**

```bash
pnpm design:lint
```

Salida esperada en estado sano: `errors: 0, warnings: 0, infos: 1`. Si aparece algo, el output dice exactamente qué token está huérfano o qué contraste WCAG falla.

**Capa 2 — CI gate automático**

`.github/workflows/design-contract.yml` corre en cada PR que toca `DESIGN.md`, la spec extendida, o `package.json`. Modo strict: bloquea por errores Y por warnings. Reporta cada hallazgo como anotación en el PR + step summary + artifact `design-lint.json` (retención 30 días para auditoría).

**Capa 3 — Skills UI cargan el contrato**

Tres skills (`greenhouse-ux`, `greenhouse-ui-review`, `modern-ui` overlay) declaran en su preamble una sección **"Mandatory context"** que obliga a cargar `DESIGN.md` antes de cualquier decisión visual. No depende de memoria humana.

---

## Cómo agregar un token nuevo

Ejemplo: quieres agregar un color de marca nuevo `brand-orange-soft`.

### Paso 1 — Decidir el valor en runtime primero

`DESIGN.md` refleja lo que está en runtime, no lo genera. Primero decides el hex y lo agregas al `mergedTheme.ts` o donde corresponda.

### Paso 2 — Agregar el color al frontmatter de DESIGN.md

```yaml
colors:
  ...
  brand-orange-soft: "#FFA060"
```

### Paso 3 — Crear o extender un contrato de componente que lo use

**Esto es obligatorio.** Si dejas el token sin referencia, el linter emite warning y el CI bloquea.

```yaml
components:
  ...
  alert-banner-soft:
    backgroundColor: "{colors.brand-orange-soft}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 12px
```

### Paso 4 — Validar local

```bash
pnpm design:lint
```

Debe reportar `0 errors, 0 warnings`. Si reporta contraste WCAG bajo, ajustar colores hasta que pase.

### Paso 5 — Commit + PR

El CI gate verifica automáticamente. Si pasa local, pasa en CI.

---

## Lo que NO se puede hacer

### Atajos prohibidos (anti-bandaid)

- **NO** crear un namespace `palette.*` que el linter no audite, solo para silenciar warnings. Cada token debe estar referenciado por un contrato real.
- **NO** ignorar el CI gate con `--no-verify` o saltarse la validación local.
- **NO** modificar `DESIGN.md` con tokens que no existen en runtime. El contrato refleja runtime, nunca al revés.
- **NO** cambiar el `STRICT_WARNINGS` del CI a `false` sin un ADR explícito que justifique la regresión.

### Decisiones que requieren task derivada

- Inversión de fuente de verdad (que `mergedTheme.ts` consuma tokens generados desde `DESIGN.md`) está fuera de scope mientras `@google/design.md` siga en alpha 0.1.x. Si upstream llega a 1.0+, reabrir como TASK derivada.

---

## Cómo revisar diferencias entre commits

### Ver qué cambió desde el último commit

```bash
pnpm design:diff
```

Default: compara contra `HEAD~1`. Devuelve un JSON estructurado con tokens agregados, removidos, modificados.

### Ver qué cambió contra otra rama

```bash
pnpm design:diff -- --ref main
pnpm design:diff -- --ref origin/develop
pnpm design:diff -- --ref HEAD~5
```

El wrapper extrae `git show <ref>:DESIGN.md` a un archivo temporal, corre el CLI upstream, y limpia. No requiere mantener `DESIGN.prev.md` paralelo.

### Limitación honesta

El CLI upstream `design.md diff` v0.1.1 solo reporta diffs en `tokens.{colors, typography, rounded, spacing}`. Cambios en contratos de componente no se diffean (limitación alpha). Cuando upstream llegue a beta+, el output mejora automáticamente.

---

## Quién es dueño de qué

| Plano | Archivo | Rol |
|---|---|---|
| Contrato compacto agent-facing | `DESIGN.md` (raíz) | Lo que lee primero un agente IA. Validado por linter. |
| Spec extendida canónica | `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` | La documentación humana completa con rationale, decisiones históricas, mapping bilateral. |
| Runtime / source of truth de hex | `src/components/theme/mergedTheme.ts` | El código de producción. Cuando los 3 planos disienten, gana runtime. |
| CI gate | `.github/workflows/design-contract.yml` | Bloquea cualquier PR que rompa el contrato. |
| Wrapper diff | `scripts/design-diff.mjs` | Compara contra cualquier ref git sin archivo paralelo. |

---

## Relación con otros sistemas

- **Skills UI** (`greenhouse-ux`, `greenhouse-ui-review`, `modern-ui` overlay) cargan `DESIGN.md` como mandatory context.
- **Spec extendida v1.5** (`GREENHOUSE_DESIGN_TOKENS_V1.md`) tiene una Delta 2026-05-04 documentando este hardening.
- **Audit transversal** (`docs/audits/design-tokens/DESIGN_TOKENS_AUDIT_2026-05-02.md`) inventarió los 14 drift items que esta task cerró.
- **TASK-021 (deuda de adopción)** y **TASK-770 (charts color sweep)** son follow-ups que no fueron bloqueadas por TASK-764 — atacan adopción de variants en código existente, separadas del contrato.

---

## Glosario

- **Token**: una variable nombrada del design system. Ejemplo: `colors.primary` con valor `"#0375DB"`.
- **Contrato de componente**: una entrada en la sección `components` del frontmatter que dice qué tokens usa una pieza visual concreta. Ejemplo: `button-primary-hover` declara `backgroundColor: "{colors.primary-dark}"`.
- **Drift**: divergencia detectable entre dos sources of truth que deberían coincidir (ej: `DESIGN.md` declara un color pero `mergedTheme.ts` tiene otro).
- **WCAG AA**: estándar de accesibilidad para contraste de texto (mínimo 4.5:1 para texto normal). El linter de DESIGN.md lo verifica automáticamente.
- **Strict mode**: configuración del CI gate donde tanto errors como warnings bloquean PRs. Activado tras Slice 6 de TASK-764.

---

> **Detalle técnico**: para entender contratos exactos, validation rules, ADR de Opción A vs B, y reglas duras anti-regresión, ver [GREENHOUSE_DESIGN_TOKENS_V1.md](../../architecture/GREENHOUSE_DESIGN_TOKENS_V1.md). Workflow: [.github/workflows/design-contract.yml](../../../.github/workflows/design-contract.yml). Wrapper diff: [scripts/design-diff.mjs](../../../scripts/design-diff.mjs).
