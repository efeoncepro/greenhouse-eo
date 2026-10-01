# SKY — evidencia de paquetes candidatos 2026-09-29

> Corte de actualización 2026-09-30: App Workbench registrada/instalada por el operador y API
> GitHub de instalación verificada; secreto propio con una versión/SA exacta reportados, token
> efectivo y runtime pendientes. Pins App admitidos y vínculo del operador aprobado/preparado
> en privado; no runtime, rollout o IA habilitados. Ver
> [decisiones actuales](OPERATOR_DECISIONS.md#identidad-del-workbench--corte-2026-09-30) y
> [continuidad del harness](../../../../.codex/skills/efeonce-creative-workbench/references/state-continuity.md).
> El contenido siguiente conserva la evidencia y el plan iniciales del 2026-09-29.

Proyecto fuente local: `/Users/jreye/Documents/sky-brand-system`.
No es un checkout aislado de Greenhouse: posee sólo el sistema visual SKY previsto por el plan.

| Paquete | Versión | Contenido |
|---|---|---|
| `@efeoncepro/sky-tokens` | `0.1.0` candidata | 108 tokens, 33 aliases resueltos, IDs Figma, digest del snapshot; JSON/JS/CSS |
| `@efeoncepro/sky-brand-assets` | `0.1.0` candidata | Logo SVG oficial sellado, procedencia y metadata de 14 Metric OTF; sin binarios de fuentes |
| `@efeoncepro/sky-creative-contracts` | `0.1.0` candidata | Receta cuadrada Always On, contrato de contenido, versiones exactas |

Metric es la familia de producción. El ZIP del operador tiene siete pesos y sus itálicas.
Regular 400, Semibold 600, Bold 700 y Black 900 están verificados; prueba renderizada de contornos
en `/Users/jreye/Documents/creative/creative-workbench-canon/sky-airline/2026-09-29/metric-verificacion.png`.
La metadata portable elimina rutas locales. La distribución remota de fuentes no está establecida.

`node --test test/*.test.mjs`: cuatro pruebas pasan. Comprueban rechazo de marcas ajenas,
Inter/Arial, versiones genéricas y campos desconocidos; contenido obligatorio; estado inmutable;
cierre interno de aliases; disponibilidad de los pesos; hashes de assets y builds deterministas.

El contrato no autentica la aprobación legal ni los IDs de recursos: exige esas declaraciones y
señala los gates posteriores (`resource-preflight`, `approval-verification`, `pixel-qa`, `human-review`).
El piloto visual completo y la admisión fotográfica siguen pendientes.

La configuración `publishConfig` apunta a GitHub Packages privado. No hay publicación, repositorio
remoto nuevo, instalación de equipo, sync del workbench ni deployment acreditados por esta evidencia.

`npm pack --dry-run --json` inspeccionado para los tres paquetes: sólo `dist` y `package.json`,
sin OTF/TTF/WOFF, `.env` ni `.npmrc`. Lint de TASK-1945 y TASK-1946: cero errores/warnings;
`git diff --check` pasa. El gate estricto de contexto compartido sigue con dos warnings de tamaño
en Handoff y cantidad de entradas en changelog; no se rotó trabajo ajeno concurrente.
