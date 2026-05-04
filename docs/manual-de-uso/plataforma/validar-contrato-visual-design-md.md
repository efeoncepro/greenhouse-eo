# Validar el contrato visual DESIGN.md

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-05-04 por agente (TASK-764)
> **Ultima actualizacion:** 2026-05-04
> **Modulo:** plataforma / design system
> **Ruta en portal:** `N/A` (validacion CLI + CI workflow GitHub)
> **Documentacion relacionada:** [Contrato Visual DESIGN.md](../../documentation/plataforma/contrato-visual-design-md.md), [GREENHOUSE_DESIGN_TOKENS_V1.md](../../architecture/GREENHOUSE_DESIGN_TOKENS_V1.md)

---

## Para que sirve

Este manual explica como validar localmente y debugar el contrato visual `DESIGN.md` de Greenhouse antes de subir un PR. Sirve para:

- Validar que cualquier cambio al sistema visual respeta el contrato.
- Resolver warnings/errors del linter antes que el CI los bloquee.
- Comparar versiones del contrato entre commits o ramas.
- Agregar tokens nuevos siguiendo el patron canonico (sin atajos prohibidos).

Si solo quieres entender que es DESIGN.md y como funciona, ver el [documento funcional](../../documentation/plataforma/contrato-visual-design-md.md).

---

## Antes de empezar

**Permisos**: ninguno especial. Es validacion local y CI; no toca produccion ni runtime.

**Requisitos**:

- `pnpm` instalado (version 10+).
- Repo Greenhouse clonado en local con `pnpm install` corrido.
- `git` disponible (para `pnpm design:diff`).

**Que NO requiere**:

- Conexion a Postgres o Cloud SQL.
- Variables de entorno especiales.
- Acceso a Vercel o GCP.

---

## Paso a paso

### 1. Validar el estado actual del contrato

```bash
pnpm design:lint
```

Salida esperada en estado sano:

```text
Errors: 0
Warnings: 0
Infos: 1
```

Si el output incluye warnings o errors, lee el detalle: indica exactamente que token o contrato falla y por que.

### 2. Validar con formato JSON (para scripting)

```bash
pnpm design:lint --format json
```

Devuelve un objeto con `findings[]` y `summary`. Util cuando quieres parsear en un script o CI custom.

### 3. Comparar contra una version anterior

```bash
# Default: compara contra HEAD~1 (ultimo commit)
pnpm design:diff

# Contra una rama
pnpm design:diff -- --ref main
pnpm design:diff -- --ref origin/develop

# Contra un commit especifico
pnpm design:diff -- --ref abc1234

# Output JSON pasthrough
pnpm design:diff -- --format json
```

El wrapper extrae `git show <ref>:DESIGN.md` a un archivo temporal, corre el CLI upstream, y limpia automaticamente.

### 4. Agregar un token nuevo (flujo correcto)

1. **Decidir el valor en runtime primero**. `DESIGN.md` refleja runtime, no lo genera. Modifica `src/components/theme/mergedTheme.ts` o el archivo correspondiente con el nuevo color/tipografia.

2. **Agregar al frontmatter de DESIGN.md**:

   ```yaml
   colors:
     ...
     mi-nuevo-color: "#FF6500"
   ```

3. **Crear o extender un contrato de componente que lo use**. Esto es obligatorio:

   ```yaml
   components:
     ...
     mi-nuevo-componente:
       backgroundColor: "{colors.mi-nuevo-color}"
       textColor: "{colors.text-primary}"
       typography: "{typography.body-md}"
       rounded: "{rounded.md}"
       padding: 8px
   ```

4. **Validar**:

   ```bash
   pnpm design:lint
   ```

5. **Si pasa local, commit + push + PR**. El CI gate lo va a re-validar automaticamente.

### 5. Resolver warnings comunes

#### Warning: "X is defined but never referenced by any component"

Significa: tienes un token en `colors:` que ningun contrato de componente usa.

**Solucion correcta**: crear un contrato de componente que lo referencie. Ejemplo:

```yaml
status-chip-info:
  backgroundColor: "{colors.info}"
  textColor: "{colors.on-primary}"
  typography: "{typography.body-md}"
  rounded: "{rounded.md}"
  padding: 8px
```

**Solucion prohibida**: NO crees un namespace `palette.*` solo para silenciar el warning. Eso es bandaid; el siguiente PR lo va a re-introducir.

#### Warning: "textColor (X) on backgroundColor (Y) has contrast ratio Z, below WCAG AA minimum of 4.5:1"

Significa: el contrato viola el contraste minimo accesible.

**Soluciones validas**:

- Usar un texto mas oscuro/claro contra el fondo.
- Cambiar el fondo a una version mas saturada.
- Si es un disabled state legitimo (ej `text-disabled`), referenciar el token usando `textColor` SIN `backgroundColor` en el mismo contrato — el linter exenta el check de contraste cuando no hay par.

Ejemplo correcto para disabled:

```yaml
button-primary-disabled:
  textColor: "{colors.text-disabled}"
  typography: "{typography.label-md}"
```

### 6. Verificar que el CI vio tu cambio

Despues de pushear el PR:

```bash
gh run list --branch <tu-rama> --workflow "Design Contract" --limit 3
```

Debe aparecer un run reciente. Para ver el detalle:

```bash
gh run view <run-id>
```

Si paso, vas a ver `conclusion: success`. Si fallo, el output muestra exactamente que finding lo bloqueo.

---

## Que significan los estados o senales

| Estado | Significado | Que hacer |
|---|---|---|
| `pnpm design:lint` retorna `0 errors, 0 warnings` | Contrato sano | Listo para commit |
| `0 errors, N warnings` | Tokens huerfanos o contraste bajo | Resolver antes de commit (CI bloquea por warnings en strict mode) |
| `N errors` | Sintaxis YAML invalida o referencias rotas | Resolver obligatorio — el PR no merge |
| CI Design Contract `success` | El gate aprobo el PR | Continuar con el merge |
| CI Design Contract `failure` | Gate rechazo el PR | Leer la anotacion y el step summary; corregir; re-pushear |

---

## Que no hacer

### Atajos prohibidos

- **NO** uses `--no-verify` para saltarte hooks locales.
- **NO** desactives el CI gate flipeando `STRICT_WARNINGS` a `false` sin un ADR explicito.
- **NO** crees tokens en `DESIGN.md` que no existan en runtime.
- **NO** uses namespace `palette.*` u otro shortcut para silenciar warnings sin resolver la causa.

### Decisiones que NO van por aqui

- Inversion de fuente de verdad (theme MUI consume tokens generados desde DESIGN.md): bloqueada hasta que `@google/design.md` salga de alpha. Si emerge necesidad, reabrir como TASK derivada.
- Cambio de runtime (hex de un color): se hace en `mergedTheme.ts` primero; DESIGN.md se actualiza despues.
- Sweep de adopcion de variants en codigo existente: vive en TASK-021 y TASK-770, fuera del scope del contrato.

---

## Problemas comunes

### "ENOENT: no such file or directory, open 'DESIGN.prev.md'"

Este error solo aparece en versiones del repo previas al cierre de TASK-764 (commit `5a48fa45` en adelante). Si lo ves, actualiza tu rama. El script `design:diff` ahora usa el wrapper `scripts/design-diff.mjs` que no requiere el archivo paralelo.

### "fatal: invalid object name 'X'"

`pnpm design:diff -- --ref X` con un ref que no existe. Verificar con `git rev-parse X` y usar uno valido.

### El CI dice `Design Contract: failure` pero local dice `0 errors, 0 warnings`

Posibles causas:

1. Tu rama esta desactualizada. Hacer `git pull` y re-validar local.
2. El CI esta en modo strict pero local esta corriendo una version vieja del workflow. Verificar `.github/workflows/design-contract.yml` en tu rama.
3. Hay un cambio en `DESIGN.md` que no es del frontmatter pero que el linter detecta (raro). Leer la anotacion exacta del CI.

### El linter pasa pero el visual final se ve mal

`DESIGN.md` valida estructura y contraste, no estetica. Para audits visuales mas profundos invocar las skills `greenhouse-ux`, `greenhouse-ui-review`, o `modern-ui` overlay.

---

## Referencias tecnicas

- Workflow CI: `.github/workflows/design-contract.yml`
- Wrapper diff: `scripts/design-diff.mjs`
- Spec canonica extendida: `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` (v1.5+)
- Doc funcional: `docs/documentation/plataforma/contrato-visual-design-md.md`
- Audit historico: `docs/audits/design-tokens/DESIGN_TOKENS_AUDIT_2026-05-02.md`
- Task que cerro el hardening: `docs/tasks/complete/TASK-764-design-md-contract-hardening.md`
- Skills UI que cargan DESIGN.md: `~/.claude/skills/greenhouse-ux/SKILL.md`, `.claude/skills/greenhouse-ui-review/SKILL.md`, `.claude/skills/modern-ui/SKILL.md`
- Format spec upstream: ejecutar `npx design.md spec` para obtener la documentacion completa del formato `@google/design.md`
