// Agrega la captura read-only de GSC y GA4 del Blog de SKY (21-10-2026) en las cifras que usa el complemento.
// Entrada: .captures/pibank-peru-evidence-2026-10-21/sky-peru.json (fuera de Git; la genera
// scripts/growth/_readonly-sky-peru-evidence.ts). Salida: data.json junto a este archivo, sólo agregados.
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const dir = path.dirname(fileURLToPath(import.meta.url))
let repo = dir
while (!(await fs.stat(path.join(repo, 'package.json')).catch(() => null))) repo = path.dirname(repo)
const rawPath = path.join(repo, '.captures/pibank-peru-evidence-2026-10-21/sky-peru.json')
const rawBuf = await fs.readFile(rawPath)
const raw = JSON.parse(rawBuf.toString('utf8'))

const MONTHS = ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09']
const byMonth = rows => {
  const m = Object.fromEntries(MONTHS.map(k => [k, { clicks: 0, impressions: 0 }]))
  for (const r of rows) {
    const k = r.keys[0].slice(0, 7)
    if (m[k]) {
      m[k].clicks += r.clicks
      m[k].impressions += r.impressions
    }
  }
  return m
}
const gAll = byMonth(raw.gsc.dailyAll)
const gPe = byMonth(raw.gsc.dailyPeru)
const sum = (m, f) => MONTHS.reduce((s, k) => s + m[k][f], 0)
const ym = k => k.replace('-', '')
const ga = (rows, k) => rows.find(r => r.yearMonth === ym(k)) ?? {}
const peM = raw.ga4.peruMonthly.rows
const allM = raw.ga4.allMonthly.rows
const aiPe = Object.fromEntries(MONTHS.map(k => [k, 0]))
for (const r of raw.ga4.aiMonthlyPeru.rows) if (aiPe[`${r.yearMonth.slice(0, 4)}-${r.yearMonth.slice(4)}`] !== undefined) aiPe[`${r.yearMonth.slice(0, 4)}-${r.yearMonth.slice(4)}`] += r.sessions
const aiSrc = {}
for (const r of raw.ga4.aiMonthlyPeru.rows) aiSrc[r.sessionSource] = (aiSrc[r.sessionSource] ?? 0) + r.sessions
const aiSrcTotal = Object.values(aiSrc).reduce((a, b) => a + b, 0)
const chatgpt = aiSrc['chatgpt.com'] ?? 0
const aiCountries = raw.ga4.aiCountries12m.rows.sort((a, b) => b.sessions - a.sessions)
const aiCountriesTotal = aiCountries.reduce((s, r) => s + r.sessions, 0)
const peSessions = MONTHS.reduce((s, k) => s + (ga(peM, k).sessions ?? 0), 0)
const peEngaged = MONTHS.reduce((s, k) => s + (ga(peM, k).engagedSessions ?? 0), 0)
const peDuration = MONTHS.reduce((s, k) => s + (ga(peM, k).averageSessionDuration ?? 0) * (ga(peM, k).sessions ?? 0), 0) / peSessions
const allSessions = MONTHS.reduce((s, k) => s + (ga(allM, k).sessions ?? 0), 0)
const channels = raw.ga4.peruChannels12m.rows
const organic = channels.find(r => r.sessionDefaultChannelGroup === 'Organic Search').sessions
const channelTotal = channels.reduce((s, r) => s + r.sessions, 0)
const firstHalf = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'].reduce((s, k) => s + aiPe[k], 0) / 6
const lastQ = ['2026-07', '2026-08', '2026-09'].reduce((s, k) => s + aiPe[k], 0) / 3
const pagesWanted = {
  'sky-lanza-nueva-ruta-en-peru-lima-talara': 'lima-talara',
  'platos-tipicos-de-lima': 'platos-lima',
  'punta-sal': 'punta-sal',
  'canon-de-shucto': 'canon-shucto',
  'mejor-fecha-para-viajar-a-tarapoto': 'tarapoto',
  'trujillo-peru': 'trujillo'
}
const pages = {}
for (const r of raw.gsc.pagesPeru12m) {
  const slug = r.keys[0].replace('https://blog.skyairline.com/', '').replace(/\/$/, '')
  if (pagesWanted[slug]) pages[pagesWanted[slug]] = { slug, clicks: r.clicks, impressions: r.impressions, position: Math.round(r.position * 10) / 10 }
}
const limaQueries = raw.gsc.queriesPeruAugSep.filter(r => /platos t[ií]picos (de )?lima/.test(r.keys[0]))
const limaBest = Math.min(...limaQueries.map(r => r.position))
const cities = raw.ga4.peruCities12m.rows.filter(r => r.city !== '(not set)').sort((a, b) => b.sessions - a.sessions).slice(0, 8)

const data = {
  capturedAt: raw.capturedAt,
  rawSha256: createHash('sha256').update(rawBuf).digest('hex'),
  period: { from: '2025-10-01', to: '2026-09-30' },
  gsc: {
    aggregation: 'propiedad, dimensión fecha, datos finales',
    peru: { clicks: sum(gPe, 'clicks'), impressions: sum(gPe, 'impressions') },
    all: { clicks: sum(gAll, 'clicks'), impressions: sum(gAll, 'impressions') },
    monthly: MONTHS.map(k => ({ month: k, peruClicks: gPe[k].clicks, peruImpressions: gPe[k].impressions, allClicks: gAll[k].clicks, share: gPe[k].clicks / gAll[k].clicks })),
    pages,
    limaQueries: { count: limaQueries.length, clicks: limaQueries.reduce((s, r) => s + r.clicks, 0), bestPosition: Math.round(limaBest * 10) / 10, window: '2026-08/2026-09' }
  },
  ga4: {
    host: 'blog.skyairline.com',
    peruSessions: peSessions,
    allSessions,
    engagedRate: peEngaged / peSessions,
    avgDurationSec: Math.round(peDuration),
    organicShare: organic / channelTotal,
    ai: {
      monthlyPeru: MONTHS.map(k => ({ month: k, sessions: aiPe[k] })),
      avgJanJun: firstHalf,
      avgJulSep: lastQ,
      multiple: lastQ / firstHalf,
      chatgptShare: chatgpt / aiSrcTotal,
      peruRank: aiCountries.findIndex(r => r.country === 'Peru') + 1,
      peruShareOfBlogAi: aiCountries.find(r => r.country === 'Peru').sessions / aiCountriesTotal
    },
    cities: cities.map(r => r.city)
  }
}
if (data.gsc.peru.clicks !== 128101 || data.ga4.peruSessions !== 151884) throw Error('La captura cambió: revisar cifras antes de componer')
const ctry = raw.gsc.countries12m.sort((x, y) => y.clicks - x.clicks)
const ctryTotal = ctry.reduce((t, r) => t + r.clicks, 0)
data.gsc.countries = { first: ctry[0].keys[0], second: ctry[1].keys[0], restBelowPeru: ctryTotal - ctry[0].clicks - ctry[1].clicks < ctry[1].clicks }
if (data.gsc.countries.first !== 'chl' || data.gsc.countries.second !== 'per' || !data.gsc.countries.restBelowPeru) throw Error('Perú ya no es el segundo mercado o el resto lo supera')
if (data.ga4.ai.peruRank !== 2) throw Error('Perú ya no es el segundo país en visitas desde IA')
await fs.writeFile(path.join(dir, 'data.json'), JSON.stringify(data, null, 2) + '\n')
console.log(JSON.stringify({ peru: data.gsc.peru, share: data.gsc.peru.clicks / data.gsc.all.clicks, ga4: { ...data.ga4, ai: { ...data.ga4.ai, monthlyPeru: undefined } } }, null, 2))
