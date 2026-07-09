# Job Offer Recipe — public vacancy + inbound recruiting

Use this after the intake/scorecard exists. The public offer is not the internal job brief pasted online: it is the candidate-facing landing section that attracts, qualifies and converts the right people.

## 1. Candidate promise

- Lead with why the role exists and what the person will help build.
- Name the growth path, learning surface or operating context that makes the role attractive.
- Avoid generic claims such as "great culture", "fast-paced environment" or "rockstar team" unless tied to concrete mechanisms.

## 2. Role mission

Write one sentence:

> In this role, you will [own/lead/build] [business outcome] by [core mechanism] with [team/context].

Good role missions are outcome-led, not task-led.

## 3. What success looks like

List 3 to 5 outcomes, preferably 6 to 12 month outcomes.

- Use measurable or observable results.
- Tie each outcome to business/customer/team impact.
- Do not mix every possible responsibility into this section.

## 4. What you will do

List the real work in plain language.

- Start with the highest-leverage responsibilities.
- Group similar work instead of dumping a task inventory.
- Keep bullets candidate-readable: one idea per bullet.

## 5. What you bring

Separate must-have from nice-to-have.

- Must-have = job-related competency required to succeed.
- Nice-to-have = additive signal, never a hidden filter.
- Prefer skills and demonstrated outputs over degrees or prestige markers.
- Name level honestly: `nociones`, `intermedio`, `avanzado`.

## 6. Competencies we assess

Expose the main competency signals so the process feels fair.

- 3 to 5 competencies max.
- Use short public labels: `SEO`, `Vendor management`, `Comunicación con clientes`, `Liderazgo operativo`.
- Every competency must map to an assessment step, interview question or work sample.

## 7. How the process works

Publish the candidate-facing process, not internal template names.

1. Postulas: short form, CV optional when allowed.
2. Conversamos: structured conversation around role fit and evidence.
3. Evaluación por competencias: work sample/case/interview tied to the scorecard.
4. Decisión: clear response, with respectful closure whether the candidate advances or not.

Never expose internal labels such as assessment template IDs, levels like `L2`, scorecard IDs or private hiring notes.

## 8. Compensation and location transparency

- If a band is approved for publication, show it.
- If not approved, say calmly that compensation is discussed during the process.
- Always publish location model, timezone/language needs and engagement model when they matter.
- Public modality must be a single defined label: `Remoto`, `Híbrido`, `Presencial` or an approved locale equivalent. Never publish ambiguous copy like "remoto / híbrido según acuerdo"; define it during offer creation.
- For remote roles, publish the hiring region as location: `LATAM`, `Global`, `Chile`, or the approved region.
- For hybrid roles, location is mandatory because it defines where in-person presence happens: city/country or office region. Do not publish a hybrid role without that.
- Do not invent pay ranges; finance/payroll owns numbers.

## 9. Inbound recruiting layer

Treat the vacancy as a mini funnel.

- Attract: role title, SEO-friendly keywords and employer-brand proof.
- Convert: clear CTA, low-friction apply, short requirements, transparent process.
- Nurture: talent pool/Growth Form when the role is not a fit today.
- Delight: respectful response, no ghosting, reusable candidate experience.

Inbound checklist:

- [ ] Title includes the search language candidates use, not only internal naming.
- [ ] First screen answers: role, mission, location, seniority, modality and CTA.
- [ ] Copy explains why this role is worth considering at Efeonce.
- [ ] Requirements are not a wishlist.
- [ ] Process is transparent and candidate-facing.
- [ ] Talent pool is backed by Growth Forms or Hiring command if it captures leads.
- [ ] UTM/source attribution is preserved when campaigns drive candidates.

## 10. Greenhouse publication binding

For Greenhouse public careers, the offer should become:

- `TalentDemand`: internal demand, owner, fulfillment mode, role context.
- `HiringOpening`: public title, summary, description, requirements, nice-to-have, location, modality, employment, seniority.
- Public listing: short summary + short competency chips.
- Detail page: mission, responsibilities, requirements, competencies, candidate-facing process, compensation signal.
- Apply: `POST /api/public/hiring/applications` via the public careers form.

Operational rule: create/publish through Hiring writers or the vacancy publication operator when available. Never SQL, never release per vacancy when careers runtime is already live.
