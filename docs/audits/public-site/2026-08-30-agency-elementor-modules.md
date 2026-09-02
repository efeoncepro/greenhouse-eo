# QA Release Audit — Agency Elementor preview

## Verdict

BLOCK para cierre integral de edición; frontend modular desplegado y verificado.

Closure state: operativamente bloqueado sólo en la prueba de interfaz Elementor (login requerido).
No es un bloqueo de render ni de activación del plugin.

## Scope

- Página `251731` y nuevos widgets Agency en `eo-elementor-widgets`; Home `2791` excluida de cambios.
- WIP ajeno Creative/Social preservado; no commit/push ni despliegue completo del repo runtime.
- Contrato y manuales: [Agency Elementor Modules V1](../../architecture/public-site/AGENCY_ELEMENTOR_MODULES_V1.md).

## Risk Classification

| Riesgo | Nivel | Motivo |
| --- | --- | --- |
| Renderer y registro en plugin compartido | Alto | Instalar sólo archivos nuevos y la entrada acotada del loader, con hashes y respaldo |
| Diseño, motion y responsive | Medio | Contenido fuente complejo, interacciones y adaptación móvil |

## Injected Skills

- `efeonce-public-site-wordpress`: carril WP-CLI/Elementor y runtime público.
- `greenhouse-ai-design-studio`: fidelidad a la dirección suministrada y reuso/extension.
- `greenhouse-gvc-playwright` + Browser: capturas desktop/mobile y revisión visible.
- `greenhouse-qa-release-auditor` y `greenhouse-documentation-governor`: evidencia y continuidad.
- Las sugerencias Vuexy/portal del helper general no aplican al renderer WordPress; se usa el contrato público.

## Evidence

| Gate | Resultado | Evidencia |
| --- | --- | --- |
| Renderer PHP | PASS | `php tests/agency-modules.test.php`: 17 módulos, 318 aserciones de texto, repeater reorder/removal, Media y escaping |
| Lifecycle JS | PASS | `agency-elementor-lifecycle.test.cjs`: montar/reemplazar/remover, idempotencia, filtro, foco, reduced motion y validación demo |
| Elementor real servidor | PASS | `verify-agency-elementor-contract.php`: controles registrados y render probe; 17 contenedores/widgets, 0 HTML, 452 campos, 7 repeaters |
| Frontend Browser | PASS | `.captures/agency-elementor-rollout/browser/`: 1440/390, frames inspeccionados; no overflow, filtro/FAQ/modal/foco y consola limpia |
| Motor móvil | PASS | Rectángulos de las cuatro tarjetas sin intersección; núcleo + grilla legible |
| Reduced motion live | PASS | Emulación CDP restaurada: 0 reveals ocultos, 0 clones marquee, animaciones 1e-05s, ancho 390/390 |
| Editor UI save/reload | PENDIENTE | La pestaña se redirige a `wp-login.php`; solicitud de login enviada al operador |
| Diff | PASS | `git diff --check` en ambos checkouts |
| Cierre docs | Advisory | Tres avisos revisados: no cambió contrato de arranque/project_context, no hay skill nueva, no se movió lifecycle ni ID de la task |
| Task lint | Advisory | 0 errores, 1 aviso: el plan histórico sigue `Motion: none`; falta contrato completo antes de `UI ready: yes` |
| Context strict | PASS | 0 errores/avisos; sin rotación necesaria en este corte |

## Blockers

1. Iniciar sesión en WordPress en el navegador abierto; después editar/guardar/recargar un widget y verificar
   persistencia y frontend. No confundir el render probe PHP con edición humana certificada.

## Conditional Follow-Ups

1. Aprobación visual del operador, selección de los 12 medios faltantes, copy/claims, conversión y SEO/CRO.
2. Completar motion/readiness del rework antes de aprobar la Home. El formulario sigue siendo demo sin lead/reserva.

## False-Closure Traps Checked

- Runtime sí desplegado y leído; no inferido sólo desde archivos locales o handoff.
- Capturas iniciales mal posicionadas se reemplazaron por capturas con ancla y posición verificadas.
- Registro y tests de widgets no certifican por sí solos la interfaz del editor.
- No indexación, navegación ni cutover implícitos; TASK-1358 permanece `to-do`/`UI ready: no`.
- No se afirma observabilidad Sentry ni integración CRM que no se haya probado.

## Final Call

La corrección a widgets reales está instalada y funciona en la preview. No se declara cerrado el flujo de
edición hasta disponer de la sesión WordPress y completar el guardado desde Elementor.
