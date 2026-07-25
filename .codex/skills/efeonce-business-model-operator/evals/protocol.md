# Business model eval protocol

1. Freeze the scenario and repository snapshot.
2. Run the skill with routed sources only.
3. Score all criteria as pass/fail.
4. Any critical hard-fail fails the scenario.
5. Record artifacts, routes, unsupported claims, missing data and context cost.
6. Re-run after changes to pricing, revenue taxonomy, gates or routing.

Release bar: 100% hard-fail protection and at least 90% required-behavior pass rate.
