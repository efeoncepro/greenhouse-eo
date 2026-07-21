# Enhanced Markdown canonical

> Verified: 2026-07-18 · Notion-Version: `2026-03-11`
>
> Official sources: [Enhanced markdown format](https://developers.notion.com/guides/data-apis/enhanced-markdown), [Working with markdown content](https://developers.notion.com/guides/data-apis/working-with-markdown-content), [Request limits](https://developers.notion.com/reference/request-limits).

Use this reference before creating, retrieving, or updating a Notion page body. Enhanced Markdown (Notion-flavored Markdown) is standard Markdown plus XML-like tags and block attributes.

## 1. Choose the correct surface

| Need | Canonical surface |
|---|---|
| Narrative page body, headings, toggles, callouts, tables | Enhanced Markdown |
| Structured database values | Page properties API |
| Unsupported Markdown block or exact block mutation | Block API |
| Agent one-shot | MCP, when available |
| Deterministic runtime, pagination, webhooks, throttling | REST/SDK wrapper |

Do not mix `markdown` with `children` or `content` in the same create request.

## 2. Whitespace, children and escaping

- Indent every child block with one additional **real tab**. Spaces do not define child structure.
- Use newlines between blocks and `<br>` for a line break inside one block.
- Plain empty lines are stripped. Use `<empty-block/>` on its own line for persistent visual space.
- Outside fenced code, escape: `\`, `*`, `~`, backtick, `$`, `[`, `]`, `<`, `>`, `{`, `}`, `|`, `^` when they are user content rather than intended syntax.
- Never escape code-fence contents.
- Normalize payloads to LF before rendering.

## 3. Blocks cookbook

### Text and headings

```md
Plain rich text {color="blue"}
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
```

H5/H6 become H4. Ordinary headings cannot own children.

Toggle heading:

```md
## Context {toggle="true" color="gray_bg"}
	Child paragraph
	- Child item
```

### Toggle and callout

```md
<details color="gray_bg">
<summary>View details</summary>
	Child content
</details>

<callout icon="🎯" color="blue_bg">
	**Objective:** ship the validated result.
	- Child item
</callout>
```

Both support multiple child blocks. Keep `<summary>` directly below `<details>`.

### Lists, todos and quotes

```md
- Bulleted item
	Child
1. Numbered item
- [ ] Open criterion
- [x] Completed criterion
> Line one<br>Line two {color="gray"}
```

Multiple `>` lines create separate quote blocks.

### Code and equations

````md
```typescript
const value = 1
```

```mermaid
flowchart LR
  A --> B
```

$$
E = mc^2
$$
````

### Tables

Use pipe tables only for simple read-only tables. Use XML for governed layout, header configuration or color.

```md
| Field | Value |
|---|---|
| Status | In progress |
```

```md
<table fit-page-width="true" header-row="true" header-column="false">
	<colgroup>
		<col color="gray_bg">
		<col>
	</colgroup>
	<tr>
		<td>Field</td>
		<td>Value</td>
	</tr>
</table>
```

All table attributes default to `false`. Cells accept rich text only. Color precedence: cell, row, column.

### Columns

```md
<columns>
	<column>
		## Context
		Content
	</column>
	<column>
		## Result
		Content
	</column>
</columns>
```

Do not use columns in routine task pages: they add mobile and automation cost without improving execution.

### Media and references

```md
![Caption](URL)
<audio src="URL">Caption</audio>
<video src="URL">Caption</video>
<file src="URL">Caption</file>
<pdf src="URL">Caption</pdf>

<page url="URL">Title</page>
<database url="URL" inline="true" icon="📚">Name</database>
<table_of_contents/>
```

Retrieved media URLs are pre-signed and temporary. Persist Notion IDs or durable source URLs, not returned media URLs.

### Mentions, inline formatting and colors

```md
**bold** *italic* ~~strike~~ <span underline="true">underline</span>
`inline code` [link](URL) $equation$ <br>
<span color="red">warning</span>

<mention-user url="URL">Name</mention-user>
<mention-page url="URL">Title</mention-page>
<mention-database url="URL">Database</mention-database>
<mention-data-source url="URL">Data source</mention-data-source>
<mention-agent url="URL">Agent</mention-agent>
<mention-date start="2026-07-18" end="2026-07-20"/>
<mention-date start="2026-07-18" startTime="09:00" timeZone="America/Santiago"/>
```

Text colors: `gray brown orange yellow green blue purple pink red`.

Backgrounds: `gray_bg brown_bg orange_bg yellow_bg green_bg blue_bg purple_bg pink_bg red_bg`.

Use `{color="..."}` on Markdown blocks, `color="..."` on XML blocks, and `<span color="...">` inline. Never rely on color alone to convey state.

## 4. Create, read and update

### Create

`POST /v1/pages` accepts `markdown`. For data-source pages, always set the title property explicitly; do not rely on H1 extraction. `allow_async: true` returns `202` plus an async task, which must be polled to a terminal state.

### Read

`GET /v1/pages/{page_or_block_id}/markdown` returns:

```json
{
  "object": "page_markdown",
  "id": "...",
  "markdown": "...",
  "truncated": false,
  "unknown_block_ids": []
}
```

A read is complete only when `truncated=false` and `unknown_block_ids` is empty. Fetch returned subtree IDs individually when needed.

### Update

Prefer:

- `update_content`: exact, case-sensitive `old_str` → `new_str`; fail if the selector is missing or ambiguous.
- `replace_content`: full replacement after reading and checking concurrent edits.

Treat `insert_content` and `replace_content_range` as legacy. Never enable `allow_deleting_content` without explicitly checking for child pages/databases and obtaining destructive intent.

## 5. Unsupported and read-only representations

Bookmark, embed, link preview, breadcrumb, template button and unknown block types render as `<unknown url="..." alt="block_type"/>`. Use the Block API when fidelity is required.

Additional cautions:

- Tab blocks are not documented in Enhanced Markdown; use Block API.
- Meeting notes have a documented read representation but no documented authoring grammar; treat as read-only.
- Comment Markdown supports inline formatting, not full page block grammar.
- URLs may change shape; persist opaque IDs rather than parsing URL prefixes.

## 6. Limits

- Average 3 requests/second per connection; honor `429` and `Retry-After`.
- Maximum request payload: 500 KB and 1,000 block elements.
- Rich-text content and URLs: 2,000 characters per item.
- Equation: 1,000 characters.
- Arrays, people and relation writes have documented finite limits; paginate property reads when `has_more=true`.
- Very large Markdown reads can truncate around 20,000 blocks. Keep operational work pages small.

## 7. Preflight checklist

- [ ] Properties and body responsibilities are separated.
- [ ] All placeholders are resolved.
- [ ] User content is escaped by the renderer.
- [ ] Children use tabs.
- [ ] Tags are balanced and supported.
- [ ] Tables contain rich text only.
- [ ] No H1 duplicates a data-source title property.
- [ ] Read/update paths handle truncation and concurrent edits.
- [ ] Runtime writes use the canonical SDK wrapper, idempotency and audit.
