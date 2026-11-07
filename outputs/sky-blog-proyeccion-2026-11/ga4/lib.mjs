// Filtros compartidos (idénticos al fetcher de la auditoría 2026-10-23).
export const f = (fieldName, matchType, value) => ({ filter: { fieldName, stringFilter: { matchType, value, caseSensitive: false } } })
export const and = (...e) => ({ andGroup: { expressions: e } })
export const or = (...e) => ({ orGroup: { expressions: e } })
export const not = e => ({ notExpression: e })
export const scope = or(f('hostName', 'EXACT', 'blog.skyairline.com'), and(f('hostName', 'EXACT', 'www.skyairline.com'), f('pagePath', 'FULL_REGEXP', '^/blog(/.*)?$')))
export const organic = f('sessionDefaultChannelGroup', 'EXACT', 'Organic Search')
export const dims = (...n) => n.map(name => ({ name }))
export const mets = (...n) => n.map(name => ({ name }))
