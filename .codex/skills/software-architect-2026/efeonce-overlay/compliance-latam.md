# LATAM Compliance

> Region-specific compliance treatment for Efeonce systems serving users in Chile, Brasil, México, Perú, and adjacent LATAM markets. The skill loads this when the overlay is active and surfaces compliance gaps in self-critique.
>
> See `references/07-security-compliance.md` for the universal security baseline. This file layers regional specifics on top.

## The 2026 LATAM compliance landscape

LATAM data protection law has matured rapidly through 2024-2026. Chile, Brasil, México, and Argentina now have GDPR-style frameworks with significant fines and supervisory authorities. Treating LATAM data with EU-grade care is now table stakes — the era of "lighter LATAM treatment" is over.

## Ley 21.719 (Chile)

Chile's modern data protection law. **Critical for Efeonce given Santiago HQ and Chilean operations.**

### Status (as of 2026-05-08)

- Law in force: 2024-2025 (text and core obligations)
- **Implementation phasing through 2026-2027** — supervisory authority issuing detailed rules; some sanction regimes coming online progressively
- Supervisory authority: **Agencia de Protección de Datos Personales** (created by the law)

### Key obligations

- **Legal basis required for all processing**: consent, contract, legitimate interest, legal obligation, vital interest, public interest
- **Data subject rights**: access, rectification, deletion, portability, opposition, withdrawal of consent
- **DPO (Delegado de Protección de Datos)** required for systematic large-scale processing
- **Cross-border transfer rules**: adequacy or specific safeguards (similar to GDPR Standard Contractual Clauses)
- **Significant fines**: up to 4% of revenue (similar order of magnitude to GDPR)
- **Breach notification**: to the Agencia and to data subjects when there's significant risk

### Architectural implications for Efeonce

#### For Greenhouse

- HR data (Chilean employees and contractors) is in scope. The HRIS module must support: data subject access requests, rectification flow, deletion with retention windows, audit log of personal data accesses.
- Contracts data (`indefinido`, `plazo_fijo`, `honorarios`, etc.) contains personal data — classified as restricted.
- Payroll data is restricted. Access controls + audit log mandatory.
- Cross-border transfer: if any HR data goes to non-Chilean jurisdictions (e.g., Deel for international contractors), document the basis (typically contract execution + appropriate safeguards).

#### For Kortex

- Client data (HubSpot portals managed by agencies) frequently contains Chilean and other LATAM PII.
- Agency tenants are the data controllers (typically); Efeonce/Kortex is the processor. Document this in DPA.
- Multi-portal architecture means data from different agencies is segregated — this is itself a Ley 21.719 control.

#### For Efeonce Web

- Public site has analytics + form submissions + WordPress comments.
- GA4 pseudonymized data is generally fine; explicit identifier collection (form submissions) needs basis.
- Cookie banner with granular consent (the privacy-preserving default in Claude's settings reflects this — be consistent).

#### For Verk (when launched)

- SEO/content data is generally not personal. Where it is (e.g., commenter data), apply standard treatment.
- Verk Agent generating content with input from clients may process PII; same processor obligations.

### Specific design checks

When designing systems with Chilean PII in scope:

- [ ] **Legal basis documented per processing activity** (in the privacy policy and internal records)
- [ ] **Data subject rights flow** designed: access (export), rectification (UI), deletion (with retention), portability (machine-readable export)
- [ ] **DPO designation**: who is it for the system?
- [ ] **DPA with sub-processors**: Vercel, GCP, Anthropic, Google (Vertex AI), HubSpot, Resend, Frame.io, Notion, Microsoft Entra, Deel, Nubox — each needs DPA in place
- [ ] **Cross-border transfer mechanism** documented for each sub-processor not in adequacy
- [ ] **Breach response runbook** with notification timelines (significant risk → notify Agencia + data subjects)
- [ ] **Audit log of personal data access** retained per DPO recommendation (typically 1-7 years depending on data type)
- [ ] **Encryption at rest + in transit + field-level for highly restricted** (RUTs, contracts, payroll detail)

## LGPD (Brasil)

Lei Geral de Proteção de Dados — Brazil's data protection law, in force since 2020 with full enforcement from 2021.

### Key obligations

- Largely GDPR-aligned framework
- Supervisory authority: **ANPD (Autoridade Nacional de Proteção de Dados)**
- Data subject rights similar to GDPR
- DPO (Encarregado) required
- Cross-border transfer rules
- Significant fines (up to 2% of revenue, capped at R$50M per infraction)

### Architectural implications for Efeonce

If Efeonce expands to Brasil (mentioned in user memories: "operating an ASaaS model across Chile, Colombia, México, and Perú" — Brasil currently not listed but a likely expansion):

- Same patterns as Ley 21.719 apply
- ANPD-specific notification format and timelines
- Verify sub-processor DPA covers LGPD specifically (most major vendors do)

## Mexico (LFPDPPP)

Ley Federal de Protección de Datos Personales en Posesión de los Particulares.

### Key obligations

- Older framework (2010) — less stringent than GDPR/Ley 21.719
- Supervisory authority: **INAI**
- Notice obligation prominent (Aviso de Privacidad must be displayed)
- ARCO rights (Acceso, Rectificación, Cancelación, Oposición)
- Modernization in progress through 2024-2026

### Architectural implications for Efeonce

For Mexican users:

- Aviso de Privacidad in Spanish at point of collection
- ARCO rights flow
- Generally lighter than Ley 21.719 — the GDPR-style baseline already covers most obligations

## Perú (Ley 29733)

Ley de Protección de Datos Personales — Peru.

### Key obligations

- Supervisory authority: **Autoridad Nacional de Protección de Datos Personales** under Ministerio de Justicia
- Data subject rights similar to LFPDPPP
- Registration requirement for data banks (registries) above certain thresholds

### Architectural implications for Efeonce

For Peruvian users:

- Lighter than Ley 21.719
- GDPR-style baseline + specific registration if applicable

## Cross-border data transfer within LATAM

Efeonce operates in Chile, Colombia, México, Perú. Internal data transfers across these jurisdictions need basis. Patterns:

- **Same legal entity** (operating in multiple countries): typically internal transfer fine, but document
- **Different entities (corporate group)**: intra-group agreement (Binding Corporate Rules-equivalent) recommended
- **Sub-processors in non-adequate jurisdictions**: Standard Contractual Clauses-equivalent

The current safe practice: **Standard Contractual Clauses adapted to Ley 21.719 / LGPD as appropriate** for any cross-border transfer.

## Data residency considerations

When clients ask "where does our data live?":

- **Greenhouse data**: GCP `us-east4` (PostgreSQL) and BigQuery (typically `us` multi-region). For most LATAM clients this is fine — there's no strict residency requirement in Ley 21.719 / LGPD as long as transfer mechanisms exist.
- **Kortex data**: Cloud SQL location TBD per ADR. Strong recommendation: at least one Latin American region available for enterprise tier (LATAM compliance buyers will ask).
- **Efeonce Web**: Vercel global edge. Standard.
- **AI provider data flow**: Anthropic processes via US infrastructure typically; Vertex AI per region selected. Document this in privacy notice.

## When clients ask about SOC 2

For Kortex enterprise tier specifically: SOC 2 Type II is on the roadmap (mentioned in user memories: "Some agencies will require SOC 2 Type II isolation by Q4 2026"). The architectural decisions (tiered isolation, audit logging, RBAC) must support SOC 2 controls.

The SOC 2 control areas relevant to architecture:

- **Logical access**: RBAC + MFA + audit log + access reviews
- **Change management**: PR review, deploy approvals, ADR discipline
- **System monitoring**: observability + SLOs + alert hierarchy
- **Vendor management**: sub-processor reviews, DPA in place
- **Backup and DR**: tested, documented
- **Vulnerability management**: dependency scanning, patching SLA
- **Incident response**: documented, tested

These are the same as universal best practice — SOC 2 just requires evidence collection.

## What to put in the architecture spec for LATAM compliance

When designing systems with LATAM users in scope:

- [ ] **Compliance scope explicit**: Ley 21.719 (Chile), LGPD (Brasil if applicable), LFPDPPP (México), Ley 29733 (Perú), GDPR (any EU users)
- [ ] **Data subject rights flow**: access, rectification, deletion, portability — one flow that works for all jurisdictions
- [ ] **DPO designation**: who, for which jurisdictions
- [ ] **Sub-processor list with DPA** in place
- [ ] **Cross-border transfer mechanism** documented per sub-processor
- [ ] **Data residency for sensitive data**: documented and matches client expectations
- [ ] **Audit log scope and retention** consistent with toughest applicable framework (typically Ley 21.719 + SOC 2)
- [ ] **Privacy notice / Aviso de Privacidad** drafted and reviewed with legal
- [ ] **Breach response runbook** with the right notification windows for each authority
- [ ] **For AI features**: clarity on what data is sent to LLM providers, classification, sub-processor agreement covering AI use

## Outstanding regional concerns to monitor

- **Chile**: Ley 21.719 implementation rules issued by the Agencia through 2026-2027 — re-validate every 6 months
- **Brasil**: ANPD enforcement priorities evolve; cross-border transfer guidance under refinement
- **EU AI Act**: Articles cascading into force through 2026 — applies to any Efeonce system serving EU users with AI features; relevant to Verk Agent and Kortex chat interface

The skill's research protocol (per `references/12-research-protocol.md`) should re-validate compliance assertions before producing artifacts that depend on them.
