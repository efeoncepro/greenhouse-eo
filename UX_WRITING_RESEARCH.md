# UX Writing, Microcopy & Data Storytelling — World-Class Best Practices

> Comprehensive research compiled from Google Material Design, Apple HIG, Shopify Polaris, Atlassian Design System, IBM Carbon, Nielsen Norman Group, Smashing Magazine, UX Content Collective, and other industry-leading sources. Oriented toward B2B SaaS dashboard products with Spanish-language considerations.

---

## Table of Contents

1. [UX Writing Fundamentals](#1-ux-writing-fundamentals)
2. [Microcopy Patterns](#2-microcopy-patterns)
3. [Error Message Design](#3-error-message-design)
4. [Empty State Copy](#4-empty-state-copy)
5. [Form UX Writing](#5-form-ux-writing)
6. [Navigation and Wayfinding](#6-navigation-and-wayfinding)
7. [Notification and Feedback Copy](#7-notification-and-feedback-copy)
8. [Inclusive Language](#8-inclusive-language)
9. [Spanish-Language UX Writing](#9-spanish-language-ux-writing)
10. [Data Storytelling Principles](#10-data-storytelling-principles)
11. [KPI Presentation](#11-kpi-presentation)
12. [Chart Titles and Annotations](#12-chart-titles-and-annotations)
13. [Dashboard Narrative Flow](#13-dashboard-narrative-flow)
14. [Contextualizing Metrics](#14-contextualizing-metrics)
15. [Alert and Threshold Copy](#15-alert-and-threshold-copy)
16. [Data Table UX Writing](#16-data-table-ux-writing)
17. [Content Style Guides from Top Companies](#17-content-style-guides-from-top-companies)
18. [UX Writing Tools and Frameworks](#18-ux-writing-tools-and-frameworks)
19. [Measuring UX Writing Effectiveness](#19-measuring-ux-writing-effectiveness)

---

## 1. UX Writing Fundamentals

### Core Principles

**Clarity over cleverness.** Every piece of UI text exists to help the user accomplish a goal. If the user has to re-read something, the copy has failed. Prioritize understanding above personality, humor, or brand voice.

**User-first language.** Write from the user's perspective, not the system's. Describe outcomes the user cares about, not internal processes.

**Concise but complete.** Make text as short as it can be, but as long as it needs to be (Apple HIG). Every word must earn its place.

**Actionable.** Text should tell users what they can do, not just what happened. Lead with verbs. Front-load the most important information.

**Consistent.** Use the same term for the same concept everywhere. Consistency builds familiarity; familiarity builds trust.

### Voice and Tone Framework

**Voice** is the brand's consistent personality. It does not change. **Tone** adapts to the context and the user's emotional state.

| Dimension (NN/g) | Spectrum | When to use each end |
|---|---|---|
| Formality | Casual ←→ Formal | Casual for onboarding, formal for legal/billing |
| Humor | Funny ←→ Serious | Serious for errors/data loss, light for empty states |
| Respectfulness | Irreverent ←→ Respectful | Always lean respectful in B2B |
| Enthusiasm | Matter-of-fact ←→ Enthusiastic | Enthusiastic for success, matter-of-fact for routine |

**Voice chart template ("We are / We are not"):**

| We are | We are not |
|---|---|
| Helpful — we guide, not lecture | Condescending — we never assume ignorance |
| Clear — we use plain language | Verbose — we never use three words when one works |
| Professional — we respect the user's time | Stiff — we are not a legal document |
| Confident — we state things directly | Arrogant — we never dismiss the user's concern |
| Warm — we acknowledge the human behind the screen | Cutesy — we never force jokes into serious moments |

### Content Design Principles

1. **Write for flows, not screens.** Consider the entire user journey, not isolated UI elements.
2. **Front-load key information.** The most important word should come first in any label or sentence.
3. **Use active voice.** The subject performs the action. "You saved the report" not "The report was saved by you."
4. **Use second person.** Address the user as "you." Use "I/my" only when the user is making a declaration (e.g., "I agree to the terms").
5. **Sentence-case capitalization.** Capitalize only the first word and proper nouns. This applies to titles, headings, labels, buttons, and menu items (Google M3, IBM Carbon).
6. **Use numerals for numbers.** Write "3 projects" not "three projects" (Google Material Design).

### Good vs. Bad Examples

| Context | Bad | Good |
|---|---|---|
| Button | "Submit" | "Save changes" |
| Status | "Process completed" | "Your report is ready" |
| Heading | "System Configuration Parameters" | "Settings" |
| Description | "This functionality enables users to..." | "You can..." |
| Error | "Error 403" | "You don't have access to this page" |

**Spanish equivalents:**

| Context | Mal | Bien |
|---|---|---|
| Button | "Enviar" (generic) | "Guardar cambios" |
| Status | "Proceso completado" | "Tu reporte esta listo" |
| Heading | "Parametros de configuracion del sistema" | "Configuracion" |
| Description | "Esta funcionalidad permite a los usuarios..." | "Puedes..." |
| Error | "Error 403" | "No tienes acceso a esta pagina" |

### B2B SaaS Dashboard Application

- Use domain-specific terminology your users already know (e.g., "Spaces" not "Clients" in Greenhouse).
- Keep dashboard labels extremely concise — screen real estate is precious.
- Avoid marketing language in the product UI. Save persuasion for landing pages.
- Technical users appreciate precision; non-technical users need plain language. Know your audience.

### Anti-patterns

- **Jargon dumping.** Using internal engineering terms in user-facing copy ("null reference," "payload error").
- **Robot voice.** "The system has detected..." — write as a human speaking to a human.
- **Inconsistent naming.** Calling the same thing "project," "workspace," and "space" in different places.
- **Wall of text.** Long paragraphs in UI. If it needs that much explanation, the design needs work.
- **False enthusiasm.** "Awesome! Great job!" for mundane actions. Reserve celebration for genuine achievements.
- **Passive aggression.** "As previously mentioned..." or "Please note that you must..."

---

## 2. Microcopy Patterns

### Button Labels

**Rule: Verb + Object.** Tell users exactly what happens when they click.

| Anti-pattern | Better | Best |
|---|---|---|
| "OK" | "Save" | "Save report" |
| "Submit" | "Send" | "Send invitation" |
| "Yes" | "Confirm" | "Delete project" |
| "Next" | "Continue" | "Continue to payment" |
| "Click here" | "Learn more" | "View pricing details" |

**Spanish button labels:**

| Anti-pattern | Better | Best |
|---|---|---|
| "Aceptar" | "Guardar" | "Guardar reporte" |
| "Enviar" | "Enviar" | "Enviar invitacion" |
| "Si" | "Confirmar" | "Eliminar proyecto" |
| "Siguiente" | "Continuar" | "Continuar al pago" |

**Rules for B2B SaaS:**
- Primary action buttons use specific verbs: "Create space," "Export CSV," "Apply filters."
- Destructive actions state what will be destroyed: "Delete space" not just "Delete."
- Cancel buttons say "Cancel" — do not rename them creatively.
- Paired buttons should be asymmetric in visual weight: primary action is filled, secondary is outlined.

### Empty States

See [Section 4](#4-empty-state-copy) for full coverage.

### Error Messages

See [Section 3](#3-error-message-design) for full coverage.

### Success Messages

**Structure: Confirm action + state result + (optional) next step.**

| Bad | Good |
|---|---|
| "Success!" | "Space created. You can now add team members." |
| "Done." | "Changes saved." |
| "Operation completed successfully." | "Report exported. Check your downloads folder." |

**Spanish:**

| Mal | Bien |
|---|---|
| "Exito!" | "Espacio creado. Ya puedes agregar miembros del equipo." |
| "Listo." | "Cambios guardados." |
| "Operacion completada exitosamente." | "Reporte exportado. Revisa tu carpeta de descargas." |

**Rules:**
- Match celebration intensity to action significance. Saving settings? Subtle confirmation. Completing onboarding? Celebrate.
- Always confirm WHAT was done, not just that something happened.
- Include a next step when the workflow continues.

### Loading States

**Structure: Active verb describing what is happening.**

| Bad | Good |
|---|---|
| "Loading..." | "Loading your dashboard..." |
| "Please wait" | "Preparing your report..." |
| "Processing" | "Calculating KPIs..." |
| (spinner with no text) | "Syncing latest data..." |

**Spanish:**

| Mal | Bien |
|---|---|
| "Cargando..." | "Cargando tu dashboard..." |
| "Por favor espere" | "Preparando tu reporte..." |
| "Procesando" | "Calculando KPIs..." |

**Rules:**
- Use progressive tense (verb + "-ing" / "-ando/-endo") to convey active work.
- Be specific when possible: "Fetching 230 records..." is better than "Loading..."
- For long operations (>5s), show progress percentage or step count.
- Never leave users staring at a spinner with no text.

### Tooltips

**Structure: One sentence. Answer "What is this?" or "Why should I care?"**

| Bad | Good |
|---|---|
| "Click here for more info" | "The percentage of budget used this cycle" |
| "This field is required" | "We need this to calculate your team's capacity" |
| "Hover for details" | (should not need a tooltip about a tooltip) |

**Rules:**
- Tooltips supplement, not replace. If the label is clear, no tooltip needed.
- Keep under 150 characters.
- Don't repeat the label text.
- Use tooltips for: abbreviations, calculated values, unfamiliar concepts.
- Don't use tooltips for: required field indicators, obvious icons, critical instructions (those should be visible).

### Placeholder Text

**THE ANTI-PATTERN:** Using placeholders as labels. Placeholders disappear when the user starts typing, removing the context they need. This is especially harmful for users with cognitive disabilities, short-term memory issues, or low vision (NN/g, Deque, W3C).

**Rules:**
- NEVER use placeholder text as the only label.
- Placeholders should show FORMAT examples only: "e.g., name@company.com" or "DD/MM/YYYY."
- Keep placeholder text visually distinct (lighter color) but still meeting WCAG 4.5:1 contrast.
- If using helper text, place it below the field where it remains visible.

### Confirmation Dialogs

**Structure: [Title as question] + [Explain consequence] + [Specific button labels]**

| Bad | Good |
|---|---|
| Title: "Are you sure?" / Buttons: "Yes / No" | Title: "Delete this space?" / Buttons: "Delete space / Cancel" |
| Title: "Confirm action" / Buttons: "OK / Cancel" | Title: "Discard unsaved changes?" / Buttons: "Discard / Keep editing" |
| Title: "Warning!" / Buttons: "Proceed / Go back" | Title: "Remove 3 team members?" / Body: "They will lose access to all projects." / Buttons: "Remove members / Cancel" |

**Spanish:**

| Mal | Bien |
|---|---|
| "Esta seguro?" / "Si / No" | "Eliminar este espacio?" / "Eliminar espacio / Cancelar" |
| "Confirmar accion" / "Aceptar / Cancelar" | "Descartar cambios sin guardar?" / "Descartar / Seguir editando" |

**Rules:**
- Title should be the action as a question: "Delete project?" not "Warning."
- Body should explain the consequence: "This action cannot be undone. All data will be permanently removed."
- Button labels must be specific verbs matching the action, never "Yes/No."
- Destructive button gets a danger color (red). Non-destructive is default.
- Use confirmation dialogs sparingly. If everything requires confirmation, users develop "dialog blindness."
- Prefer undo over confirmation when possible — it reduces friction while maintaining safety.

### Onboarding Flows

**Structure: Welcome → Value proposition → First action**

| Step | Bad | Good |
|---|---|---|
| Welcome | "Welcome to the app!" | "Welcome to Greenhouse. Let's set up your first space." |
| Value | "This app has many features." | "Track your team's performance and project health in one place." |
| First action | "Click here to start" | "Create your first space" |

**Spanish:**

| Step | Mal | Bien |
|---|---|---|
| Welcome | "Bienvenido a la app!" | "Bienvenido a Greenhouse. Vamos a configurar tu primer espacio." |
| Value | "Esta app tiene muchas funciones." | "Monitorea el desempeno de tu equipo y la salud de tus proyectos en un solo lugar." |
| Action | "Haz clic aqui para comenzar" | "Crear tu primer espacio" |

**Rules:**
- 90% of onboarding flows start with a welcome message — make yours count.
- Set expectations: tell users how many steps and how long it takes.
- Show value before asking for effort.
- One task per screen. Progressive disclosure prevents overwhelm.
- Allow skipping. Power users should not be trapped.
- Use the product's actual vocabulary, not generic terms.

---

## 3. Error Message Design

### The NN/g Error Message Scoring Rubric

Nielsen Norman Group scores error messages across 3 dimensions with 12 guidelines, rated 1-4 (Poor to Excellent), producing a letter grade A through D.

**Three dimensions:**

1. **Visibility** — Can the user see and notice the error?
2. **Communication** — Does it explain what happened and how to fix it?
3. **Efficiency** — Can the user resolve it quickly without extra steps?

### Error Message Structure

**Formula: [What happened] + [Why] + [How to fix it]**

| Bad | Good |
|---|---|
| "Invalid input" | "Enter a valid email address (e.g., name@company.com)" |
| "Error 500" | "Something went wrong on our end. Try again in a few minutes." |
| "Authentication failed" | "Incorrect password. Try again or reset your password." |
| "Request failed" | "We couldn't save your changes. Check your connection and try again." |

**Spanish:**

| Mal | Bien |
|---|---|
| "Entrada invalida" | "Ingresa un correo valido (ej. nombre@empresa.com)" |
| "Error 500" | "Algo salio mal de nuestro lado. Intenta de nuevo en unos minutos." |
| "Autenticacion fallida" | "Contrasena incorrecta. Intenta de nuevo o restablece tu contrasena." |
| "Solicitud fallida" | "No pudimos guardar tus cambios. Verifica tu conexion e intenta de nuevo." |

### Constructive vs. Destructive Language

| Destructive (avoid) | Constructive (use) |
|---|---|
| "You failed to..." | "Please enter..." |
| "Illegal character" | "Names can only include letters and numbers" |
| "Wrong password" | "That password doesn't match our records" |
| "You didn't fill in..." | "This field is required" |
| "Bad request" | "We couldn't process that. Try again." |
| "Access denied" | "You don't have permission to view this page. Contact your admin." |

### Error Hierarchy

| Type | When to use | Duration | Example |
|---|---|---|---|
| **Inline validation** | Field-level errors in forms | Persistent until fixed | Red text below input: "Email format: name@example.com" |
| **Toast notification** | Non-blocking system errors | Auto-dismiss 5-8s | "Couldn't refresh data. Retrying..." |
| **Banner (page-level)** | Errors affecting the whole page | Persistent, dismissible | "Your subscription expired. Renew to continue." |
| **Modal dialog** | Errors requiring immediate action | Until user acts | "Session expired. Log in again to continue." |
| **Empty state** | No data due to error | Persistent until resolved | "We couldn't load your projects. Try refreshing." |

### Rules for B2B SaaS Dashboards

- Never show raw error codes to end users. Log them; show human language.
- For API errors, distinguish between "our fault" (retry suggestion) and "your fault" (correction guidance).
- For permission errors, tell users WHO can help: "Contact your account admin."
- For data errors, clarify what data is affected: "KPIs from the last 24 hours may be inaccurate."
- Always provide an escape hatch: a button, a link, or clear instructions for next steps.

### Anti-patterns

- **Blame language.** "You entered the wrong..." — the system should take responsibility for helping.
- **Technical jargon.** "NULL reference exception in module X" — meaningless to users.
- **Vague errors.** "An error occurred" — tells the user nothing actionable.
- **Error codes only.** "Error 1042" — requires the user to search for meaning.
- **Alarm without action.** "CRITICAL ERROR!" — urgency without guidance creates anxiety.
- **Stacked errors.** Showing 15 validation errors at once. Show them inline, one per field.
- **Non-dismissible errors.** Errors that block the UI with no way to proceed.

---

## 4. Empty State Copy

### Three Types of Empty States

| Type | User mindset | Copy goal | Tone |
|---|---|---|---|
| **First-use** | Curious, exploring | Motivate first action, show value | Encouraging, warm |
| **No results** | Searching, frustrated | Explain why, suggest alternatives | Helpful, direct |
| **Error state** | Confused, blocked | Explain problem, offer recovery | Calm, reassuring |

### First-Use Empty States

**Structure: [Heading: what belongs here] + [Body: why it matters] + [CTA: first action]**

| Bad | Good |
|---|---|
| "No data to display" | Heading: "No spaces yet" / Body: "Spaces let you organize projects by client and track their KPIs." / CTA: "Create your first space" |
| "This section is empty" | Heading: "Your team is waiting" / Body: "Add team members to start tracking capacity and assignments." / CTA: "Add team member" |
| "Nothing here" | Heading: "No reports yet" / Body: "Reports help you see trends and share progress with stakeholders." / CTA: "Generate your first report" |

**Spanish:**

| Mal | Bien |
|---|---|
| "No hay datos para mostrar" | Heading: "Aun no tienes espacios" / Body: "Los espacios te permiten organizar proyectos por cliente y monitorear sus KPIs." / CTA: "Crear tu primer espacio" |
| "Esta seccion esta vacia" | Heading: "Tu equipo te espera" / Body: "Agrega miembros de equipo para empezar a rastrear capacidad y asignaciones." / CTA: "Agregar miembro" |

### No-Results Empty States

**Structure: [Acknowledge search] + [Suggest fix] + [Alternative action]**

| Bad | Good |
|---|---|
| "No results" | "No results for 'kiwi'. Check spelling or try different keywords." |
| "0 items found" | "No spaces match your filters. Try removing some filters or search by name." |
| "Empty" | "No activity in this period. Try selecting a wider date range." |

**Spanish:**

| Mal | Bien |
|---|---|
| "Sin resultados" | "No hay resultados para 'kiwi'. Revisa la ortografia o intenta con otras palabras." |
| "0 elementos encontrados" | "Ningun espacio coincide con tus filtros. Intenta quitar algunos filtros o busca por nombre." |

### Error Empty States

| Bad | Good |
|---|---|
| "Error loading data" | "We couldn't load your projects. Check your connection and try again." / CTA: "Retry" |
| "Something went wrong" | "This page didn't load correctly. If the problem persists, contact support." / CTA: "Refresh page" |

### Rules for B2B SaaS Dashboards

- First-use empty states are onboarding opportunities. Use them to teach.
- No-results states should always suggest how to broaden or adjust the search.
- Never leave a dashboard widget completely blank — show the empty state message inside the card.
- Use illustrations sparingly. A small, relevant icon adds warmth; a full-page cartoon can feel dismissive in a business context.
- The CTA should be a primary button that leads directly to the resolution action.

### Anti-patterns

- **Blank void.** Showing nothing at all — users think the page is broken.
- **Generic "No data."** Does not explain what data should be here or how to get it.
- **Overly playful.** A dancing mascot when a user's critical dashboard is empty feels tone-deaf.
- **CTA-less empty states.** Telling users what's missing without telling them how to fix it.
- **Blaming language.** "You haven't added anything yet" vs. "No items added yet."

---

## 5. Form UX Writing

### Labels

**Rules:**
- Place labels ABOVE the input field (not beside, not inside).
- Use short, noun-based labels: "Email address" not "Please enter your email address."
- Be specific: "Work email" is better than "Email" when you need a specific type.
- Don't end labels with colons — modern form design doesn't need them.
- Use sentence case: "First name" not "First Name."

| Bad label | Good label |
|---|---|
| "Enter your full legal name as it appears on your ID" | "Full name" |
| "E-Mail Address:" | "Email" |
| "Please select your preferred language" | "Language" |
| "USERNAME" | "Username" |

### Helper Text

**Rules:**
- Place helper text below the input field, always visible (not hidden behind icons).
- Use helper text for: format requirements, character limits, explanations of unfamiliar fields.
- Don't use helper text for obvious fields (Name, Email).
- Keep it under one line.

| Field | Helper text |
|---|---|
| Password | "8+ characters with a number and a symbol" |
| Slug | "Used in the URL. Only lowercase letters and hyphens." |
| Dedication % | "Percentage of full-time capacity assigned to this space" |
| API Key | "Find this in your integration settings" |

**Spanish:**

| Campo | Texto de ayuda |
|---|---|
| Contrasena | "8+ caracteres con un numero y un simbolo" |
| Slug | "Se usa en la URL. Solo letras minusculas y guiones." |
| Dedicacion % | "Porcentaje de capacidad a tiempo completo asignado a este espacio" |

### Validation Messages

**Rules:**
- Validate inline, in real-time, as the user moves to the next field (not all at submission).
- Place the message directly below the field, replacing or appearing below helper text.
- Use red color + error icon for errors; green + check for valid.
- Tell users HOW to fix it, not just WHAT is wrong.

| Bad | Good |
|---|---|
| "Invalid" | "Enter a number between 1 and 100" |
| "This field is required" | "Enter a project name to continue" |
| "Format error" | "Use the format DD/MM/YYYY" |
| "Too long" | "Maximum 50 characters (you have 63)" |

**Spanish:**

| Mal | Bien |
|---|---|
| "Invalido" | "Ingresa un numero entre 1 y 100" |
| "Este campo es requerido" | "Ingresa un nombre de proyecto para continuar" |
| "Error de formato" | "Usa el formato DD/MM/AAAA" |
| "Muy largo" | "Maximo 50 caracteres (tienes 63)" |

### Progressive Disclosure in Forms

- Break complex forms into steps or sections.
- Show only the fields relevant to the current selection.
- Use accordions or tabs for optional/advanced sections.
- Indicate progress: "Step 2 of 4" or a progress bar.

### Smart Defaults

- Pre-fill with the most common value (e.g., country based on locale).
- Pre-select the most popular option in dropdowns.
- Remember previous entries for returning users.
- Default date ranges to the current cycle/month.

### Anti-patterns

- **Placeholder-as-label.** Disappears on input; catastrophic for accessibility.
- **All-at-once validation.** Showing 10 errors after submission forces users to scroll and hunt.
- **Required asterisks with no legend.** Users may not know what `*` means.
- **Redundant fields.** "Confirm email" when copy-paste exists.
- **Unnecessary required fields.** Every required field is a friction point. Question whether you truly need it.

---

## 6. Navigation and Wayfinding

### Menu Labels

**Rules:**
- Use familiar, user-centered terms — not internal jargon or clever wordplay.
- Front-load keywords: "Project settings" not "Settings for projects."
- Keep labels to 1-2 words when possible.
- Use nouns for sections, verbs for actions.
- Test labels with card sorting or tree testing.

| Bad | Good |
|---|---|
| "Cockpit" | "Dashboard" |
| "Resource Allocation Matrix" | "Team capacity" |
| "CRM Module" | "Clients" |
| "Administrative Functions" | "Settings" |

**Spanish:**

| Mal | Bien |
|---|---|
| "Cockpit" | "Pulse" (brand term) |
| "Matriz de Asignacion de Recursos" | "Capacidad del equipo" |
| "Modulo CRM" | "Clientes" |
| "Funciones Administrativas" | "Configuracion" |

### Breadcrumbs

**Rules:**
- Show the full hierarchy path: Home > Section > Subsection > Current Page.
- The current page should be visible but NOT clickable.
- Use `>` or `/` as separators.
- Truncate long labels on mobile.
- Place at the top of the page, below the header.

### Tab Labels

**Rules:**
- Use short, scannable nouns: "Overview," "Members," "Settings."
- Limit to 5-7 tabs maximum.
- The first tab should be the most commonly used.
- Current tab must be visually distinct (active state).
- Don't use icons without text labels.

| Bad tabs | Good tabs |
|---|---|
| "General Info / Other Info / More" | "Overview / Members / Settings" |
| "Tab 1 / Tab 2 / Tab 3" | "Capacity / Projects / Finance" |

### Page Titles

**Rules:**
- Match the menu label. If the menu says "Team capacity," the page title should say "Team capacity."
- Add context when viewing a specific item: "Acme Corp — Overview."
- Use sentence case.
- Make titles unique across the app for bookmarking and browser tabs.

### Section Headers

**Rules:**
- Describe the content below, not the container type: "Recent activity" not "Activity section."
- Use parallel structure across sections (all nouns or all gerunds).
- Include a count when showing lists: "Team members (12)."

### Anti-patterns

- **Clever names.** "Mission Control" instead of "Dashboard" — cool for 5 minutes, confusing for 5 months.
- **Inconsistent hierarchy.** Breadcrumbs showing a different path than the sidebar highlight.
- **No current location indicator.** Users should always know where they are.
- **Ambiguous labels.** "Manage" — manage what? Be specific.
- **Hidden navigation.** Critical sections buried in menus within menus.

---

## 7. Notification and Feedback Copy

### Toast Notifications

**Structure: [Icon] + [What happened] + (optional) [Action link]**

| Type | Duration | Example |
|---|---|---|
| Success | Auto-dismiss 3-5s | "Changes saved" |
| Info | Auto-dismiss 5-8s | "New data available. Refresh to see updates." |
| Warning | Persistent until dismissed | "Your subscription expires in 3 days. Renew now." |
| Error | Persistent until dismissed | "Couldn't save changes. Try again." |

**Spanish:**

| Tipo | Ejemplo |
|---|---|
| Success | "Cambios guardados" |
| Info | "Nuevos datos disponibles. Actualiza para ver los cambios." |
| Warning | "Tu suscripcion vence en 3 dias. Renueva ahora." |
| Error | "No se pudieron guardar los cambios. Intenta de nuevo." |

**Rules:**
- Keep under 3 lines of text.
- Users can scan and understand within 3-8 seconds.
- Success toasts auto-dismiss; error toasts persist.
- Don't auto-dismiss if the toast contains an action button.
- Use the traffic-light color system: green=success, yellow=warning, red=error, blue=info.
- Position consistently (top-right or bottom-right).
- Stack multiple toasts vertically, newest on top.
- Never use toasts for information users need to reference later.

### Alerts and Banners

| Severity | Tone | Example |
|---|---|---|
| Info | Neutral, informative | "System maintenance scheduled for Sunday 2am-4am UTC." |
| Warning | Cautious, helpful | "You've used 85% of your monthly API calls." |
| Error | Direct, action-oriented | "Billing failed. Update your payment method to continue." |
| Success | Confirmative, brief | "All team members have been synced successfully." |

### Status Updates and Progress Indicators

| Bad | Good |
|---|---|
| "Working..." | "Importing 45 of 230 records..." |
| "Almost done" | "Generating report (this usually takes 30 seconds)..." |
| "Processing" | "Step 2 of 3: Validating data..." |

**Rules:**
- Show quantifiable progress when possible (percentage, x of y).
- Set time expectations for long operations.
- Use step-based progress for multi-phase operations.
- Always provide a cancel option for long-running tasks.

### Anti-patterns

- **Toast storms.** Showing multiple toasts for each sub-action of a batch operation. Show one summary toast.
- **Eternal toasts.** Non-dismissible toasts blocking content.
- **Notification overload.** Every minor event triggering a notification. Reserve for actionable items.
- **Vague status.** "Processing..." with no indication of progress or duration.
- **Missing feedback.** User clicks a button and nothing visibly happens for 2 seconds.

---

## 8. Inclusive Language

### Gender-Neutral Writing

**Rules:**
- Use "they/them" as singular pronouns in English.
- Use "you" (second person) whenever possible — it's naturally gender-neutral.
- Replace gendered terms with neutral equivalents.

| Gendered (avoid) | Neutral (use) |
|---|---|
| "Manpower" | "Workforce" / "Team capacity" |
| "Chairman" | "Chairperson" / "Chair" |
| "He or she" | "They" |
| "Manned" | "Staffed" / "Operated" |
| "Guys" (addressing mixed group) | "Team" / "Everyone" / "Folks" |

### Culturally Sensitive Writing

- Avoid idioms that don't translate: "knock it out of the park," "hit the ground running."
- Don't reference holidays, sports, or cultural events as universal.
- Use ISO date formats (YYYY-MM-DD) or clearly labeled local formats to avoid ambiguity (MM/DD vs DD/MM).
- Avoid color-only semantics for cultural reasons (red doesn't mean "bad" in all cultures). Always pair color with icon + text.

### Reading Level

- Target US Grade 7 reading level (Shopify Polaris).
- IBM Carbon: keep sentences under 25 words.
- Use common words. Replace "utilize" with "use," "facilitate" with "help," "commence" with "start."
- One idea per sentence.

### Avoiding Jargon

| Jargon (avoid) | Plain language (use) |
|---|---|
| "Leverage" | "Use" |
| "Synergize" | "Work together" |
| "Optimize" | "Improve" |
| "Bandwidth" (for people) | "Capacity" / "Availability" |
| "Deep dive" | "Detailed look" |
| "Robust" | "Strong" / "Reliable" |
| "Scalable" | "Grows with you" |

### Internationalization Considerations

- Design UI with 30-50% text expansion room (English to Spanish typically expands 30%).
- Avoid embedding text in images.
- Don't concatenate strings programmatically — sentence structure varies across languages.
- Support RTL layouts if targeting Arabic/Hebrew markets.
- Test with pseudolocalization to find truncation issues early.
- Date, time, number, and currency formats must be locale-aware.

### Anti-patterns

- **Assuming gender.** "Welcome back, sir" — forms shouldn't collect gender unless necessary.
- **Cultural myopia.** "Happy Thanksgiving!" as a global notification.
- **Ableist language.** "Crazy simple" / "Blind spot" / "Lame feature."
- **Unlocalized concatenation.** `"You have " + count + " new messages"` — breaks in languages with different word order.

---

## 9. Spanish-Language UX Writing

### Tu vs. Usted: The Fundamental Decision

For B2B SaaS platforms targeting Latin America:

| Register | When to use | Implication |
|---|---|---|
| **Tu (informal)** | Modern SaaS, startup culture, creative industries | Approachable, friendly, peer-to-peer |
| **Usted (formal)** | Banking, government, legal, enterprise targeting older users | Respectful, professional, traditional |
| **Vos** | Region-specific (Argentina, parts of Central America) | Casual; avoid unless explicitly targeting these regions |

**Recommendation for Greenhouse:** Use **tu** consistently. Modern B2B SaaS products in Latin America overwhelmingly use tuteo. It matches the collaborative, team-oriented tone of the product.

### Latin American Spanish vs. European Spanish

| European Spanish | Latin American Spanish | Notes |
|---|---|---|
| "Ordenador" | "Computadora" | Use Latin American |
| "Aplicacion movil" | "App" / "Aplicacion" | "App" is universally understood |
| "Vosotros teneis" | "Ustedes tienen" | Never use vosotros for LatAm |
| "Coger" | "Tomar" / "Agarrar" | "Coger" is vulgar in some LatAm countries |
| "Vale" | "OK" / "De acuerdo" | "Vale" is Spain-only |
| "Mola" | (no equivalent) | Spain slang, avoid entirely |

### Neutral Spanish for Pan-LatAm Audiences

When targeting multiple Latin American countries:
- Use "tu" (not "vos").
- Avoid country-specific slang.
- Use "computadora" (not "ordenador"), "celular" (not "movil").
- Use "correo electronico" (not "e-mail" everywhere, but "email" is widely accepted in tech).
- "Codigo postal" is universal, but some contexts prefer "ZIP" — test with your audience.
- Keep formal/informal consistent throughout the ENTIRE product.

### Common Translation Pitfalls

| English source | Bad Spanish | Good Spanish | Why |
|---|---|---|---|
| "Sign up" | "Registrarse" (reflexive, awkward as button) | "Crear cuenta" | More natural as CTA |
| "Dashboard" | "Tablero de mandos" | "Dashboard" / "Pulse" (brand term) | Anglicisms are accepted in tech |
| "Settings" | "Ajustes" (implies tweaking) | "Configuracion" | More comprehensive |
| "Save" | "Salvar" (means "rescue") | "Guardar" | Common translation error |
| "Delete" | "Borrar" (can mean "erase") | "Eliminar" | Stronger, clearer |
| "Submit" | "Someter" (means "subjugate") | "Enviar" | Critical translation error |
| "Log in" | "Acceder" (vague) | "Iniciar sesion" | Established convention |
| "Overview" | "Vista general" (long) | "Resumen" / "Vision general" | Context-dependent |
| "Upgrade" | "Mejorar" (vague) | "Actualizar plan" | Specify what's upgrading |

### Word Expansion Management

English to Spanish typically expands 30%. Strategies:
- Design UI with flexible layouts that accommodate longer text.
- Use shorter synonyms when space is limited: "Config." instead of "Configuracion."
- Abbreviate carefully — only universally understood abbreviations.
- Test all buttons, tabs, and labels at maximum Spanish length.

### Gender-Inclusive Spanish

Traditional Spanish has grammatical gender. Best practices:
- Use "personas" instead of "usuarios/usuarias."
- Use "equipo" instead of "los miembros / las miembras."
- Use "quien" instead of "el que / la que."
- Avoid the -e ending (e.g., "todes") and @ symbol ("tod@s") in professional software — they're not universally accepted and can confuse screen readers.
- Rephrase to avoid gendered nouns: "Responsable del proyecto" instead of "Director/Directora de proyecto."
- Use collective nouns: "El equipo de diseno" instead of "Los disenadores."

### Spanish Microcopy Patterns for B2B SaaS

| Component | English | Spanish |
|---|---|---|
| Primary button | "Create space" | "Crear espacio" |
| Secondary button | "Cancel" | "Cancelar" |
| Destructive button | "Delete project" | "Eliminar proyecto" |
| Empty state heading | "No projects yet" | "Aun no tienes proyectos" |
| Empty state body | "Create your first project to get started." | "Crea tu primer proyecto para comenzar." |
| Empty state CTA | "Create project" | "Crear proyecto" |
| Success toast | "Changes saved" | "Cambios guardados" |
| Error toast | "Couldn't save changes" | "No se pudieron guardar los cambios" |
| Loading | "Loading projects..." | "Cargando proyectos..." |
| Search placeholder | "Search by name..." | "Buscar por nombre..." |
| Filter label | "Status" | "Estado" |
| Date range | "Last 30 days" | "Ultimos 30 dias" |
| Pagination | "Showing 1-10 of 45" | "Mostrando 1-10 de 45" |

### Anti-patterns

- **Spanglish.** Mixing languages mid-sentence: "Haz click en el button de save."
- **Literal translation.** Translating word-for-word from English produces unnatural text.
- **Inconsistent register.** Using "tu" in some places and "usted" in others.
- **Spain-only vocabulary.** "Ordenador," "vosotros," "vale," "mola."
- **Avoiding anglicisms that ARE accepted.** "Dashboard," "email," "link," "app" are established in Latin American tech.
- **Over-localizing.** Translating brand names, feature names, or product concepts that should stay in English.

---

## 10. Data Storytelling Principles

### The Narrative Arc for Dashboards

Every dashboard tells a story. Borrow from narrative structure:

| Story element | Dashboard equivalent | Example |
|---|---|---|
| **Setting** | Context and baseline | "This month" / "vs. last month" / "Goal: 85%" |
| **Rising action** | Trends and changes | Sparklines, trend arrows, period-over-period comparisons |
| **Climax** | Key insight or anomaly | Highlighted KPI card, alert banner, insight callout |
| **Resolution** | Recommended action | CTA button, linked detail view, next steps |

### Context Before Data

**Rule: Never show a number without context.**

| Without context | With context |
|---|---|
| "Revenue: $45,000" | "Revenue: $45,000 (+12% vs. last month)" |
| "Tasks: 34" | "Tasks: 34 of 50 completed (68%)" |
| "Score: 7.2" | "Score: 7.2 / 10 (above team average of 6.1)" |

**Spanish:**

| Sin contexto | Con contexto |
|---|---|
| "Ingresos: $45,000" | "Ingresos: $45,000 (+12% vs. mes anterior)" |
| "Tareas: 34" | "Tareas: 34 de 50 completadas (68%)" |
| "Puntaje: 7.2" | "Puntaje: 7.2 / 10 (sobre el promedio del equipo de 6.1)" |

### Comparison Framing

**Always answer: "Compared to what?"**

| Comparison type | Use when | Example |
|---|---|---|
| Period-over-period | Tracking change over time | "+15% vs. last month" |
| Goal/target | Measuring against objectives | "82% of 90% target" |
| Benchmark | Comparing to industry/peers | "Above industry average (75%)" |
| Peer comparison | Comparing entities | "Ranked #2 of 15 spaces" |
| Historical best/worst | Highlighting extremes | "Highest since January 2025" |

### Trend Narratives

- Use arrows (up/down) paired with percentages for quick scanning.
- Color-code trends: green for improvement, red for decline (with icons for accessibility).
- Include the comparison period: "+12% vs. last month" not just "+12%."
- For flat trends, say "Stable" or "No change," not "0%."

### Rules for B2B SaaS Dashboards

- Start with the summary, then let users drill into details (inverted pyramid).
- The top of the dashboard answers "How are things going?" The middle answers "What's driving it?" The bottom answers "What should I do about it?"
- Limit the top-level view to 3-5 KPIs. More is not better.
- Group related metrics. Don't scatter related data across the page.
- Use consistent time periods across all cards on a dashboard page.

### Anti-patterns

- **Data without narrative.** Showing 20 numbers with no hierarchy, context, or relationships.
- **Vanity metrics.** Showing impressive-looking numbers that don't drive decisions.
- **Missing baselines.** Is 45,000 good or bad? Without a baseline, the user can't tell.
- **Inconsistent time periods.** One card shows monthly, another shows weekly, a third shows all-time — without labels.
- **Chart junk.** 3D effects, gradients, decorative elements that don't add information.

---

## 11. KPI Presentation

### Anatomy of a KPI Card

Every KPI card should contain:

1. **Metric name** (title) — Short, noun-based. "Active spaces" not "Number of currently active spaces."
2. **Value** (the number) — Largest element, immediately visible.
3. **Time period** — "This month" / "Last 30 days" / "Q1 2026."
4. **Trend indicator** — Arrow + percentage + comparison period.
5. **Sparkline** (optional) — Compact trend visualization.
6. **Status color** (optional) — Semantic color indicating health.

### Writing KPI Labels

| Bad label | Good label | Why |
|---|---|---|
| "Number of Active Client Accounts" | "Active spaces" | Use product vocabulary, be concise |
| "Revenue (USD) for Current Month" | "Revenue (MTD)" | Abbreviate time periods, currency is implicit |
| "Percentage of Tasks Completed On Time" | "On-time delivery" | Concept, not formula |
| "Total FTE Allocation" | "Team utilization" | User-centered language |
| "SLA Compliance Rate (%)" | "SLA compliance" | Don't put units in the label; put them with the value |

**Spanish:**

| Mal | Bien |
|---|---|
| "Numero de cuentas de clientes activos" | "Espacios activos" |
| "Ingresos (USD) del mes en curso" | "Ingresos (mes actual)" |
| "Porcentaje de tareas completadas a tiempo" | "Entrega a tiempo" |
| "Tasa de cumplimiento de SLA (%)" | "Cumplimiento de SLA" |

### Writing Trend Descriptions

| Pattern | Example |
|---|---|
| Improvement | "↑ 12% vs. last month" / "↑ 12% vs. mes anterior" |
| Decline | "↓ 8% vs. last month" / "↓ 8% vs. mes anterior" |
| Stable | "— No change" / "— Sin cambios" |
| New (no comparison) | "First month" / "Primer mes" |
| Goal proximity | "82% of 90% target" / "82% de meta del 90%" |

### Contextualizing Numbers

**Always answer: "vs. what? vs. when?"**

| Raw number | Contextualized |
|---|---|
| "42" | "42 tasks remaining (of 120 total)" |
| "$125K" | "$125K revenue — 89% of monthly target" |
| "3.2 days" | "3.2 days avg. response time (goal: <2 days)" |
| "97%" | "97% uptime (above 99.5% SLA)" |

### Threshold Explanations

When a KPI crosses a threshold, explain why it matters:

| Status | Label | Explanation pattern |
|---|---|---|
| Green / Optimo | "On track" | "Meeting or exceeding the target of X" |
| Yellow / Atencion | "Needs attention" | "Within 10% of the target. Action may be needed." |
| Red / Critico | "Critical" | "Below target by more than X%. Immediate action required." |

### Anti-patterns

- **Orphan numbers.** A number with no label, no trend, no context.
- **Too many KPIs.** More than 5-7 on a single dashboard view. Prioritize ruthlessly.
- **Inconsistent formatting.** One card shows "$45K," another shows "$45,000.00."
- **Missing time context.** Is this today? This month? All time? Always label the period.
- **Misleading trends.** Showing a "+50%" increase when the base was 2 → 3.

---

## 12. Chart Titles and Annotations

### Descriptive vs. Prescriptive Titles

| Type | Purpose | Example |
|---|---|---|
| **Descriptive** | States what the chart shows | "Monthly revenue by space (2026)" |
| **Prescriptive** (insight-driven) | States the takeaway | "Revenue grew 23% in Q1, led by Space Alpha" |

**When to use which:**
- Descriptive titles for standard, recurring dashboard charts where the data changes but the structure doesn't.
- Prescriptive titles for reports, presentations, and highlighted insights.
- In dashboards, prefer descriptive. Reserve prescriptive for callout cards or annotations.

**Spanish:**
- Descriptive: "Ingresos mensuales por espacio (2026)"
- Prescriptive: "Los ingresos crecieron 23% en Q1, liderados por Espacio Alpha"

### Axis Labels

**Rules:**
- Always label both axes.
- Include units: "Revenue ($K)" / "Ingresos ($K)."
- Use abbreviated month names for time axes: "Jan," "Feb" / "Ene," "Feb."
- Don't rotate labels more than 45 degrees — redesign the chart instead.
- Avoid redundancy: if the chart title says "Monthly Revenue," the Y-axis can just say "$K."

### Legend Copy

**Rules:**
- Label legends with the same terms used elsewhere in the product.
- Place legends close to the data they describe. Directly labeling lines is better than a separate legend box.
- Limit categories to 5-7 per chart. More requires a different visualization.
- Order legend items to match the visual order in the chart.

### Annotations

**Structure: [What happened] + [When] + (optional) [Impact]**

| Bad | Good |
|---|---|
| "Note: something happened here" | "Campaign launched Mar 15 → 40% traffic increase" |
| "See spike" | "Server outage (2h) — data gap" |
| "Important" | "Goal achieved: 10K users" |

**Spanish:**
- "Campana lanzada 15 Mar → aumento del 40% en trafico"
- "Caida del servidor (2h) — brecha de datos"
- "Meta alcanzada: 10K usuarios"

**Rules:**
- Place annotations close to the data point they reference.
- Use leader lines or arrows to connect text to data points.
- Keep annotation text under 10 words.
- Use annotations to explain anomalies, not to describe normal patterns.

### Insight Callouts

Dedicated cards or banners that surface key findings:

| Pattern | Example |
|---|---|
| Trend insight | "Revenue has increased for 3 consecutive months" |
| Anomaly | "Task completion dropped 15% this week — 3 team members were on leave" |
| Achievement | "You've exceeded your Q1 target by 12%" |
| Risk | "At current pace, you'll miss the March deadline by 5 days" |

**Spanish:**
- "Los ingresos han aumentado durante 3 meses consecutivos"
- "La finalizacion de tareas cayo 15% esta semana — 3 miembros del equipo estuvieron de licencia"
- "Superaste tu meta del Q1 por 12%"
- "Al ritmo actual, no alcanzaras la fecha limite de marzo por 5 dias"

### Anti-patterns

- **Missing titles.** Charts without titles force users to figure out what they're looking at.
- **Generic titles.** "Chart 1" or "Data" — useless.
- **Over-annotated charts.** Too many annotations create visual noise.
- **Decorative elements.** 3D effects, unnecessary gridlines, background images.
- **Misleading scales.** Y-axis not starting at zero for bar charts (acceptable for line charts showing small variations).

---

## 13. Dashboard Narrative Flow

### Information Hierarchy (Summary-then-Detail)

**Level 1: Executive Summary (Top of Page)**
- 3-5 KPI cards answering "How are things going?"
- Glanceable in under 5 seconds.
- Shows: key metric, trend, status color.

**Level 2: Analysis (Middle of Page)**
- Trend charts, comparisons, breakdowns.
- Answers "What's driving the results?"
- Shows: time series, category breakdowns, top/bottom performers.

**Level 3: Detail (Bottom or Drill-down)**
- Data tables, raw data, export options.
- Answers "Show me the specifics."
- Shows: sortable tables, filterable lists, individual records.

### Progressive Disclosure of Complexity

| Layer | Shows | Interaction |
|---|---|---|
| Default view | KPIs + primary chart | Visible on load |
| Hover/tooltip | Additional detail per data point | On hover |
| Click/expand | Breakdown or drill-down | On click |
| Separate page | Full detail view | Navigation link |

**Impact:** Progressive disclosure reduces cognitive load by 37% and increases engagement by 43% vs. static dashboards (UXPin research).

### Reading Patterns

Design for the F-pattern (left-to-right, top-to-bottom):
- Most important KPIs in top-left.
- Primary chart spans full width or occupies the larger left column.
- Secondary content in right sidebar or below.
- Action items and CTAs in expected positions (top-right for page actions, bottom-right for form submissions).

### Dashboard Layout Patterns

| Pattern | Structure | When to use |
|---|---|---|
| KPI strip + chart | 4 KPIs across top, full-width chart below | General performance dashboard |
| Split view | 8/4 grid — main chart left, stats right | Detailed analysis with sidebar metrics |
| Card grid | Equal-sized cards in a grid | Multi-metric overview |
| Focus + detail | Hero metric on top, supporting details below | When one metric is the primary focus |

### Actionable Insights Pattern

Every dashboard section should answer:
1. **What** is happening? (the metric)
2. **So what?** (the context/comparison)
3. **Now what?** (the recommended action)

Example:
- What: "On-time delivery: 72%"
- So what: "Down from 89% last month. Below target of 85%."
- Now what: "Review delayed tasks →" (link to filtered task view)

### Anti-patterns

- **Data dumping.** Showing every available metric on one page.
- **No hierarchy.** All metrics at the same visual weight.
- **Disconnected widgets.** Cards that don't relate to each other or tell a coherent story.
- **No entry point.** Users don't know where to start looking.
- **Missing drill-down.** Summary without the ability to investigate.
- **Scrolling hell.** Dashboard that requires endless scrolling. Key info must be above the fold.

---

## 14. Contextualizing Metrics

### The Five Types of Context

| Context type | Question it answers | Example |
|---|---|---|
| **Target/Goal** | "Are we on track?" | "82% of 90% target" |
| **Historical** | "Is this better or worse than before?" | "+12% vs. last month" |
| **Benchmark** | "How do we compare to others?" | "Above industry average (75%)" |
| **Peer** | "Who's doing best/worst?" | "Ranked #2 of 15 spaces" |
| **Threshold** | "Is this good, okay, or bad?" | Green/Yellow/Red status indicator |

### Explaining What "Good" Looks Like

Every KPI should have a definition of success:

| KPI | Good | Acceptable | Needs attention |
|---|---|---|---|
| On-time delivery | >90% | 80-90% | <80% |
| Team utilization | 75-85% | 60-75% | <60% or >90% |
| Client satisfaction | >8.5/10 | 7-8.5/10 | <7/10 |
| Budget variance | ±5% | ±5-15% | >±15% |

Include these definitions in tooltip help text or in a "How to read this" section.

### Writing Comparison Copy

| Pattern | English | Spanish |
|---|---|---|
| Increase | "+12% vs. last month" | "+12% vs. mes anterior" |
| Decrease | "-8% vs. last quarter" | "-8% vs. trimestre anterior" |
| Goal proximity | "92% of 95% target" | "92% de meta del 95%" |
| Peer ranking | "#3 of 12 spaces" | "#3 de 12 espacios" |
| Benchmark | "Above average (industry: 72%)" | "Sobre el promedio (industria: 72%)" |
| Record | "Highest this year" | "El mas alto del ano" |
| Stable | "No change from last month" | "Sin cambios vs. mes anterior" |

### Anti-patterns

- **Naked numbers.** A metric with no comparison, goal, or historical context.
- **Arbitrary thresholds.** Green/yellow/red without defined criteria.
- **Apples-to-oranges comparisons.** Comparing different time periods or different metrics.
- **Missing denominators.** "45 completed tasks" — out of how many?
- **Percentage without base.** "+200% increase" when the base was 1 → 3.

---

## 15. Alert and Threshold Copy

### The Semaphore/Traffic Light System

| Level | Color | Icon | Label (EN) | Label (ES) | Meaning |
|---|---|---|---|---|---|
| Optimal | Green (#6ec207) | Check circle | "On track" | "Optimo" | Meeting or exceeding target |
| Attention | Yellow/Orange (#ff6500) | Warning triangle | "Needs attention" | "Atencion" | Approaching threshold |
| Critical | Red (#bb1954) | Alert octagon | "Critical" | "Critico" | Below acceptable level |

### Writing Alert Copy

**Structure: [Status] + [Metric and value] + [Context] + [Action]**

| Severity | Bad | Good |
|---|---|---|
| Warning | "Warning!" | "Utilization is at 92% — above the recommended 85%. Consider redistributing workload." |
| Critical | "CRITICAL ALERT!" | "On-time delivery dropped to 65%, below the 80% threshold. Review overdue tasks." |
| Info | "FYI" | "3 team members have no assigned projects for next cycle." |

**Spanish:**

| Severidad | Mal | Bien |
|---|---|---|
| Atencion | "Advertencia!" | "La utilizacion esta al 92% — sobre el 85% recomendado. Considera redistribuir la carga de trabajo." |
| Critico | "ALERTA CRITICA!" | "La entrega a tiempo cayo al 65%, bajo el umbral del 80%. Revisa las tareas atrasadas." |
| Info | "Para tu informacion" | "3 miembros del equipo no tienen proyectos asignados para el proximo ciclo." |

### Urgency Without Alarm

**Rules:**
- State facts, not emotions. "Budget is 20% over target" not "BUDGET CRISIS!"
- Use escalation language progressively: "approaching" → "reached" → "exceeded."
- Provide the specific number that triggered the alert.
- Always include what action to take.
- Reserve uppercase and exclamation marks for genuine emergencies (system down, data loss).

### Escalation Language Patterns

| Phase | English | Spanish |
|---|---|---|
| Approaching | "Approaching the limit" | "Acercandose al limite" |
| At threshold | "At the threshold" | "En el umbral" |
| Exceeded | "Exceeded by X%" | "Excedido por X%" |
| Critical | "Requires immediate attention" | "Requiere atencion inmediata" |

### Anti-patterns

- **Crying wolf.** Making everything red/critical. Users stop paying attention.
- **Urgency without action.** Alarming the user with no path to resolution.
- **Color-only indicators.** Red/green with no text label — fails for colorblind users (8% of males).
- **Stale alerts.** Alerts that remain visible after the issue is resolved.
- **Vague thresholds.** "Performance is low" — compared to what? Define specific numbers.

---

## 16. Data Table UX Writing

### Column Headers

**Rules:**
- Keep headers to 1-3 words.
- Use nouns, not full sentences.
- Use sentence case: "Project name" not "PROJECT NAME."
- Don't repeat the entity name in every column: if the table shows projects, use "Name" not "Project name" (the context is already clear from the table title).
- Include units in headers when values don't include them: "Revenue ($K)."
- Align headers with their content: left for text, right for numbers.

| Bad header | Good header |
|---|---|
| "The Name of the Project" | "Name" |
| "STATUS OF CURRENT DELIVERY" | "Delivery status" |
| "% OF BUDGET CONSUMED" | "Budget used (%)" |
| "ASSIGNED TEAM MEMBER NAME" | "Assignee" |

**Spanish:**

| Mal | Bien |
|---|---|
| "El Nombre del Proyecto" | "Nombre" |
| "ESTADO DE LA ENTREGA ACTUAL" | "Estado de entrega" |
| "% DEL PRESUPUESTO CONSUMIDO" | "Presupuesto usado (%)" |
| "NOMBRE DEL MIEMBRO DEL EQUIPO ASIGNADO" | "Responsable" |

### Empty Cells and Null Values

| Scenario | Display | Meaning |
|---|---|---|
| No value exists (null) | "—" (em-dash) | Not applicable or not yet set |
| Value is zero | "0" | Explicitly zero |
| Data not available | "N/A" or "No data" | Data exists conceptually but isn't available |
| Pending/loading | Skeleton shimmer | Data is being fetched |
| Not applicable to this row | "—" | Field doesn't apply |

**Rules:**
- Never leave cells completely blank — screen readers skip them, and users think it's a bug.
- Use consistent markers throughout: pick "—" or "N/A" and stick with it.
- Style null indicators in a lighter color (gray) to visually de-emphasize them.
- For accessibility, include `aria-label="No data"` on empty cell markers.

### Aggregation Labels

| Type | English | Spanish |
|---|---|---|
| Sum | "Total" | "Total" |
| Average | "Average" / "Avg." | "Promedio" / "Prom." |
| Count | "Count" | "Cantidad" |
| Minimum | "Min." | "Min." |
| Maximum | "Max." | "Max." |
| Median | "Median" | "Mediana" |

**Rules:**
- Clearly label aggregation rows visually (bold, separator line above).
- Specify the aggregation type: "Average rating" not just a number in a "Total" row.
- Include count of records: "Average of 45 records."

### Filter Descriptions

**Rules:**
- Show active filters clearly: "Showing: Active spaces in Q1 2026."
- Provide a "Clear all filters" action.
- Show result count after filtering: "12 of 45 spaces match your filters."
- Use chip/tag UI for active filters, each with a remove (x) action.

| Bad | Good |
|---|---|
| "Filtered" | "Showing 12 of 45 spaces" |
| "Results" | "3 filters applied: Status=Active, Team=Design, Period=Q1 2026" |

**Spanish:**
- "Mostrando 12 de 45 espacios"
- "3 filtros aplicados: Estado=Activo, Equipo=Diseno, Periodo=Q1 2026"

### Anti-patterns

- **ALL CAPS headers.** Harder to read than sentence case.
- **Truncated headers without tooltips.** If a header is cut off, provide a tooltip with the full text.
- **Blank cells.** Ambiguous — is it null, zero, loading, or an error?
- **Inconsistent number formatting.** "$1,234" in one column, "1234.00" in another.
- **Missing sorting indicators.** Users should see which column is sorted and in which direction.
- **Pagination without count.** "Page 3" — of how many? Show "Page 3 of 12 (115 records)."

---

## 17. Content Style Guides from Top Companies

### Google Material Design (M3)

**Core principles:**
- Text should be helpful, clear, and resilient to change.
- UI text should be understandable by anyone, anywhere.
- Use sentence case for all UI text elements.
- Use second person ("you") conversationally; first person ("I/my") for user ownership.
- Use numerals instead of spelled-out numbers.
- Avoid industry jargon and invented feature names.
- Tone is contextual: economical for errors, friendly for onboarding.

**Key guideline:** "Pick common words that are clearly and easily understandable to both beginning and advanced English readers."

### Apple Human Interface Guidelines

**Core principles:**
- Clarity should always be the priority.
- "As long as it needs to be, but as short as it can be."
- Use active voice and start with verbs for action items.
- Consistency builds familiarity.
- Brevity is key, especially on small screens.
- Avoid the temptation to be too cute or clever.

**Key guideline:** "Start by writing everything down, then put it away for a few days. When you come back, you'll see what can be cut."

### Shopify Polaris

**Core principles:**
- Read content aloud — it should sound like something a person would say.
- Start sentences with imperative verbs for actionable instructions.
- Drop articles in labels and microcopy to increase readability.
- Use active voice; the subject performs the action.
- Aim for US Grade 7 reading level.
- Focus on the ONE thing the user needs to know or do next.

**Key guideline:** "Don't overwhelm people with too many choices or too much info upfront."

### Atlassian Design System

**Core principles:**
- Voice is "like a friend or colleague who wants to be helpful and share wisdom."
- Brand voice: bold, optimistic, practical — with a wink.
- Tone adapts to user emotional state:
  - Uncertain users → upbeat, walk them through it.
  - Overwhelmed users → direct, tell them what to do and get out of the way.
  - Growing users → expert tone, focus on the solution.
- "Give flowers, not puppies" — celebrate appropriately, don't overdo it.

**Key guideline:** "Craft messages with a familiar tone, clear language, and solid knowledge of the audience, then get out of their way."

### IBM Carbon Design System

**Core principles:**
- Keep sentences under 25 words.
- Avoid slang, jargon, sarcasm, emoticons.
- Use sentence-case capitalization for ALL UI text.
- Be succinct; avoid redundant text.
- Voice is: clear point of view, simple and logical, intellectually ambitious.
- Tone adapts: economical/direct for errors, friendly for onboarding.
- "Engage the thinker by speaking like the thinker."

**Key guideline:** "Be persuasive rather than poetic. Be confident but not boastful."

### Synthesis: Universal Rules Across All Five Systems

| Rule | Google | Apple | Shopify | Atlassian | IBM |
|---|---|---|---|---|---|
| Sentence case | Yes | Yes | Yes | Yes | Yes |
| Active voice | Yes | Yes | Yes | Yes | Yes |
| Short sentences | Yes | Yes | Yes | Yes | <25 words |
| No jargon | Yes | Yes | Yes | Yes | Yes |
| User-centered (2nd person) | Yes | Yes | Yes | Yes | Yes |
| Tone adapts to context | Yes | Yes | Yes | Yes | Yes |
| Clarity > cleverness | Yes | Yes | Yes | Yes | Yes |

---

## 18. UX Writing Tools and Frameworks

### Voice Chart

A table with 3-5 brand voice attributes, each with:
- **Do** examples (how to express this attribute)
- **Don't** examples (how this attribute goes wrong)
- **Why it matters** explanation

Example:

| Attribute | Do | Don't | Why |
|---|---|---|---|
| Helpful | "Here's how to fix this..." | "Per documentation section 4.2.1..." | Users need guidance, not references |
| Clear | "Your report is ready" | "Report generation process finalized" | Plain language speeds comprehension |
| Professional | "We encountered an issue" | "Oopsie! Something broke!" | B2B users expect seriousness |
| Concise | "3 tasks remaining" | "You currently have 3 tasks that still need to be completed" | Screen space is limited |

### Tone Map

Maps tone attributes to content types and user emotional states:

| Situation | Formality | Enthusiasm | Humor | Examples |
|---|---|---|---|---|
| Onboarding | Casual | High | Light | "Welcome! Let's get you set up." |
| Error message | Neutral | Low | None | "We couldn't load your data. Try again." |
| Success | Casual | Moderate | None | "Changes saved." |
| Billing/Legal | Formal | Low | None | "Your payment method has been updated." |
| Empty state (first use) | Casual | Moderate | Light | "Your dashboard is waiting. Create your first space." |
| Data alert (critical) | Formal | Low | None | "Delivery rate fell below 80%. Review overdue tasks." |

### Content Audit Process

1. **Inventory** — Screenshot every screen and catalog all UI text.
2. **Categorize** — Group by type: labels, buttons, errors, help text, etc.
3. **Evaluate** — Score each piece against voice/tone guidelines and NN/g rubric.
4. **Prioritize** — Fix high-traffic, high-impact text first.
5. **Iterate** — Re-audit quarterly.

### Decision Tree for Copy

```
Is the user taking an action?
├── Yes → Use verb + object ("Save report")
│   ├── Is it destructive? → State what will be destroyed + consequence
│   └── Is it reversible? → No confirmation needed; provide undo
└── No → Is the system providing information?
    ├── Status update → State what happened ("Report saved")
    ├── Error → What happened + How to fix ("Enter a valid email")
    ├── Empty state → What goes here + How to add it + CTA
    └── Data display → Label + Value + Context
```

### Content Templates

**Error message template:**
> [What went wrong]. [How to fix it / What to do next].
> Example: "This email is already in use. Try logging in instead, or use a different email."

**Empty state template:**
> Heading: [What should be here but isn't]
> Body: [Why it's valuable / What you can do with it]
> CTA: [Action verb + object]

**KPI card template:**
> Title: [Short metric name]
> Value: [Number with unit]
> Subtitle: [Trend indicator + comparison]
> Tooltip: [What this measures and why it matters]

**Toast template:**
> [Icon] [What just happened]. [Optional: next step or undo link].

---

## 19. Measuring UX Writing Effectiveness

### Quantitative Metrics

| Metric | What it measures | Target |
|---|---|---|
| **Task completion rate** | % of users who complete a flow | >90% for critical flows |
| **Time on task** | How long users take to complete actions | Decreasing over iterations |
| **Error rate** | How often users trigger errors | Decreasing over iterations |
| **Form abandonment** | % of users who start but don't finish forms | <20% |
| **Support ticket volume** | Questions about UI/UX topics | Decreasing over iterations |
| **Click-through rate** | Engagement with CTAs and buttons | Increasing over iterations |
| **Readability score** | Flesch-Kincaid grade level | Grade 7-8 or lower |

### Qualitative Methods

| Method | What it reveals | When to use |
|---|---|---|
| **Usability testing** | Whether users understand the copy in context | Before launch, after major changes |
| **Cloze testing** | Whether users can fill in missing words (comprehension) | When testing new terminology; score >60% = comprehensible |
| **5-second test** | What users remember after seeing a screen briefly | Testing KPI cards, dashboards, error messages |
| **Comprehension survey** | Whether users correctly interpret the meaning | After launch, for critical flows |
| **Card sorting** | What labels users expect for navigation | When designing information architecture |
| **Tree testing** | Whether users can find items using the proposed structure | When redesigning navigation |
| **Preference testing (A/B)** | Which version of copy users prefer | When choosing between alternatives |
| **Highlighter test** | Which copy feels positive/negative/confusing | For longer content blocks |

### A/B Testing UX Copy

**What to test:**
- Button labels: "Get started" vs. "Create your first space."
- Error messages: technical vs. human-readable.
- Empty states: motivational vs. instructional.
- Notification copy: short vs. detailed.
- Onboarding steps: number of steps, copy length.

**Rules:**
- Test one variable at a time.
- Use sufficient sample size (>100 per variant minimum).
- Run for at least 2 weeks to account for weekly patterns.
- Measure behavior (completion, clicks), not just preference.

### Readability Scoring

| Scale | Score range | Interpretation |
|---|---|---|
| Flesch-Kincaid Grade Level | Target: 7-8 | Reading level needed to understand the text |
| Flesch Reading Ease | Target: 60-70 | Higher = easier to read |
| Gunning Fog Index | Target: 8-10 | Years of education needed |

**Tools:** Hemingway App, Readable.com, Grammarly, Microsoft Word's built-in readability.

**Note:** Spanish readability uses the Fernandez-Huerta formula (adaptation of Flesch for Spanish). Target: 60-70 on the Fernandez-Huerta scale.

### Anti-patterns in Measurement

- **Measuring only clicks.** High click rate on "Learn more" might mean the primary copy is unclear, not that the link is well-written.
- **Testing in isolation.** Copy tested outside its visual context gives misleading results.
- **Ignoring qualitative feedback.** Numbers tell you what happened; user interviews tell you why.
- **One-time audit.** UX writing quality degrades as features are added. Audit continuously.
- **Vanity metrics.** Measuring "positive sentiment" instead of task completion.

---

## Sources

### UX Writing & Microcopy
- [How to Create a Tone of Voice for UX Writing](https://www.uxdesigninstitute.com/blog/tone-of-voice-for-ux-writing/)
- [The Four Dimensions of Tone of Voice — NN/g](https://www.nngroup.com/videos/tone-of-voice-dimensions/)
- [The Art of Voice and Tone in UX Writing](https://uxwritinghub.com/ux-writing-voice-and-tone/)
- [How to Improve Your Microcopy — Smashing Magazine](https://www.smashingmagazine.com/2024/06/how-improve-microcopy-ux-writing-tips-non-ux-writers/)
- [How to Write Microcopy (Buttons, Errors, Tooltips)](https://medium.com/@NabaasaElijah/how-to-write-microcopy-buttons-errors-tooltips-1575f31c18a3)
- [The Importance of Microcopy in UX Design](https://medium.com/design-bootcamp/the-importance-of-microcopy-in-ux-design-writing-effective-button-labels-error-messages-and-0a9c2c6eaa38)
- [Microcopy Best Practices 2025](https://www.pippit.ai/resource/microcopy-best-practices-2025-guide-to-ux-writing)
- [Add Personality to Your App Through UX Writing — Apple WWDC24](https://developer.apple.com/videos/play/wwdc2024/10140/)

### Error Messages
- [Error-Message Guidelines — NN/g](https://www.nngroup.com/articles/error-message-guidelines/)
- [Error Messages Scoring Rubric — NN/g](https://www.nngroup.com/articles/error-messages-scoring-rubric/)
- [Hostile Patterns in Error Messages — NN/g](https://www.nngroup.com/articles/hostile-error-messages/)
- [Designing Better Error Messages UX — Smashing Magazine](https://www.smashingmagazine.com/2022/08/error-messages-ux-design/)
- [How to Write Error Messages — UX Content Collective](https://uxcontent.com/how-to-write-error-messages/)
- [Error Message UX — LogRocket](https://blog.logrocket.com/ux-design/writing-clear-error-messages-ux-guidelines-examples/)
- [10 Design Guidelines for Errors in Forms — NN/g](https://www.nngroup.com/articles/errors-forms-design-guidelines/)

### Empty States
- [Empty State UX Examples — Eleken](https://www.eleken.co/blog-posts/empty-state-ux)
- [Empty States in UX — LogRocket](https://blog.logrocket.com/ux-design/empty-states-ux-examples/)
- [Carbon Design System — Empty States Pattern](https://carbondesignsystem.com/patterns/empty-states-pattern/)
- [Designing Empty States — UXPin](https://www.uxpin.com/studio/blog/ux-best-practices-designing-the-overlooked-empty-states/)
- [Empty State UX Writing — Contentphilic](https://contentphilic.com/empty-state-ux-writing-examples/)
- [Designing Empty States in Complex Applications — NN/g](https://www.nngroup.com/articles/empty-state-interface-design/)

### Forms
- [Placeholders in Form Fields Are Harmful — NN/g](https://www.nngroup.com/articles/form-design-placeholders/)
- [Text Fields & Forms Design — UX Collective](https://uxdesign.cc/text-fields-forms-design-ui-components-series-2b32b2beebd0)
- [Accessible Forms: Problem with Placeholders — Deque](https://www.deque.com/blog/accessible-forms-the-problem-with-placeholders/)
- [Form Input Design Best Practices — UXPin](https://www.uxpin.com/studio/blog/form-input-design-best-practices/)

### Navigation
- [Menu-Design Checklist: 17 UX Guidelines — NN/g](https://www.nngroup.com/articles/menu-design/)
- [Breadcrumbs: 11 Design Guidelines — NN/g](https://www.nngroup.com/articles/breadcrumbs/)
- [Breadcrumbs UX Navigation — Pencil & Paper](https://www.pencilandpaper.io/articles/breadcrumbs-ux)

### Notifications & Confirmation Dialogs
- [Toast Notifications Best Practices — LogRocket](https://blog.logrocket.com/ux-design/toast-notifications/)
- [Carbon Design System — Notification Pattern](https://carbondesignsystem.com/patterns/notification-pattern/)
- [Confirmation Dialogs Can Prevent User Errors — NN/g](https://www.nngroup.com/articles/confirmation-dialog/)
- [Cancel vs Close — NN/g](https://www.nngroup.com/articles/cancel-vs-close/)
- [How to Design Better Destructive Action Modals](https://uxpsychology.substack.com/p/how-to-design-better-destructive)

### Inclusive Language
- [International Guide to Gender-Inclusive Writing — UX Content Collective](https://uxcontent.com/the-international-guide-to-gender-inclusive-writing/)
- [Inclusive Content — Intuit Content Design](https://contentdesign.intuit.com/accessibility-and-inclusion/inclusive-content/)
- [UN Gender-Inclusive Language Guidelines](https://www.un.org/en/gender-inclusive-language/guidelines.shtml)

### Spanish Language
- [The UX of Language: How Bad Translation Breaks Conversion — SEAtongue](https://seatongue.com/tips/the-ux-of-language-how-bad-translation-breaks-conversion-funnels/)
- [UI Localization into Romance Languages — Art One](https://artonetranslations.com/ui-localization-into-romance-languages/)
- [Top 9 UX Translation Problems — Localazy](https://localazy.com/blog/top-9-ux-translation-problems-and-how-to-solve-them)
- [How to Write Great Microcopy for Multiple Markets — Lokalise](https://lokalise.com/blog/multilingual-microcopy-supercharge/)

### Data Storytelling
- [Data Storytelling Arc — Effective Data Storytelling](https://www.effectivedatastorytelling.com/post/data-storytelling-demystifying-narrative-structure-in-data-stories)
- [Data Storytelling in Dashboards: 15 Tips — Bismart](https://blog.bismart.com/en/data-storytelling-cuadros-de-mando)
- [From Dashboard to Story — Storytelling with Data](https://www.storytellingwithdata.com/blog/from-dashboard-to-story)
- [Anatomy of the KPI Card — Nastengraph](https://nastengraph.substack.com/p/anatomy-of-the-kpi-card)

### Dashboard & Data Visualization
- [Dashboard Design UX Patterns — Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards)
- [Effective Dashboard Design Principles — UXPin](https://www.uxpin.com/studio/blog/dashboard-design-principles/)
- [Information Hierarchy in Dashboards — Cluster](https://clusterdesign.io/information-hierarchy-in-dashboards/)
- [Data Table Design UX Patterns — Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables)
- [Using Data Visualization Annotation and Labels — Storytelling with Charts](https://www.storytellingwithcharts.com/blog/context-is-key-using-data-visualization-annotation-and-labels-effectively/)
- [Fundamentals of Data Visualization — Claus Wilke](https://clauswilke.com/dataviz/figure-titles-captions.html)
- [Text in Data Visualizations — Datawrapper](https://www.datawrapper.de/blog/text-in-data-visualizations)

### Content Style Guides
- [Material Design 3 — Content Design Overview](https://m3.material.io/foundations/content-design/overview)
- [Material Design 3 — Style Guide](https://m3.material.io/foundations/content-design/style-guide)
- [Apple HIG — Writing](https://developer.apple.com/design/human-interface-guidelines/writing)
- [Shopify Polaris — Voice and Tone](https://polaris.shopify.com/content/voice-and-tone)
- [Shopify Polaris — Actionable Language](https://polaris.shopify.com/foundations/content/actionable-language)
- [Atlassian — Voice and Tone Principles](https://atlassian.design/content/voice-and-tone-principles/)
- [Atlassian — Writing Guidelines](https://atlassian.design/content/writing-guidelines/)
- [IBM Carbon — Content Guidelines](https://carbondesignsystem.com/guidelines/content/overview/)
- [Mailchimp — Voice and Tone](https://styleguide.mailchimp.com/voice-and-tone/)
- [PatternFly — Brand Voice and Tone](https://www.patternfly.org/ux-writing/brand-voice-and-tone/)

### UX Writing Tools & Measurement
- [Voice Chart: Put One in Your UX Writing Toolkit](https://medium.com/@rachaelharwood_ux/voice-chart-put-one-in-your-ux-writing-toolkit-08965f0e3b3a)
- [Voice Chart in UX Writing — Boldare](https://www.boldare.com/blog/voice-chart-in-ux-writing/)
- [Content Testing and Measurement for UX — UX Content Collective](https://uxcontent.com/content-testing-measurement-ux/)
- [Measuring UX Writing Success — 4ptgrid](https://www.4ptgrid.com/blog/ux-writing-key-metrics-and-validation)
- [Legibility, Readability, and Comprehension — NN/g](https://www.nngroup.com/articles/legibility-readability-comprehension/)
- [Five Must-Try Content Tests for UX Writers — UX Content Collective](https://uxcontent.com/five-must-try-content-tests-for-ux-writers/)
- [Content Testing: How to Measure Effectiveness — LogRocket](https://blog.logrocket.com/ux-design/content-testing/)

### B2B SaaS UX
- [US SaaS UX Best Practices for B2B Platforms](https://www.equal.design/blog/saas-ux-best-practices-b2b-us)
- [B2B SaaS UX Design in 2026 — Onething Design](https://www.onething.design/post/b2b-saas-ux-design)
- [6 Steps to Design Thoughtful Dashboards for B2B SaaS](https://uxdesign.cc/design-thoughtful-dashboards-for-b2b-saas-ff484385960d)
- [SaaS UX Best Practices for Dashboards — Groto](https://www.letsgroto.com/blog/saas-ux-best-practices-how-to-design-dashboards-users-actually-understand)
- [Smart SaaS Dashboard Design Guide 2026 — F1Studioz](https://f1studioz.com/blog/smart-saas-dashboard-design/)

### Onboarding
- [UX Writing for Onboarding — Bootcamp](https://medium.com/design-bootcamp/ux-writing-for-onboarding-create-effective-onboarding-experience-through-ux-copy-2debc70bdb1a)
- [User Onboarding UX Writing Examples — Contentphilic](https://contentphilic.com/user-onboarding-ux-writing-examples/)
- [UX Onboarding Best Practices 2025 — UX Design Institute](https://www.uxdesigninstitute.com/blog/ux-onboarding-best-practices-guide/)
- [Greeting the User: Design Tips on User Onboarding](https://uxplanet.org/greeting-the-user-design-tips-on-user-onboarding-d654053a890d)
