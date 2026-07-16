# Customer Agent Delivery

## Configuration model

Treat these as independent layers:

1. **Identity/persona:** role, tone, language, greeting, empathy and prohibited behavior.
2. **Knowledge:** approved Markdown sources, provenance, freshness and contradictions.
3. **Instructions:** intent classification, question sequencing, memory and technical boundaries.
4. **Actions:** real capabilities and their preconditions; never claim an action occurred when it did not.
5. **Handoff:** explicit triggers, minimum context, assignment target, availability and system messages.
6. **Channel/entry:** landing buttons, query parameters, privacy consent, chatflow targeting and widget constraints.
7. **Measurement:** resolution definition, handoff rate, contained intents, exceptions, quality and cost.

## Knowledge preparation

- Convert client documents into focused Markdown files with clear ownership and update dates.
- Separate company facts, services/norms, quotation intake, FAQ, billing/administration, quality/complaints and parameter catalogues.
- Resolve contradictions before upload. Do not ask the model to arbitrate conflicting policy.
- A catalogue entry proves availability only when matrix + parameter match; it does not define a regulatory panel.

## Conversation design

- Recognize the concrete need before collecting data.
- Reuse all prior facts, numbers and references; never ask twice.
- Use natural blocks of one to three related questions as a default, not a hard maximum.
- If the visitor lacks a document, offer an alternate path and continue with the next useful block.
- Answer documented administrative guidance before escalating an action request.
- For mixed intent, resolve the informational part and preserve the action context for handoff.
- Never promise price, deadline, legal compliance, outcome or responsibility without evidence.

## Human handoff

Immediate handoff is valid when the visitor explicitly asks for a person. Otherwise collect the minimum context required for the human action. Keep the message empathetic, state that context is preserved and identify the assigned owner only when routing proves it.

HubSpot may trigger a native transfer before a trained short answer. When observed:

1. verify the published transfer rules;
2. improve online and unavailable transfer messages;
3. retest the exact phrase;
4. document the native limitation instead of claiming the short answer controls it.

## Minimum QA matrix

Test at least:

- technical information with and without a cited norm;
- quotation for every service family;
- unknown parameters and unavailable documents;
- billing information vs a real billing action;
- service follow-up;
- complaint/appeal with frustration;
- mixed intent;
- explicit human request;
- multi-turn memory and repeated-data avoidance;
- privacy-consent/landing entry behavior;
- transfer when the owner is available and unavailable.

For each case record prompt, expected behavior, observed behavior, sources used, transfer status, verdict and follow-up.
