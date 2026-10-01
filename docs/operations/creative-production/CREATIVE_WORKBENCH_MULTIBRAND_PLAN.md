# Creative Workbench — harness del equipo Efeonce para múltiples marcas

Estado vigente: producción modular SKY y Lab integrados en Workbench; rollout completo del equipo/IA y segunda marca pendientes.
Plan original: 2026-09-29. Actualización: 2026-10-01. Operador: Julio Reyes.

[Continuidad operativa vigente](WORKBENCH_CURRENT_STATE.md) separa código, pruebas, Packages y runtime. El motor activo se desarrolla en Workbench; Greenhouse conserva gobernanza/skills. No efectuar un sync total del plan inicial sobre las rutas nativas.

## Objetivo y alcance confirmado

Construir sobre `efeoncepro/creative-workbench` un espacio de producción gráfica y con IA para
varias personas del equipo Efeonce y múltiples marcas. SKY Airline es el primer onboarding de marca
y el primer caso de validación completa; no es el dueño del harness compartido.

El equipo comparte herramientas técnicas, flujo de trabajo y gobernanza. Cada marca conserva sus
paquetes versionados, recursos oficiales, referencias web independientes, skills y recetas propias.
Efeonce es otra marca del catálogo: no es un default visual para sus clientes.

## Tres identidades separadas

- Persona: quién actúa, marcas asignadas y capacidades autorizadas, incluida generación con IA.
- Marca: qué sistema visual, recursos, reglas y versiones puede usar la ejecución.
- Proyecto/pieza/ejecución: brief, servicio, responsable, aprobador, entradas, resultados y trazabilidad.

Compartir marca no implica compartir directorio mutable de ejecución. Dos personas pueden producir
para SKY simultáneamente con corridas identificadas y salidas inmutables; no sobrescriben prompts,
locks, archivos temporales o entregables de otra corrida. La aprobación conserva identidad humana.
Una persona asignada a varias marcas puede trabajar en todas ellas, pero cada ejecución queda vinculada
a una sola marca y no mezcla contexto, cachés, referencias o recetas entre corridas.

## Fronteras de implementación

1. Foundation común: catálogo, contexto, resolver, preflight, wrappers, validadores y procedencia son
   implementación nativa de Workbench; Greenhouse mantiene decisiones, skills y control de distribución
   sellada. No reinstalar mirrors del template ni confundir gobernanza con ownership del motor.
2. Sistemas independientes por marca: tokens, assets, contratos creativos, recetas y referencia web.
   Consumo por versiones exactas; ningún cliente hereda identidad de otro.
3. Workbench del equipo: selección explícita de marca/proyecto, acceso según asignaciones reales,
   doctor contextual, producción, revisión, exportación y handoff.
4. Onboarding repetible: fuente autorizada → inventario → sistema candidato → QA → release → consumo.
   SKY recorre este camino primero; Berel y futuras marcas usan el mismo contrato.

## Orden de trabajo

Foundation multimarcas y multipersona → onboarding SKY → referencia SKY → pieza piloto completa
→ rollout del equipo. El inventario SKY ya extraído vive en
`sky-airline/figma-observed-variables.json`; su plan específico en `sky-airline/BOOTSTRAP_PLAN.md`.

## Acceptance criteria del alcance

- [ ] Onboarding de una marca adicional sin introducir cambios específicos en el motor compartido.
- [ ] Cruces entre SKY, Berel y Efeonce rechazados antes de generar o componer.
- [ ] Persona sin asignación/capacidad rechazada por la autoridad efectiva, no sólo por metadata local.
- [ ] Dos personas y dos corridas de una misma marca sin sobrescritura ni contaminación de contexto.
- [ ] Una persona con dos marcas mantiene dependencias y salidas aisladas por ejecución.
- [ ] Revisión/aprobación y auditoría atribuidas a identidades verificadas.
- [ ] Paquetes, sitios y piezas acreditan la misma versión del sistema de marca.
- [ ] SKY completa un piloto end-to-end; otras marcas siguen pendientes hasta su propio onboarding.

## Goal confirmado

Construir el harness compartido de Creative Workbench para múltiples marcas y personas del equipo
Efeonce, con aislamiento obligatorio por ejecución, producción con IA, paquetes privados y referencias
web por marca; incorporar SKY Airline como primer sistema y validar el flujo completo con Always On.

Julio confirmó el goal con «Vamos». TASK-1945 y TASK-1946 tienen task-hook ejecutado.
Este documento no acredita permisos, infraestructura o rollout productivo.
