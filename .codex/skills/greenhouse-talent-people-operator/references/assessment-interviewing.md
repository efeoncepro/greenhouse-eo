# Assessment + structured interviewing (the science + the Greenhouse engine)

Load when designing or analyzing tests, interviews, scorecards, or competency evaluations. This is the core of the skill — get it right and hiring quality + fairness rise together.

## What actually predicts job performance (2026-correct)

Selection validity is measured, not opinionated. The canon and its 2022 correction:

- **Schmidt & Hunter (1998)** — 85 years of data, 19 methods: GMA r≈.51 and structured interviews r≈.51 at the top; work samples and integrity tests high; unstructured interviews, years-of-experience, and education far lower. Combining methods raises validity (GMA + work sample ≈.63; GMA + structured interview ≈.63; GMA + integrity ≈.65).
- **Sackett, Zhang, Berry & Lievens (2022)** — corrected for range restriction properly and **revised GMA down to r≈.31, with structured interviews emerging as the single strongest predictor.** The *ranking* held: **structured interviews, GMA, work samples, integrity** on top. ([SIOP](https://www.siop.org/tip-article/is-cognitive-ability-the-best-predictor-of-job-performance-new-research-says-its-time-to-think-again/))
- **Operational takeaways**:
  1. **Structure is the biggest single lever.** Same questions, same order, anchored rubric, independent scoring → validity jumps and adverse impact drops vs "gut" interviews.
  2. **Work samples** (do the actual job in miniature) are among the best and the fairest — for an agency: a real brief, a copy critique, a mini campaign plan, a code exercise, a vendor-negotiation roleplay.
  3. **Combine complementary methods** (e.g., structured interview + work sample) — incremental validity.
  4. **Avoid low-validity, high-bias methods**: unstructured interviews, graphology, "culture fit" vibes, and (now illegal in the EU) AI emotion/personality inference.

## Competency model (the backbone)

A competency = an observable, ratable capability that predicts success in the role. Design competencies on two **orthogonal** axes (this is exactly the Greenhouse engine model):

- **Category**: `attitudinal` (ownership, communication, collaboration, resilience), `aptitude` (numerical/verbal/logical reasoning), `skill` (SEO, copywriting, project management, community management, leadership, vendor management…).
- **Level**: `nociones` / `intermedio` / `avanzado`.

A role's assessment = a **composition** of competencies at target levels, weighted. Example (real Efeonce Account Manager): SEO@nociones + Copywriting@intermedio + Leadership@intermedio + Vendor@nociones + attitudinal. This is a *template* reusable per role.

## Question / method types (and how to score each)

| Type | Measures | Scoring |
|---|---|---|
| `single/multi_choice` (knowledge) | skill knowledge | objective (answer key — SENSITIVE, never shown to candidate) |
| `likert` | self-reported attitudinal | scaled; triangulate with behavior, don't over-trust self-report |
| `situational judgement (SJT)` | judgment in realistic scenarios | rubric (best/worst response), rater-scored |
| `open_text / work sample` | applied skill (the strongest signal) | **anchored rubric** + trained raters (or AI-proposed → human-confirmed) |
| `structured interview` | behavioral evidence (past behavior predicts) | behavioral anchors (BARS), independent per-competency ratings |

## Structured interview design (the highest-validity interview)

1. **Base every question on a competency + a behavioral anchor.** Prefer **behavioral** ("Tell me about a time you…") and **situational** ("What would you do if…") over hypothetical trivia.
2. **Same questions, same order, for every candidate.**
3. **Anchored rating scale (BARS)** per competency — 1..5 with concrete descriptions of what a 1, 3, 5 answer looks like. No global "gut" score.
4. **Independent scoring before discussion** — each interviewer submits their rubric *before* the debrief to avoid anchoring/groupthink.
5. **Note evidence, not impressions** — quotes and specifics, not "seemed sharp".
6. **Interviewer training** — untrained interviewers reintroduce bias; a structured guide + calibration closes most of the gap.

Use `templates/interview-guide.md` + `templates/scorecard.md`.

## Fairness, adverse impact, and defensibility (non-negotiable)

Selection touches people's livelihoods and is legally + ethically load-bearing.

- **Job-relatedness / validity**: every step must measure something the job actually needs. If you can't tie a question to a competency that predicts performance, cut it.
- **Adverse impact**: monitor selection rates across groups (e.g., 4/5ths rule as a screening heuristic); a step that filters protected groups without job-related justification is a legal + ethical problem. Structured methods + work samples reduce it; unstructured "fit" increases it.
- **No proxies for protected classes** (name, age, gender, origin, neurodivergence) — and no AI that infers them.
- **Contestability**: a candidate should be able to be told, in plain language, why. A recruiter must be able to **override** any AI output.
- **Accommodations**: offer accessible alternatives (extra time, screen-reader-friendly, format options) — WCAG 2.2 / accessible testing (compose with `a11y-architect`).

## AI in assessment — 2026 governance (this is now law, not best-practice)

Under the **EU AI Act**, recruitment/selection AI is **high-risk**; from **2 Aug 2026** it needs risk assessment, bias testing, technical documentation, transparency, **human oversight**, and monitoring. **Prohibited**: emotion recognition in interviews/video, social scoring, inferring sensitive traits from biometrics. **No fully autonomous hire/reject** — a qualified human must understand, review, and override. ([EU AI Act — staffing](https://artificialintelligenceact.eu/what-the-act-means-for-staffing-businesses/), [Fisher Phillips](https://www.fisherphillips.com/en/insights/insights/what-us-employers-need-to-know-about-ai-hiring-bias-laws-in-the-eu-and-uk))

**Therefore the only safe pattern (and the Greenhouse design):**

- AI **generates question drafts** and **proposes scores** for open/situational answers → **a human confirms**. `propose → confirm → execute`, with an **eval baseline** (measure AI↔human agreement before enabling).
- AI **never** decides, never auto-rejects, never sees/infers protected traits, never does emotion/face/voice analysis.
- Keep an **audit trail** of who scored what and any AI assistance, for contestability + AI-Act technical documentation.

## Operating the Greenhouse assessment engine

The engine (EPIC-011 / TASK-1360..1363) implements exactly the above. Map your work to it:

- **Competency catalog** (`greenhouse_hiring`, category × level) — reuse it; seed new competencies here, not ad hoc.
- **Question bank** — `answer_key`/`rubric` is **sensitive**, stored separately, **never** in the candidate-facing payload.
- **Template** — compose per role; the Account Manager template is the seed.
- **Instance** — tokenized, single-use, time-limited public link (`/assessment/[token]`); candidate takes remotely.
- **Scoring** — objective auto + human rating queue (+ AI-proposed via TASK-1361, human-confirmed).
- **Rollup** — result per competency rolls into `hiring_application.score` (advisory); the human decides. Never feeds payroll/ICO.
- **Interviewer scorecard** — the same engine records structured interview ratings (`method=interviewer_scorecard`).

Detail + invariants: `references/greenhouse-runtime.md`.

## Analyzing an interview / candidate by competencies (the "analysis" ask)

When asked to *analyze* an interview or evaluate a candidate:

1. Map evidence to the **competency scorecard** (per-competency, with quotes/specifics).
2. Rate against the **anchored scale**, not overall vibe.
3. Flag **missing evidence** (what wasn't tested) rather than inventing it.
4. Note **bias risks** (halo/horns, similarity bias, recency, anchoring) you observed.
5. Output a **recommendation with a confidence + rationale**, explicitly **advisory** — the human hiring manager decides. Never output "reject/hire" as a verdict.

## Sources

- SIOP — "Is cognitive ability the best predictor…" (Sackett et al. 2022 revision): https://www.siop.org/tip-article/is-cognitive-ability-the-best-predictor-of-job-performance-new-research-says-its-time-to-think-again/
- Schmidt & Oh (2016), 100 years of validity research (PDF): https://home.ubalt.edu/tmitch/645/session%204/Schmidt%20&%20Oh%20validity%20and%20util%20100%20yrs%20of%20research%20Wk%20PPR%202016.pdf
- EU AI Act — staffing/HR high-risk: https://artificialintelligenceact.eu/what-the-act-means-for-staffing-businesses/
- Fisher Phillips — AI hiring bias laws EU/UK: https://www.fisherphillips.com/en/insights/insights/what-us-employers-need-to-know-about-ai-hiring-bias-laws-in-the-eu-and-uk
