# Enhanced Markdown renderer and validator

Use a deterministic renderer over a closed AST. Do not let agents interpolate raw XML-like markup into production payloads. This file is the implementation contract; until the renderer, linter and tests exist in runtime code, productive automated writes remain **not implemented**. Interactive MCP one-shots must still follow the templates and perform readback, but cannot claim the runtime gate passed.

## Contract

```ts
renderProjectBody(input): string
renderTaskBody(input): string
renderSubtaskBody(input): string
renderClosureFragment(input): string
renderStatusSnapshot(input): string
formatEnhancedMarkdown(ast): string
lintRenderedDocument({ markdown, ast, properties, policy, templateVersion }): Finding[]
```

## Closed input model

The implementation may use equivalent names, but must preserve these boundaries:

```ts
type UserText = { value: string; provenance: 'user' }
type TrustedText = { value: string; provenance: 'system'; key: string }
type SafeUrl = { value: string; provenance: 'validated-url' }
type Inline = UserText | TrustedText | { type: 'link'; label: UserText; url: SafeUrl } | { type: 'mention'; id: string; url: SafeUrl }
type RichText = Inline[]
type TextColor = 'gray' | 'brown' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'red'
type AllowedColor = TextColor | `${TextColor}_bg`
type AllowedLanguage = 'text' | 'bash' | 'json' | 'typescript' | 'javascript' | 'sql' | 'mermaid'
type ListItem = { text: RichText; checked?: boolean; children?: Section[] }

type Section =
  | { type: 'paragraph'; text: RichText }
  | { type: 'heading'; level: 1 | 2 | 3 | 4; text: RichText }
  | { type: 'toggleHeading'; level: 1 | 2 | 3 | 4; text: RichText; children: Section[] }
  | { type: 'callout'; icon: TrustedText; color: AllowedColor; children: Section[] }
  | { type: 'details'; summary: RichText; children: Section[] }
  | { type: 'bullets' | 'numbered' | 'checklist'; items: ListItem[] }
  | { type: 'table'; headerRow: boolean; headerColumn: boolean; rows: RichText[][] }
  | { type: 'code'; language: AllowedLanguage; raw: UserText }

type WorkBodyInput =
  | { templateVersion: 'work-management-v1'; kind: 'project'; objective: UserText; successCriteria: UserText[]; inScope?: UserText[]; outOfScope?: UserText[]; sections?: Section[] }
  | { templateVersion: 'work-management-v1'; kind: 'task' | 'subtask'; objective: UserText; definitionOfDone: UserText[]; resources?: { label: UserText; url: SafeUrl }[]; sections?: Section[] }
  | { templateVersion: 'work-management-v1'; kind: 'closure'; result: UserText; evidence: { label: UserText; url: SafeUrl }[]; evidenceNotApplicableReason?: UserText; verifiedDefinitionOfDone: UserText[]; closingNotes?: UserText }
  | { templateVersion: 'work-management-v1'; kind: 'status'; state: DueState; icon: TrustedText; color: AllowedColor; summary: UserText; assignees: UserText[]; dueDisplay: UserText; remainingDisplay: UserText; treeSummary: UserText; resultSummary: UserText }
```

Attributes, colors, icons and code languages come from trusted enums, never user strings. Table cells accept text values only. A normal heading cannot have children by type. The linter receives AST/properties/provenance so it can detect tainted markup and property/body duplication; raw Markdown alone is insufficient.

For project/task/subtask, supplemental `sections` render after success criteria/DoD and before the closure anchor. Closure and status have fixed layouts and do not accept arbitrary sections. Fenced code preserves raw content and chooses a backtick fence longer than the longest backtick run in the content (minimum three); it does not apply rich-text escaping inside the fence.

## Rendering pipeline

1. Validate a browser-safe DTO and domain policy.
2. Normalize Unicode and newlines to LF.
3. Escape all user-controlled content outside code fences. Inputs are raw, never pre-escaped: normalize first, escape backslash first, then prefix each reserved character with one backslash exactly once. Code content uses its dedicated fenced-code escape policy.
4. Validate URLs and resolve mentions to stable IDs/URLs before rendering.
5. Emit blocks and attributes in a fixed order.
6. Indent structural children exclusively with tabs.
7. Omit empty optional sections rather than writing `N/A`.
8. Emit exactly one versioned closure anchor section. V1 constant:
   `## Resultado y cierre {toggle="true"}\n\t<span color="gray">Pendiente de completar.</span>`.
9. Produce byte-identical output for the same DTO.

Persist `templateVersion` and the rendered hash in the mutation audit. An updater must import the same anchor constant as the renderer; it never recreates the string independently.

The renderer owns syntax. The domain command owns authorization, hierarchy, idempotency and persistence.

## Required lint errors

- Unresolved `{{placeholder}}`.
- Spaces used as structural indentation.
- Unbalanced or crossed Enhanced Markdown tags.
- Child under a non-toggle heading.
- Unindented child inside callout, toggle or columns.
- Unknown tag, `<unknown>`, invalid color or unsafe attribute.
- Block content inside `<td>`.
- H1 in a data-source page body.
- Task without objective or Definition of Done.
- Project without objective or success criterion.
- More than one `Resultado y cierre` section.
- Closure without result.
- Raw user-supplied XML/HTML.
- Structured properties duplicated into narrative body.

Warnings should cover excessive context, more than ten DoD items, empty toggles, repeated empty blocks, oversized tables and missing optional evidence.

## Tests

### Golden fixtures

- Full/minimal project.
- Full/minimal root task.
- Subtask at depths 1, 10 and 100: identical body for identical DTO.
- Closure with one/many evidence links.
- Status snapshot for every due state.
- Real tabs and exact output hashes.

### Escaping and fuzzing

- Every reserved character.
- Unicode normalization and emoji.
- Attempts to inject `</callout>`, `<td>`, mentions or toggle attributes.
- Golden output for `</callout>` is literal `\</callout\>` in rendered rich text.
- URLs with queries and parentheses.
- CRLF input, inline code and fenced code.

### Integration

- Create page, retrieve via `/markdown`, compare normalized semantics.
- Verify toggle heading, callout, checkbox, table and mention round-trip.
- Update only the closure anchor with `update_content`.
- Reject stale `last_edited_time`/hash before overwriting human edits.
- Treat `truncated=true` or unresolved `unknown_block_ids` as incomplete.

Do not attempt a full general-purpose Markdown parser for V1. A closed AST plus stack-based validation for the emitted subset is smaller, safer and testable.
