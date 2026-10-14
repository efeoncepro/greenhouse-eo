# TASK-2035 — Scalable configuration checkpoint

Approved scope: configuration/API + contextual panel + CAPI, one final complete develop→main
release. CRO, abandonment, subscriptions and CRM outcomes remain unstarted.

## Verified foundation

- Additive migration20261014122346796 applied in the shared database using canonical wrapper, targeted filter and guard. No existing column/enum/writer removed; codegen adds five measurement tables.
- Seven policies seeded through canonical commands: six existing Forms plus actual discovery binding. No broad source activation. Real Form version IDs are opaque fver-* identifiers.
- Metadata-only lifecycle proof at12:46:31Z: source0af43497-8f46-472a-86b3-8e21be44dfa6, revision source fver-0d2aafe3-2101-4b72-9857-380387abf88a, policy34df0ae4-8874-47b3-b85c-a7ece3dd4ba4. New businessEmail mapping activated without source change. Replay, key reuse409, client403, publish-before-review409, CAS409, immutable trigger, four audited transitions and disabled-delivery denial passed. Fixture archived and surface inactive; zero provider requests, submissions, bookings or CRM contacts. Earlier failed setup fixtures were also archived.
- Vitest74 / Client27 pass; focused ESLint pass. Final global typecheck/Next build delegated to CI after local full check exceeded4GiB. No successful final global check claimed.

## GTM v2 Preview

Workspace10 based on live7; semantic diff only customTemplate30, no tags/triggers/variables/clients/transforms changes. Source hash9fc3620b08ff287c2e80dce448f34c54cfc58e4ba5cc9e1a86a2fe99e657f0de.
At12:53:11Z Test Events only: f67f2fe6-b377-48a4-bcc4-ac805942bf09 (Think Form) and
3d08deeb-2aea-4c18-aee3-ba01d424e978 (site meeting). Both ACK200/success, replay200,
consent denial400, unhashed external identity400. Both website; expected nine matching fields.
HTTP ACK is not independent Meta UI receipt; that readback remains pending at this checkpoint.
No v2 production publication or Greenhouse release yet. No fixed test code in source/tag.

## UI checkpoint

Readiness gate passes with durable source/wireframe/flow/motion. Initial local captures rejected:
server restarts, assets404/reset, incomplete fonts and overlay. They do not prove UI acceptance.
First-fold review will run on staging before exhaustive lifecycle wiring and production promotion.

## Pending closure

CI typecheck/build; first-fold and complete lifecycle UI review; authenticated API/UI readback;
GTM compatible cutover and independent Meta UI receipt; full develop→main production release,
worker/web/flags readback and final watchdog. Real commercial consented traffic and EMQ are
separate and remain pending when not observed. No new infrastructure, campaign or spend.

## Resource recovery and complete candidate

The user reported another machine freeze. Local Next repeatedly restarted at its heap limit;
a full tsc run aborted at4GiB. A normal git push also invokes .husky/pre-push → local:check,
which sets tsc max-old-space-size=8192. That push process tree was stopped; no bypass was
performed until the operator explicitly clarified authorization14/10: omit the local hook for
this work and require CI. This is a per-task exception, not a hook/policy change.

Next/local captures/full typecheck remain stopped. Commit11a33e3d5 preserves the implementation.
Canonical ancestry merge bef1e2184 takes the complete develop tree unchanged (tree8510aac2c69e1b81d18c2a2c199251578107793d); only main-specific commit was released squash PR254. Push of the
whole develop branch succeeded with the approved exception. Remote CI38569594748 and staging
dpl_BXXHuyr316dzaheL12vq7oPD4JNb started for that exact SHA. Neither constitutes acceptance or
production promotion; no production orchestrator is active at this checkpoint.

## Independent Meta UI receipt — 13:15Z

With the Site web Test Events channel actively listening, isolated Preview canaries
were received as Processed/Server/website: a7a7d449-b088-4275-9d77-d5df761bdca9 (Think Form)
and3d10f460-aa24-43e0-a70c-1de710566355 (site discovery). Expanded Events Manager rows show
all nine user-data keys: email, external ID, click ID, browser ID, first name, IP, last name,
phone and user agent. CAPI classifications retain the right source/surface; no policy controls
appear in the three custom parameters. Evidence: .captures/meta-lead-fix-2026-10-14/policy-preview-active-ui.json
and policy-v2-meta-form.png. The earlier12:53Z ACK had no independent UI receipt and is not
substituted for this evidence. UI shows root domain; HTTP envelope retains the clean submission
path. No real commercial acceptance or EMQ improvement is inferred.

## CI corrections and fixture cleanup

The first remote candidate failed lint on24 auto-fixable blank-line issues in the two CJS
measurement tests; the focused lint command had omitted CJS. The Vercel typecheck also rejected
the verifier cleanup status inactive (the source contract allows active/paused/archived).
Corrected to archived, retained all checks, and corrected the verifier to emit success only
after independent cleanup readback, closing the pool even on cleanup failure.

Independent cleanup at13:19:11Z archived the one previously active test surface and confirmed
all six initial test definitions archived. No embed key, accepted submission or active policy
was exposed. The initial12:46 lifecycle assertions passed before cleanup, but its cleanup
claim was premature; this correction supersedes that part of the initial record. A repeat
at13:20:20Z completed the full CLI successfully (policy0382d08e-2e18-413f-a8b5-bec4b7035462),
with source and surface archived. Node tests35/35 pass; no provider/business event emitted.
The final verifier includes cleanup readback in its receipt. Global CI/build must still pass.

Final verifier receipt13:21:30Z: policy8e14f7cc-c1e8-4266-bf69-579dbdbbddf2, source04e72c92-90c3-493d-9507-e03c39cd0093; every lifecycle assertion and independent source/surface cleanup readback passed, process exit0. The success receipt is now emitted after cleanup.
