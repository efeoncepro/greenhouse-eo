# Shell de los agentes (bash) — Manual de uso

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-10-25 por Claude
> **Ultima actualizacion:** 2026-10-25 por Claude
> **Modulo:** Plataforma · entorno local de agentes (Mac del operador)
> **Ruta en portal:** no aplica: es configuración local de Claude Code
> **Documentacion relacionada:** `CLAUDE.md` (Tooling disponible) · `AGENTS.md` (gotchas de macOS) · documentación de
> Claude Code: variable `CLAUDE_CODE_SHELL` (<https://code.claude.com/docs/en/env-vars.md>) y comportamiento de la
> herramienta Bash (<https://code.claude.com/docs/en/tools-reference.md>)

## Para qué sirve

Explica por qué los agentes de Claude Code corren sus comandos en **bash** aunque la terminal del operador use
**zsh**, qué se cambió para lograrlo, cómo comprobarlo y **cómo revertirlo**.

**El problema, en simple:** los agentes escriben los comandos pensando en bash. zsh se parece pero tiene tres diferencias
que hacían fallar comandos **sin avisar**:

| En zsh | Qué pasaba |
|---|---|
| `$VAR` sin comillas no se separa en palabras | `F="a b"; git add $F` intentaba agregar un solo archivo llamado «a b»: el commit salía vacío (pasó dos veces el 2026-10-25) |
| `$ref:src/…` se lee como un modificador | `git show $ref:src/lib/x` corrompía la ruta según la primera letra |
| `status` es de solo lectura | un `status=…` en un bucle mataba el proceso |

## Qué se cambió (2026-10-25)

1. **`~/.claude/settings.json`**: se agregó, arriba del todo, sólo este bloque:

   ```json
   "env": {
     "CLAUDE_CODE_SHELL": "/bin/bash"
   },
   ```

   Respaldo del archivo anterior, al lado: `~/.claude/settings.json.bak-2026-10-25-antes-bash`.
2. **`~/.bashrc` (archivo nuevo)**: replica lo que cargan `~/.zshenv`, `~/.zprofile` y `~/.zshrc` (Volta, Homebrew,
   gcloud, `~/.profile` y los tokens de `~/.config/codex/env.d/`). Claude Code lo lee al iniciar cada sesión con bash.
3. **Nada más.** La terminal del operador sigue en zsh, el login shell no cambió (`chsh` no se tocó) y los scripts
   con `#!/usr/bin/env bash` o `#!/bin/zsh` siguen usando su propio intérprete.

Se usa `/bin/bash` (3.2, el de macOS) porque no hay otro instalado. No trae `mapfile` ni arreglos asociativos; los
agentes casi no los usan.

## Antes de empezar

- El cambio **sólo aplica a sesiones nuevas**: una sesión abierta antes de la edición sigue en zsh.
- Codex no lee esta configuración: sus sesiones siguen en zsh (nota en `AGENTS.md`).

## Paso a paso

### Comprobar que una sesión corre en bash

Pídele al agente, en una sesión nueva:

```bash
echo "bash=${BASH_VERSION:-no} zsh=${ZSH_VERSION:-no}"
```

Tiene que imprimir `bash=3.2…` y `zsh=no`. Si imprime una versión de zsh, la sesión es anterior al cambio o la variable
no se leyó (ver Problemas comunes).

### Agregar una herramienta o variable nueva

Si instalas algo que agrega una ruta o una variable a `~/.zshenv`, `~/.zprofile` o `~/.zshrc`, **súmala también a
`~/.bashrc`**. Si no, los agentes no la encuentran. Comprueba con:

```bash
env -i HOME=$HOME PATH=/usr/bin:/bin /bin/bash -c 'source ~/.bashrc; command -v <herramienta>'
```

### Revertir

Opción A, la corta: borra el bloque `"env": { "CLAUDE_CODE_SHELL": "/bin/bash" },` de `~/.claude/settings.json` (cuida
que el JSON quede válido) y abre una sesión nueva. Los agentes vuelven a zsh.

Opción B, restaurar el archivo completo (sólo si no cambiaste nada más en él desde el 2026-10-25):

```bash
cp -p ~/.claude/settings.json.bak-2026-10-25-antes-bash ~/.claude/settings.json
```

`~/.bashrc` puede quedarse: sin la variable, Claude Code no lo usa. Si quieres borrarlo, que no quede nada que dependa de
él (`grep -l bashrc ~/.*`).

Después de revertir, valida el JSON:

```bash
python3 -c "import json; json.load(open('$HOME/.claude/settings.json')); print('ok')"
```

## Qué significan las señales

| Señal | Qué quiere decir |
|---|---|
| `bash=3.2… zsh=no` | la sesión corre en bash: todo bien |
| `bash=no zsh=5.9` | la sesión corre en zsh: es anterior al cambio, o se revirtió |
| `command not found` para algo que en tu terminal funciona | falta esa ruta en `~/.bashrc` |

## Qué no hacer

- No cambies el login shell (`chsh`) ni pongas `SHELL=` en los archivos de zsh: afecta a todo el Mac.
- No pongas `setopt` ni otra sintaxis de zsh en `~/.bashrc`: bash falla al leerlo.
- No borres el respaldo hasta estar seguro de que no lo necesitas.

## Problemas comunes

| Problema | Causa | Solución |
|---|---|---|
| Una sesión nueva sigue en zsh | la app ya traía la variable desde su lanzamiento, o no se reinició la sesión | cierra la sesión y abre otra; si persiste, define `CLAUDE_CODE_SHELL=/bin/bash` en las variables de entorno de sesiones locales de la app de escritorio |
| Un agente no encuentra una herramienta | ruta que sólo está en el perfil de zsh | súmala a `~/.bashrc` |
| Un comando usa sintaxis de bash moderno (`mapfile`, `declare -A`) | `/bin/bash` es 3.2 | reescríbelo, o instala bash con Homebrew y apunta `CLAUDE_CODE_SHELL` a `/opt/homebrew/bin/bash` (decisión del operador) |

## Referencias técnicas

- `CLAUDE.md` → «Tooling disponible», punto «Shell de los agentes = bash».
- `AGENTS.md` → gotchas de macOS (para Codex y sesiones en zsh).
- Documentación de Claude Code: `CLAUDE_CODE_SHELL` y «Bash tool behavior» (la sesión lee `~/.bashrc` o `~/.zshrc`
  según el shell).
