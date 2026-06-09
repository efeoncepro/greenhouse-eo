// TASK-1024 — Workforce Contracting signature bridge (server-only; consumes EPIC-001 TASK-490/491).
export { sendContractingCaseToSignature } from './send-to-signature'
export type {
  SendContractingCaseToSignatureInput,
  SendContractingCaseToSignatureResult
} from './send-to-signature'
export { resolveContractingWorkerSigner } from './signer-resolver'
