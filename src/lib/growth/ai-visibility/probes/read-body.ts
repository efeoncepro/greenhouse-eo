/**
 * TASK-1697 — Re-export shim. La lectura por stream con corte duro vive en
 * `@/lib/growth/site-substrate` (`read-body.ts`, movido con `git mv`). Cero lógica propia.
 */

export { readBodyWithCap, type CappedBodyRead } from '@/lib/growth/site-substrate'
