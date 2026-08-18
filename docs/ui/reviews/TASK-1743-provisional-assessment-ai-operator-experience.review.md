# TASK-1743 — Provisional Assessment AI Operator Experience visual review

## Verdict

`PASS` para el consumer operator-only de evaluación provisional. Scorecard: `4.43/5`, piso `4/5`, rubric enterprise `pass`.

## Runtime evidence

- Staging exacto: `https://greenhouse-1jxay7wkq-efeonce-7670142f.vercel.app`, deployment `dpl_5KjYEBfxDHQP26xcwByi7rP7Zv37`.
- GVC canónico caliente: `.captures/2026-08-18T18-55-55_task-1743-provisional-assessment-ai`.
- Desktop `1440x1100` y mobile `390x844`: seis frames, ambos manifests con `exitCode: 0`.
- Runtime: cero errores de consola, página, hidratación o HTTP; assertions de sesión, route y copy operator-only verdes.
- Layout: sin overflow de página; los dos navs horizontales canónicos conservan su scroll intencional en mobile.
- Performance caliente: dentro del presupuesto GVC. La primera carga fría desktop midió `5004ms`, repitió verde sobre el mismo deployment y se conserva como observación de infraestructura, no como deuda visual aceptada.

## Review findings

- “Evaluación provisional de IA”, “Solo para operadores” y “No incorporada al resultado efectivo” separan autoridad y evitan presentar la propuesta como score canónico.
- La cobertura declara `12/12`, `2` scores efectivos y `10` propuestas IA; no oculta abstenciones, fallos ni pendientes cuando existan.
- Las nueve competencias se leen completas en desktop y 390 px, sin labels cortados ni ejes abreviados.
- La alerta usa superficie y tokens canónicos; contraste y receta enterprise pasaron tras retirar el texto warning de bajo contraste.
- La interacción por teclado abre y cierra la evidencia con `Enter` y `Escape`; el estado transitorio `aria-busy` queda como warning informativo, no error.

## Scope boundary

La experiencia no rankea, recomienda, decide, mueve stages, asigna tests, envía emails ni expone resultados al postulante, clientes, B2B, Nexa o MCP.
