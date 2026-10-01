# SKY — evidencia de paquetes candidatos 2026-09-29

> Estado vigente: [continuidad operativa](../WORKBENCH_CURRENT_STATE.md), corte 2026-10-01.
> El sistema activo vive en `creative-workbench/brands/sky-airline`: 126 referencias Figma revisadas,
> producción modular y Lab integrados. Paquetes 0.1 publicados; contratos0.2 sin publicar.
> Lo siguiente conserva el bootstrap/evidencia de 2026-09-29; sus rutas y pendientes no son instrucciones
> actuales ni autorizan sync total, IAM, lectura de llaves por el equipo o distribución de Metric.

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
