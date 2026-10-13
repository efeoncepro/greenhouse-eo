/**
 * Único predicado de «este mercado está cubierto por el contrato AEO».
 *
 * Tres caminos responden la misma pregunta y antes cada uno la escribía por su cuenta:
 *   - el chokepoint de corrida (`requestRunBatchInternal`) → rechaza con `aeo_market_not_included`;
 *   - el scheduler recurrente (`claimDueMarkets`) → decide qué mercados reclama;
 *   - el command de cadencia (`configureGraderMarketRegrade`) → decide qué se puede habilitar.
 *
 * El scheduler y el command no la respondían: reclamaban y habilitaban mercados que el
 * chokepoint iba a rechazar. Con Sky (6 mercados secundarios sin declarar) eso fue 100% de
 * corridas fallidas todos los días desde el 2026-10-03, reagendadas a +1 día cada vez.
 *
 * La regla: el mercado principal va siempre incluido; uno secundario exige tier `contracted`
 * y aparecer en `module_assignments.metadata_json.aeo_markets_included` (array de países ISO).
 * Módulo puro a propósito (sin `server-only`): lo importan SQL builders, commands y tests.
 */

export const AEO_MARKETS_INCLUDED_KEY = 'aeo_markets_included'

/** `null` = nunca se declaró. `[]` = se declaró explícitamente que no hay mercados extra. */
export const parseIncludedMarkets = (metadata: Record<string, unknown> | null | undefined): string[] | null => {
  const raw = metadata?.[AEO_MARKETS_INCLUDED_KEY]

  return Array.isArray(raw) ? raw.filter((value): value is string => typeof value === 'string') : null
}

export const isMarketCoveredByContract = (
  market: { isPrimary: boolean; marketCode: string },
  contract: { tier: string | null | undefined; marketsIncluded: readonly string[] | null | undefined }
): boolean =>
  market.isPrimary || (contract.tier === 'contracted' && Boolean(contract.marketsIncluded?.includes(market.marketCode)))

/**
 * La misma regla en SQL, para quien filtra en la base. El caller ya debe haber restringido el
 * assignment a tier `contracted` (lo hace el JOIN del scheduler): acá sólo va la pertenencia.
 * `jsonb_typeof = 'array'` no es defensivo de más: sin él, un escalar `"MX"` pasaría el `@>` y
 * el chokepoint —que exige `Array.isArray`— lo rechazaría igual, reabriendo la divergencia.
 */
export const marketCoveredByContractSql = (marketAlias: string, assignmentAlias: string): string =>
  `(${marketAlias}.is_primary OR (` +
  `jsonb_typeof(${assignmentAlias}.metadata_json->'${AEO_MARKETS_INCLUDED_KEY}')='array' ` +
  `AND ${assignmentAlias}.metadata_json->'${AEO_MARKETS_INCLUDED_KEY}' @> to_jsonb(${marketAlias}.market_code::text)))`
