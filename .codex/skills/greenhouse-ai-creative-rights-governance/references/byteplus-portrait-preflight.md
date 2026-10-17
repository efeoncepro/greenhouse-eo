# BytePlus ModelArk portrait preflight

Use this procedure for the local direct-media lane. Account restrictions and live status belong to
[`byteplus-directo.md`](../../../../docs/manual-de-uso/creative-studio/byteplus-directo.md#cuenta-obligatoria-antes-de-operar)
and the [account-scoped portrait ledger](../../../../docs/operations/creative-production/BYTEPLUS_VIRTUAL_PORTRAIT_LEDGER_V1.md).
Read both before operating; preserve the separation from Vision AI and Globe.

## Identity and independent gates

Verify the visible Account ID against the manual before console operations and after any login/session change.
Reconcile API owner/project and portrait ownership using metadata without revealing credentials. An active Chrome
profile or the same enterprise verification does not link two independent BytePlus accounts. Historical assets
from a different account must not be reused in production requests, migrated, deleted or re-uploaded without scope.

Record each fact separately: enterprise KYC approved, exact model activated, Entry/Advanced Creation Rights active,
assets created and literally `Active`, then a successful inference using those assets. A prior Seedance task or
working payment proves neither portrait ownership nor Asset Service readiness. The historical Asset Service error
combined different asset-owning and inference accounts; it does not establish an additional activation switch.
Entry's `Billing mode Free` concerns the portrait plan, not free Seedance generations. Do not buy resource packs,
change plans or rotate credentials to diagnose an account mismatch.

## Factual declarations and agreements

Fill KYC from verified company records and explicit user facts. For security mechanisms, traceability, incident
response or intended use, obtain the missing factual answer instead of inferring a deployed control from repo docs.
Retain the answer's attribution/date in the ledger; do not invent certification or platform integration.

Read the exact commitment letter and preserve the user's scope. If the user reserved personal signature, stop at
the letter. An explicit later instruction to sign that specific letter can supersede that reservation for that act;
record the authority, account and resulting readback. It gives no standing permission to accept future agreements,
new versions, other accounts or paid plans. Use a user-provided verification code only for its intended transaction;
never save it in docs, scripts, receipts, screenshots or commits.

## Quota and staged validation

Before any upload, read the approved batch manifest/LEEME and ledger. Upload only the approved files and exact group
names: one group per character, with the approved face and body images. Treat quota as non-recoverable; deletion is
not a recovery strategy. Read the current plan counters, then verify the actual delta after each group.

For the approved two-image pilot, upload only its face/body pair, wait for each literal `Active` state, and record
account, group ID, each `asset-…` ID, state, date and named approver in the ledger. `Warehoused`, a thumbnail, an
upload acknowledgement or `Processing` does not prove `Active`.

Run two separate Seedance 2.5 drafts at 480p and 4 seconds with the approved shot prompt:

- References: `--draft --references --image asset://<face-id> --image asset://<body-id>`.
- First frame: `--draft --image asset://<face-id>` without `--references`.

Use the full command, model, prompt path and output paths from the manual/approved task. In prompt text call the
inputs `Image 1` and `Image 2`, never their IDs. Save both outputs or sanitized failures, request/task IDs and usage
when returned. A working reference test does not prove first-frame support; report the two results separately.
Continue the remaining approved batch only after the reference test succeeds and follow its specified order.
Never infer compatibility from the Entry activation banner alone, and never repeat the historical cross-account IDs.

## Chrome upload permission failure

Observed failure: `fileChooser.setFiles` required `Allow access to file URLs`; selecting the correct PNG through the
native chooser still left `Open` disabled. This is a local upload blocker, not provider acceptance or consumption.
Inspect the actual chooser/error and list/counters before retrying; do not create empty or duplicate groups while
probing. Record file transfer, group creation, review state and inference as separate outcomes.

Use only the available documented UI/file chooser APIs and permitted paths. Do not silently broaden extension or
browser security permissions, bypass disabled controls or use another account. If the permitted upload paths fail,
leave a concrete handoff stating the required permission and pending files, with unchanged counters verified.
Evidence belongs outside the repo unless its canonical storage policy requires otherwise; link sanitized proof
from the ledger and preserve history.
