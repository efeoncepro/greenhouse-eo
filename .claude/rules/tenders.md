---
paths:
  - "src/lib/commercial/tenders/**"
  - "docs/architecture/tender-deck-composer-prototypes/**"
  - "scripts/commercial/compose-tender-deck.ts"
---

# Licitaciones / Tender Deck Composer — invariantes (auto-load por path)

Antes de tocar este dominio, cargá **`docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md`**
(+ la skill `greenhouse-public-private-tenders` → `deck-visual-system.md` y `deck-studio` para argumento,
composición y entrega del deck).

**Estado real:** el composer YA emite el entregable (PDF de N páginas, `pnpm deck:compose`); las 25 plantillas tienen slots; la state machine (12 estados) es **TS puro SIN tabla en DB**; y **no hay API/UI/migración/capability** — el único consumer es el CLI.

Una oferta es un **documento contractual que evalúa un comité**. De ahí las 3 reglas raíz:

1. **Anti-fabricación** — **NUNCA** una cifra sin `evidenceRef`, **NUNCA** geometría dibujada a mano (la barra sale del número o no sale), **NUNCA** una cara del squad generada con IA (es tergiversación, no un tema estético).
2. **Fail-closed** — **NUNCA** un `default:` silencioso en el filler; **NUNCA** truncar copy (`overflow: reject`); **NUNCA** `grid-template-columns` en `%` con `gap` (los % no descuentan el gap → `.slide{overflow:hidden}` amputa la palabra en silencio). "Pasó `maxCharacters`" **NO** significa "cabe": el juez es el layout real (`assertSlideFitsCanvas`).
3. **Human-in-control** — el agente prepara; **el humano sube y firma**. **NUNCA** un GO sin margen sobre loaded cost.

**`TimelineFull`:** el plan declara `timeUnit`, eje discreto, fases, hitos y `barLabel`; el compiler deriva
grilla, rangos, diamantes y conectores. `barLabel` es copy editable en barras sólidas o punteadas, incluso de
una unidad. **NUNCA** se editan porcentajes/conectores ni se oculta el label para pasar: el layout real lo mide
y falla cerrado si se recorta.

**SIEMPRE** gate de cierre al tocar el dominio: `pnpm vitest run src/lib/commercial/tenders` verde.
