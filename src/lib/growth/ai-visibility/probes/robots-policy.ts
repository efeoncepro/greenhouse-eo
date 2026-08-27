/**
 * TASK-1697 — Re-export shim. La política de robots.txt obedecida por el fetcher vive en
 * `@/lib/growth/site-substrate` (`robots-policy.ts`, movido con `git mv`). Cero lógica propia.
 * (El parser de MEDICIÓN de bots IA de `structural/robots-txt.ts` es otra cosa y no se mueve.)
 */

export { parseRobotsPolicy, isPathAllowed, type RobotsPolicyGroup, type RobotsPolicyRule } from '@/lib/growth/site-substrate'
