> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-05-05 por agente
> **Ultima actualizacion:** 2026-05-05 por agente
> **Documentacion tecnica:** `docs/architecture/GREENHOUSE_GIT_HOOKS_AUTOENFORCEMENT_V1.md`

# Git hooks — autoenforcement local de calidad

## Para que sirve

Greenhouse trabaja con multiples agentes (Claude Code, Codex, Cursor, futuros) escribiendo codigo en paralelo. Cada agente tiene buenas intenciones pero a veces escribe codigo que NO cumple las convenciones de estilo del repo (orden de imports, lineas en blanco entre statements, etc). El resultado historico era: el agente pushea, el CI lo rechaza, otro agente tiene que limpiar despues. Ciclos de revert+repush por errores de style.

Desde 2026-05-05 el repo tiene 2 git hooks que se ejecutan automaticamente en cada `git commit` y `git push`. Aplican `eslint --fix` solo y bloquean si quedan errores. Resultado: la mayoria de los errores de style se arreglan solos antes de llegar a CI, y los que no, no salen del computador del agente.

## Como funcionan

| Hook | Cuando corre | Que hace | Cuanto tarda |
| --- | --- | --- | --- |
| **pre-commit** | Cada vez que ejecutas `git commit` | Aplica `eslint --fix` automaticamente sobre los archivos que estas commiteando. Si quedan errores no auto-corregibles, bloquea el commit. | < 5 segundos |
| **pre-push** | Cada vez que ejecutas `git push` | Corre el lint completo de todo el repo + verifica que TypeScript compila. Si hay 1+ error, bloquea el push. | < 90 segundos |

Los hooks son automaticos. No requieren que el agente recuerde correrlos. Cualquier `git commit` o `git push` los dispara.

## Como se activan

Cuando un agente clona el repo y corre `pnpm install`, los hooks se instalan solos via el script `prepare` de package.json. No hay que correr nada manual. Esto significa:

- Si Claude Code clona el repo manana: hooks activos automaticamente.
- Si Codex toma una task la semana que viene: hooks activos automaticamente.
- Si un humano nuevo se une al equipo: hooks activos automaticamente.

## Que pasa si un hook bloquea el commit/push

**Caso 1**: el hook arregla solo el error (auto-fix)

```bash
$ git commit -m "feat: my change"
[STARTED] Running tasks for staged files...
[STARTED] *.{ts,tsx} — 3 files
[STARTED] eslint --fix
[COMPLETED] eslint --fix
[COMPLETED] *.{ts,tsx} — 3 files
[STARTED] Applying modifications from tasks...
[COMPLETED] Applying modifications from tasks...
[develop abc1234] feat: my change
```

El hook detecto problemas, los arreglo, y el commit procedio. **Cero accion del agente**.

**Caso 2**: el hook bloquea por error no auto-corregible

```bash
$ git push
[pre-push] Running pnpm lint (full repo)…
src/views/.../FooView.tsx
  42:5  error  'unused' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)
ELIFECYCLE  Command failed with exit code 1
husky - pre-push hook exited with code 1
```

El hook detecto un error que no se puede auto-corregir (variable no usada). El push esta bloqueado. El agente:

1. Mira el mensaje de error.
2. Arregla el codigo (en este caso, borra la variable o la usa).
3. Hace nuevo `git add` + `git commit` + `git push`.
4. Esta vez el hook pasa, push procede.

## Que NUNCA hacer

- **NUNCA** correr `git commit --no-verify` o `git push --no-verify` para saltar los hooks. Eso bypassea la proteccion y manda el error a CI, que es exactamente lo que queremos evitar. Solo se permite con autorizacion explicita del usuario en emergencias documentadas (e.g. hotfix bloqueante de produccion).
- **NUNCA** desinstalar o deshabilitar los hooks. Son infra compartida; afectan a todos los agentes futuros.
- **NUNCA** poner `eslint-disable-line` masivo para silenciar reglas que el hook valida. Si una regla genera demasiados errores legitimos, hay que discutir downgrade a warning o cleanup task.

## Casos comunes

**El hook tarda mucho** (>90s en pre-push):
- Verifica que el cache de ESLint y TypeScript existen: `ls node_modules/.cache/eslint-staged` + `ls .tsbuildinfo`.
- Si no existen, la primera corrida es mas lenta. Las siguientes deberian ser rapidas.
- Si persistentemente >2min, abre issue.

**El hook bloquea por warnings (no errors)**:
- Los warnings NO bloquean. Solo errors. Si ves bloqueo y solo hay warnings, es bug del hook — abre issue.

**El hook reporta un error que no es mio**:
- El pre-push corre lint sobre el repo COMPLETO, asi que si otro agente dejo un archivo no staged con error, tu push se bloquea aunque no lo tocaste.
- Solucion correcta: arregla el error tu (es del repo, no de un agente especifico) y commitea junto con tu cambio. Documenta en el commit message que fue cleanup heredado.

**Quiero saltar el hook por X razon**:
- Pide autorizacion al usuario.
- Si autoriza: `git commit --no-verify -m "..."` + documenta razon en commit message + abre task de cleanup posterior.
- NUNCA bypassear sin autorizacion.

## Beneficio para el equipo

Antes (2026-04 y antes):
- Agente A pushea -> CI rechaza por error de style -> Agente B limpia 3h despues -> push toma 4-5 ciclos para landing.

Ahora (2026-05-05+):
- Agente A intenta `git push` -> hook detecta error local -> agente arregla -> push pasa primera vez. CI rara vez falla por style.

Estimado: 70-90% reduccion de ciclos revert+repush por errores de style/lint.

> **Detalle tecnico:**
> - Spec arquitectura: `docs/architecture/GREENHOUSE_GIT_HOOKS_AUTOENFORCEMENT_V1.md`
> - Reglas operativas para agentes: `CLAUDE.md` + `AGENTS.md` seccion "Git hooks canonicos"
> - Configuracion: `.husky/pre-commit`, `.husky/pre-push`, `package.json` (`lint-staged` block)
