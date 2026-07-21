# Work management page templates

These are visual/golden specifications for the renderer, not executable Mustache templates and not strings for an agent to paste. `{{...}}` documents field placement only; runtime consumes the typed AST from `enhanced-markdown-renderer.md`. Resolve every field, escape user content and omit empty optional sections. A data-source page title lives in properties; do not emit H1.

## Project

```md
<callout icon="🎯" color="blue_bg">
	**Objetivo:** {{objective}}
</callout>
## Criterios de éxito
{{#successCriteria}}
- [ ] {{item}}
{{/successCriteria}}
## Alcance {toggle="true"}
	**Incluye**
{{#inScope}}
	- {{item}}
{{/inScope}}
	**No incluye**
{{#outOfScope}}
	- {{item}}
{{/outOfScope}}
## Contexto e insumos {toggle="true"}
	{{context}}
{{#resources}}
	- [{{label}}]({{url}})
{{/resources}}
## Riesgos y decisiones {toggle="true"}
{{#risks}}
	- {{item}}
{{/risks}}
```

Keep the objective and success criteria visible. Projects do not contain subprojects; actionable work becomes related task pages.

## Root task

```md
<callout icon="🎯" color="blue_bg">
	**Resultado esperado:** {{objective}}
</callout>
## Definition of Done
{{#definitionOfDone}}
- [ ] {{item}}
{{/definitionOfDone}}
## Contexto e insumos {toggle="true"}
	{{context}}
{{#resources}}
	- [{{label}}]({{url}})
{{/resources}}
## Dependencias y restricciones {toggle="true"}
{{#dependencies}}
	- {{item}}
{{/dependencies}}
## Resultado y cierre {toggle="true"}
	<span color="gray">Pendiente de completar.</span>
```

Objective and at least one verifiable DoD item are required.

## Subtask at any depth

```md
<callout icon="🎯" color="blue_bg">
	**Resultado esperado:** {{objective}}
</callout>
## Definition of Done
{{#definitionOfDone}}
- [ ] {{item}}
{{/definitionOfDone}}
## Contexto puntual {toggle="true"}
	{{context}}
## Resultado y cierre {toggle="true"}
	<span color="gray">Pendiente de completar.</span>
```

Do not copy the full parent/project context. The relation carries hierarchy; a mention may link to the parent when useful.

## Closure replacement

Replace the unique pending closure anchor using exact `update_content` matching:

```md
## Resultado y cierre {toggle="true"}
	<callout icon="✅" color="green_bg">
		**Resultado:** {{result}}
	</callout>
	**Evidencia**
{{#evidence}}
	- [{{label}}]({{url}})
{{/evidence}}
	**Definition of Done verificada**
{{#definitionOfDone}}
	- [x] {{item}}
{{/definitionOfDone}}
	**Notas de cierre**
	{{closingNotes}}
```

`result` is required. If evidence is not applicable, record a governed reason. A terminal status without the required result is `completion_incomplete`.

## Optional persistent status snapshot

CLI/API JSON remains the primary status output. Use this only when persisting a report in Notion.

```md
<callout icon="{{statusIcon}}" color="{{statusColor}}">
	**{{statusLabel}}:** {{statusSummary}}
</callout>
<table fit-page-width="true" header-row="true">
	<tr><td>Campo</td><td>Valor</td></tr>
	<tr><td>Teamspace</td><td>{{spaceDisplayName}}</td></tr>
	<tr><td>Responsable</td><td>{{assigneeDisplay}}</td></tr>
	<tr><td>Fecha límite</td><td>{{dueDateDisplay}}</td></tr>
	<tr><td>Tiempo restante</td><td>{{remainingDisplay}}</td></tr>
	<tr><td>Último avance</td><td>{{lastProgressDisplay}}</td></tr>
</table>
## Progreso del árbol {toggle="true"}
	{{treeList}}
## Resultado y evidencia {toggle="true"}
	{{resultSummary}}
```

Map overdue/blocked to red, due-today to orange, due-soon to yellow, on-track/completed to green and unscheduled to gray. Always include a text label.
