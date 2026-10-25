# QA Release Audit — primera entrega local de Rooms

## Verdict

PASS para el alcance local autorizado de foundation + primera experiencia revisable. No acredita rollout ni aceptación visual humana.

Closure state: code complete, rollout pendiente

## Scope

- Runtime nuevo `../efeonce-rooms`, main, sin remote ni despliegue. Docs en Greenhouse develop.
- TASK-2058: foundation, contratos, can, readers y adaptadores HTTP/CLI.
- TASK-2059: sala sintética, capítulos creativos/SEO-AEO/plan, radiografía, workspace por rol.
- Implementación local revisada; no existen tablas, login real, invitaciones, upload ni comandos durables en este corte.
- No se cambió código runtime de Greenhouse ni otros productos. Cambios en índices/links corresponden al move de EPIC-052 a in-progress.

## Risk Classification

| Risk | Level | Why |
|---|---|---|
| Auth/access | High | Jerarquías, grants y aislamiento deben resistir cruces de organización/sala/edición |
| API/projections | High | Notas/grants no deben cruzar DTO cliente ni HTML/RSC |
| UI | Medium | Fidelidad del arte, lectura larga, foco, teclado y responsive |
| Dependencies | Medium | Consumidor independiente con TS7/API6, ESLint9 temporal y paquetes privados AXIS |

## Injected Skills

- software-architect-2026: fronteras y stack.
- greenhouse-task-planner / task-execution-hook: unidad, objetivo autorizado, contrato y secuencia.
- greenhouse-ai-design-studio / UI orchestrator / axis-design-system / efeonce-graphic-line: dirección y consumo del sistema existente.
- Product Design index/get-context/audit/critical-overrides: petición premium explícita, capturas IAB y correcciones sobre la experiencia real.
- imagegen / greenhouse-ai-creative-rights-governance: tres assets sintéticos con procedencia y sin cliente/persona real identificable.
- greenhouse-browser-diagnostics / GVC: escenario premium del consumidor.
- greenhouse-secret-hygiene: credencial efímera de instalación.
- greenhouse-qa-release-auditor / documentation-governor: evidencia y cierre honesto.

## Evidence

| Gate | Result | Evidence |
|---|---|---|
| Install | PASS | Primera instalación limpia379 paquetes; peers estrictos; frozen-lockfile posterior PASS; no force/legacy peer bypass |
| Versiones efectivas | PASS | Node24.17.0, pnpm12.15.0, `pnpm exec tsc --version`7.0.2, API TS6 efectiva6.0.3; [baseline §8](../../architecture/rooms/EFEONCE_ROOMS_STACK_BASELINE_V1.md) |
| Lint | PASS | ESLint con max-warnings0, a11y/hooks/imports/Next y reglas con tipos. Casos negativos alt-text, hook condicional y floating promise detectados |
| Typecheck/build | PASS | Next typegen+TS7 y Next build optimizado con API6; sin ignoreBuildErrors ni flag experimental; último verify/build repetido después del ajuste final del visor |
| Dominio/can | PASS |17 tests: deny por defecto, roles/grants/owner/tenant/sala/edición, ventanas vacías/invertidas/expiradas/revocadas, grants disjuntos, estados, schemas, proyección allowlist y no mutación |
| Datos privados | PASS | Sin evidence.read no salen bytes ni anchors; sin permiso de notas no salen notas. HTML/RSC/bundles cliente inspeccionados por E2E |
| API/CLI | PASS | Readers compartidos; CLI room/workspace/permissions/operations por HTTP. Workspace cliente403, persona inválida400, POST405, API real401 con headers/query forjados; CLI deny exit1 y demo obligatorio |
| Marca/activos | PASS |4 SVG oficiales copiados del registry con SHA256;3 PNG generados con provenance. Arte completo sin crop, pixel metadata real y tolerancia de redondeo limitada |
| QA browser | PASS |25 passed,3 skips de API repetida entre viewports,36.9s. Cuatro anchos1440/1024/390/320; ratios, original PNG, teclado, Escape/retorno,200% texto, reduced motion, permisos y payloads. Desborde tablet corregido y repetido |
| GVC premium | PASS | `.captures/2026-10-25T20-49-52_rooms-first-experience/manifest.json`:4 variantes,68 frames, exit0, enterprise pass,0 quality findings; console/page/hydration/http0. `review-dossier.md` junto al manifest |
| Product Design | Iteración ejecutada | [Auditoría](../../ui/reviews/TASK-2059-rooms-first-experience/product-design-audit.md), screenshots IAB reales antes/después, galería ampliada, cierre superior y nota natural |
| Task/readiness/epic | PASS previo a cierre | task:lint2058/2059 y ui:readiness-check2059 cero warnings; epic:lint052 strict cero warnings; repetir tras lifecycle |

## Blockers

Ninguno para entregar la demo local a revisión. El fallo tablet16:9 se corrigió por tamaño intrínseco y se verificó de nuevo en E2E, GVC e IAB (`12-tablet-landscape-after.png`).

## Conditional Follow-Ups

1. Aceptación visual del operador: pendiente; el logo aprobado no implica aprobar esta composición.
2. Efeonce ID, persistencia PostgreSQL/storage, auditoría/outbox, comandos, invitaciones, MCP, CI y hosting: alcance restante de EPIC-052. API real permanece cerrada.
3. Workspace multisala: resumen actual referido a la sala única; definir selección/agregación antes de expandir datos. Normalizar not_found/forbidden de recursos ajenos al implementar API autenticada.
4. Safari/Firefox/dispositivo físico y tecnología asistiva completa no certificados por Chromium/IAB. Axe no certifica contraste del texto incrustado en PNG. El alt semántico conserva el copy; generación es sólo demo, sin entrega comercial autorizada.
5. El estado error/loading de ruta está implementado, pero no se inyectan fallos artificiales de servicios inexistentes para afirmar recuperación productiva. Sin telemetría/Sentry ni medición de negocio real.

## False-Closure Traps Checked

- Build verde no acredita identidad ni deploy: ambas cosas quedan pendientes.
- Captura inicial no es aceptación: hallazgos reales originaron correcciones y nuevas capturas.
- Demo persona no es autenticación; los assets públicos son únicamente sintéticos.
- Capacidad calculada no anuncia command implementado; registry y UI declaran pending.
- Notas privadas se excluyen antes del render, no por CSS.
- Cierre de dos slices no completa R01/R02/R04 ni toda EPIC-052.

## Final Call

La base y experiencia están verificadas en runtime local y listas para revisión del operador. Se cierra TASK-2058 en su alcance local; TASK-2059 conserva la aceptación humana pendiente. El lanzamiento real mantiene sus propias dependencias y no está autorizado ni ejecutado aquí.


## Evidencia durable y observaciones del tooling

- [Dossier visual](../../ui/reviews/TASK-2059-rooms-first-experience/product-design-audit.md) conserva screenshots IAB en el repositorio; los manifests completos viven en `.captures` local.
- Un `axe incomplete` de caption en galería se revisó manualmente sobre fondo sólido:9.82:1; registro en `../efeonce-rooms/.captures/experience/manual-caption-contrast.json`. No generalizar ese resultado al texto dentro del PNG.
- `docs:closure-check` pasó sin warnings. Aviso de TTL de fichas de modelos ajenas es informativo y no constituye uso de esos proveedores en Rooms. El escaneo de links de índices completos encontró deuda histórica;90 enlaces añadidos/cambiados resolvieron sin faltantes.
- La rotación canónica de contexto archivó una entrada antigua de Handoff y changelog para respetar sus ventanas; no se borró historia.

### Alcance del gate visual

`ui:quality --task TASK-2059` PASS, media4.55/piso4.25; pulido menor pendiente: reducir repetición de títulos en radiografía móvil sin perder contexto. El `ui:visual-gate` sin scope tropieza con un symlink roto preexistente en `.captures/cotizacion-pibank-checkout-aislado-2026-10-08/node_modules/.bin/glob`, antes de evaluar Rooms. No se tocó ese artefacto ajeno. Contract-only PASS; se ejecutó el MISMO gate byte-for-byte en una carpeta temporal con task/wireframe/scenario idénticos y únicamente el directorio real de captura Rooms montado: PASS. [Registro con hash](2026-10-25-scoped-visual-gate.json). No se presenta ese resultado como reparación del walker global.

Runtime registrado en commit local `fc79db1` de `efeonce-rooms/main`; árbol limpio leído después del commit. Se reutilizó la identidad Git ya configurada en Greenhouse sólo para esa invocación, sin cambiar configuración global. Sin remote, push ni deploy.
