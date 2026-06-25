/**
 * TASK-1253 — Core isomórfico (browser-safe) de documentos de identidad.
 *
 * Punto de entrada compartido por:
 *  - el motor de formularios growth (server: `src/lib/growth/forms/validators`),
 *  - el renderer portable (`src/growth-forms-renderer`),
 *  - el dominio person-legal-profile (server, dedup de `computeClRutCheckDigit`).
 *
 * NUNCA agregar aquí (ni en lo que se importe) `server-only` / `node:*`.
 */
export {
  computeClRutCheckDigit,
  validateClRut,
  validateGenericNationalId,
  validateNationalIdByCountry,
  type NationalIdResult,
  type NationalIdReasonCode,
} from './national-id'
