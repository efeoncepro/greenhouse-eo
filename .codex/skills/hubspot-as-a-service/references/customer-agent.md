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

## Deployment through workflows and rule-based bots

HubSpot's `Deployment > Workflows and bots` surface is a **selective conversation-assignment layer**. It controls when a conversation is handed to the Customer Agent; it does not add knowledge, grant an external action or execute an arbitrary business workflow on the visitor's behalf.

- A workflow evaluates explicit CRM, conversation or ticket criteria and uses `Assign to Customer Agent`.
- A rule-based chatbot runs a deterministic pre-flow—questions, branches, property capture, ticket creation or meeting routing—and uses `Send to Customer Agent` when its path should continue with the agent.
- Channel deployment is the separate option for sending all incoming conversations from a connected channel to the Customer Agent. Prefer workflows/bots when assignment must vary by client tier, issue type, intent or another governed criterion.
- Customer Agent **actions** are a different layer: they call approved apps or APIs to retrieve data or perform a task.
- A workflow action that runs an agent is also different: it invokes an eligible agent managed through Agent
  Hub/Agent Builder as an automation step and can expose output to later actions or branches. Verify the action's
  current name, beta state and portal eligibility before designing around it.

Before activation, document a routing matrix with entry source, positive criteria, exclusions, required captured context, Customer Agent path, human fallback, unavailable-hours behavior, owner, credit implication and expected resolution. Require approval for workflow/chatflow activation, then test at least one positive assignment, one negative/excluded path, one human fallback and one unavailable path. A saved or enabled definition is not proof that the conversation reached the intended owner.

Official references:

- [Deploy the Customer Agent to workflows and rule-based chatbots](https://knowledge.hubspot.com/customer-agent/deploy-the-customer-agent-to-workflows-and-rule-based-chatbots)
- [Create a rule-based chatbot](https://knowledge.hubspot.com/chatflows/create-a-bot)
- [Run agents using workflows](https://knowledge.hubspot.com/workflows/run-agents-using-workflows)
- [Set up actions for the Customer Agent](https://knowledge.hubspot.com/customer-agent/set-up-actions-for-the-customer-agent)

## Capability discovery and maturity

Inventory the full Customer Agent surface before assuming the engagement is limited to knowledge plus chat. Record every capability with one of these evidence states: `vendor-documented`, `portal-eligible`, `configured/draft`, `published`, or `runtime-verified`. A beta, a visible menu item, a saved definition and an executed customer outcome are different facts.

| Capability | What it enables | Mandatory boundary |
|---|---|---|
| Reply recommendations | Draft source-backed replies in Help Desk for a human to edit, send or dismiss; no live channel deployment or credits are required by the documented feature | Verify portal/account access and seat behavior; do not describe a suggestion as an autonomous response |
| CRM permissions | Read or update selected Contact properties during a conversation | Current documented limit is Contact only and at most 10 properties; use match-email or verify-email protection and approve view/edit independently |
| External actions | Call approved external apps through `GET` or `POST`, collect inputs and use allowlisted response fields | Design auth, identity verification, tenant scope, timeout, idempotency, audit, response filtering and failure handoff before publication; sensitive account changes should use secure links/instructions |
| Lead qualification | Ask qualification questions, set Customer Agent Lead Status and route to a meeting or lifecycle update | Beta; it changes commercial ownership and CRM writes, so reconcile it with the human qualification model before opt-in or publication |
| Multichannel deployment | Serve live chat, email, forms, WhatsApp, Facebook and, where eligible, calling/custom channels | Calling and custom-channel surfaces may be beta; prove entitlement, connection, working hours, fallback and channel-specific QA |
| Staged coverage | Limit by working hours, conversation percentage, and—on supported email deployment—include/exclude contact segments | Start with a reversible cohort; never infer that `100% configured` means the agent is active or effective |
| Channel behavior | Control email collection, inactivity, email sender/all reply behavior, signatures and ignore lists | Prevent loops, internal/system replies and sensitive-domain automation; verify live settings instead of relying on DOM ambiguity |
| Advanced handoff | Choose live, asynchronous or no handoff and route by user/team or ticket/conversation workflow | Validate availability, unassigned behavior, messages and both positive/negative routes; native transfer may pre-empt conversational instructions |
| Contact-aware testing | Preview as a CRM Contact or segment, test email/live chat, actions and attachments up to the documented size, and inspect Testing Insights | Preview is not runtime; preserve the test identity, inputs, triggers, sources and result |
| Performance and coaching | Track resolution, deflection, handoff, feedback, channel load, knowledge gaps, coaching opportunities and source usage | Deflection is not resolution; resolution can have a 72-hour evaluation lag. Declare metric definition, period and denominator |
| URL/page context | Sync governed HubSpot/public content or bounded URL paths and generate page-relevant suggested questions | Keep provenance and exclusions; do not introduce contradictory public content into a managed Markdown source pack |

### CRM data and action safety

Use native Contact-property permissions for bounded personalization or capture. Do not imply that this grants direct access to Company, Deal, Ticket, Service, invoice or external operational systems. When a need crosses that boundary, use a separately designed external action or human handoff.

For every proposed action, document:

| Contract | Required evidence |
|---|---|
| Customer intent and triggers | Natural-language variants plus exclusions that must not invoke it |
| Inputs | Type, validation, source, sensitivity and whether the agent may ask for them |
| Identity | None, email match or verified email, with justification |
| Endpoint | Owner, tenant/portal binding, method, authentication and timeout |
| Effect | Read-only or write; idempotency key and rollback/compensation for writes |
| Response | Explicit allowlist, redactions and customer-safe failure copy |
| Observability | Correlation ID, audit event, success/failure metrics and human fallback |
| QA | Positive, negative, unauthorized, ambiguous, timeout, duplicate and downstream-failure paths |

### Measurement semantics

- A **resolution** is not equivalent to every conversation without a human. HubSpot evaluates documented response/action resolutions after its product-defined delay; lead-qualification resolutions can be set separately.
- A **deflection** may include a visitor leaving without a human even when the need was not solved. Never use deflection alone as customer success.
- Track resolution, necessary handoff, premature handoff, unresolved/abandoned, negative feedback, repeated questions, action success, source accuracy and credit cost separately.
- Use knowledge gaps and coaching opportunities as an operating queue: inspect the conversation, choose Knowledge, Action, Handoff or Experience as the corrective layer, QA the change, publish with approval and measure again.

Official capability references:

- [Set up and test the Customer Agent](https://knowledge.hubspot.com/customer-agent/set-up-the-customer-agent)
- [Allow the Customer Agent to access and update CRM data](https://knowledge.hubspot.com/customer-agent/allow-the-customer-agent-to-access-and-update-crm-data)
- [Set up Customer Agent actions to qualify leads](https://knowledge.hubspot.com/customer-agent/set-up-customer-agent-actions-to-qualify-leads)
- [Deploy the Customer Agent to channels](https://knowledge.hubspot.com/customer-agent/deploy-the-customer-agent-to-channels)
- [Manage channel settings](https://knowledge.hubspot.com/customer-agent/manage-the-customer-agents-channel-settings)
- [Use reply recommendations in Help Desk](https://knowledge.hubspot.com/help-desk/use-reply-recommendations-in-help-desk)
- [Analyze Customer Agent performance](https://knowledge.hubspot.com/customer-agent/analyze-your-customer-agents-performance)

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

Treat the handoff trigger and the downstream assignment as separate contracts:

- Customer Agent system rules or approved custom guidelines decide **when** the agent stops responding. A visitor request for a person is a trigger, not a destination.
- Direct routing is appropriate when every case has the same destination. When the destination varies by intent, segment or another governed condition, select a workflow in the handoff configuration.
- Help Desk requires a ticket-based workflow; Inbox requires a conversation-based workflow. Do not substitute one object for the other.
- Workflow or manual assignment alone is not proof of a qualifying Customer Agent handoff for resolution analytics. Preserve the visitor/guideline trigger and measure trigger, assignment and reassignment separately.

For an ordered primary-to-backup route, document it as a composed workflow pattern rather than a native HubSpot
"backup" mode: clear the Customer Agent owner, assign the primary only when available, then assign the backup only
when available with overwrite disabled. If neither is available, the record remains unassigned. Keep a live chat
open when a person is expected to continue there, and monitor the unassigned queue.

`Live handoff` preserves the same open chat and its prior context. After the first human takes ownership, a second
human continues in that same thread through manual owner reassignment in Help Desk or Inbox; Customer Agent no
longer governs that human-to-human transfer. Do not end the chat when continuity is required: an ended chat cannot
be reopened, although its ticket can remain open for offline follow-up.

A free-text request such as “quiero hablar con Pablo” is an explicit request for a person, but it is not evidence
that HubSpot resolved the name to the correct user. Promise a named recipient only after an explicit governed
condition or manual reassignment proves the effective owner. Ambiguous, unavailable or ineligible names follow the
documented fallback.

HubSpot may trigger a native transfer before a trained short answer. When observed:

1. verify the published transfer rules;
2. improve online and unavailable transfer messages;
3. retest the exact phrase;
4. document the native limitation instead of claiming the short answer controls it.

Official references:

- [Set up and customize Customer Agent handoff](https://knowledge.hubspot.com/customer-agent/set-up-and-customize-the-customer-agents-handoff-process)
- [Assign tickets using workflows](https://knowledge.hubspot.com/workflows/assign-tickets-using-workflows)
- [Route tickets in Help Desk](https://knowledge.hubspot.com/help-desk/route-tickets-in-help-desk)
- [Manage tickets and chats in Help Desk](https://knowledge.hubspot.com/help-desk/manage-tickets-in-help-desk)
- [Understand Customer Agent resolution](https://knowledge.hubspot.com/customer-agent/understand-the-customer-agent)

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
- primary available, primary unavailable with backup, and both unavailable with an open unassigned chat;
- a valid, ambiguous and ineligible named-person request;
- first-human to second-human reassignment in the same open thread and an actual human reply;
- the irreversible ended-chat boundary;
- analytics that distinguish visitor-triggered handoff, workflow assignment and manual reassignment.

For each case record prompt, expected behavior, observed behavior, sources used, transfer status, verdict and follow-up.
