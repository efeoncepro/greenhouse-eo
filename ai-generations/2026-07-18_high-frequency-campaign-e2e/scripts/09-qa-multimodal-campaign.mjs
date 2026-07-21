import { createHash } from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const runDir = path.join(process.cwd(), 'ai-generations', '2026-07-18_high-frequency-campaign-e2e')
const readJson = async relative => JSON.parse(await readFile(path.join(runDir, relative), 'utf8'))
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')

const staticQa = await readJson('qa/technical-qa.json')
const motionSources = await readJson('manifests/07-omni-motion-masters.json')
const motionRelease = await readJson('manifests/08-motion-release.json')
const heroRelease = await readJson('manifests/10-hero-15s-release.json')
const technicalProbe = await readJson('manifests/06-omni-off-brand-motion.json')
const staticReview = await readJson('review/review-manifest.json')
const campaign = await readJson('manifests/campaign-manifest.json')
const staticMetrics = await readJson('qa/run-metrics.json')

const checks = []
const check = (id, pass, detail) => checks.push({ id, pass, detail })

check('static-campaign', staticQa.passed === true && staticQa.technical.length === 18, `${staticQa.technical.length}/18 static assets`)
check('clean-motion-masters', motionSources.results.length === 2, `${motionSources.results.length}/2 clean Omni masters`)
check('motion-routing', motionSources.results.every(item => item.model === 'google/gemini-omni-flash/image-to-video'), 'All motion masters used exact Gemini Omni image-to-video endpoint')
check('motion-release-count', motionRelease.results.length + heroRelease.results.length === 6, `${motionRelease.results.length + heroRelease.results.length}/6 motion deliverables`)
check('motion-family-count',
  heroRelease.results.filter(item => item.kind === 'hero' && item.durationSeconds === 15).length === 2
    && motionRelease.results.filter(item => item.kind === 'master' && item.durationSeconds === 10).length === 2
    && motionRelease.results.filter(item => item.kind === 'bumper' && item.durationSeconds === 6).length === 2,
  '2 heroes 15s + 2 masters 10s + 2 bumpers 6s'
)

const measureLoudness = outputPath => {
  const result = spawnSync('ffmpeg', [
    '-hide_banner', '-nostats', '-i', outputPath,
    '-filter_complex', 'ebur128=peak=true', '-f', 'null', '-'
  ], { encoding: 'utf8' })
  if (result.status !== 0) return { integratedLufs: null, truePeakDbfs: null }
  const summary = result.stderr.slice(result.stderr.lastIndexOf('Summary:'))
  const integrated = summary.match(/I:\s+(-?[0-9.]+) LUFS/)
  const peak = summary.match(/Peak:\s+(-?[0-9.]+) dBFS/)
  return {
    integratedLufs: integrated ? Number(integrated[1]) : null,
    truePeakDbfs: peak ? Number(peak[1]) : null
  }
}

const allMotion = [...motionRelease.results, ...heroRelease.results]
const technical = []
for (const item of allMotion) {
  const outputPath = path.join(runDir, item.output)
  const posterPath = path.join(runDir, item.poster)
  const bytes = await readFile(outputPath)
  const posterBytes = await readFile(posterPath)
  const probe = JSON.parse(execFileSync('ffprobe', [
    '-v', 'error', '-show_entries',
    'stream=index,codec_name,width,height,r_frame_rate:format=duration,size,format_name',
    '-of', 'json', outputPath
  ], { encoding: 'utf8' }))
  const video = probe.streams.find(stream => stream.width)
  const audio = probe.streams.find(stream => stream.codec_name === 'aac')
  const hero = item.kind === 'hero'
  const expected = item.formatId === '9x16'
    ? { width: hero ? 1080 : 720, height: hero ? 1920 : 1280 }
    : { width: hero ? 1920 : 1280, height: hero ? 1080 : 720 }
  const actualDuration = Number(probe.format.duration)
  const loudness = measureLoudness(outputPath)
  technical.push({
    id: item.id,
    file: item.output,
    poster: item.poster,
    expectedDuration: item.durationSeconds,
    actualDuration,
    expectedDimensions: `${expected.width}x${expected.height}`,
    actualDimensions: `${video?.width}x${video?.height}`,
    videoCodec: video?.codec_name ?? null,
    audioCodec: audio?.codec_name ?? null,
    fps: video?.r_frame_rate ?? null,
    bytes: bytes.length,
    sha256: sha256(bytes),
    durationPass: Math.abs(actualDuration - item.durationSeconds) <= 0.05,
    dimensionsPass: video?.width === expected.width && video?.height === expected.height,
    videoCodecPass: video?.codec_name === 'h264',
    audioCodecPass: audio?.codec_name === 'aac',
    fpsPass: video?.r_frame_rate === '24/1',
    fastDeliveryWeightPass: bytes.length <= (hero ? 15 : 10) * 1024 * 1024,
    hashPass: sha256(bytes) === item.sha256,
    posterHashPass: sha256(posterBytes) === item.posterSha256,
    brandModePass: item.brandMode === 'brand-light',
    deterministicEndcardPass: item.deterministicEndcardSeconds === (hero ? 2.5 : 2),
    integratedLufs: loudness.integratedLufs,
    truePeakDbfs: loudness.truePeakDbfs,
    loudnessPolicy: hero ? 'target -16 LUFS' : 'measurement-only; normalize for destination before trafficking',
    loudnessMeasuredPass: loudness.integratedLufs !== null,
    peakMeasuredPass: loudness.truePeakDbfs !== null,
    loudnessTargetPass: hero ? loudness.integratedLufs >= -17 && loudness.integratedLufs <= -15 : null,
    truePeakPass: loudness.truePeakDbfs !== null && loudness.truePeakDbfs <= -1
  })
}

const motionTechnicalPass = technical.every(item => Object.entries(item)
  .filter(([key]) => key.endsWith('Pass'))
  .every(([, value]) => value !== false))
check('motion-technical', motionTechnicalPass, '6/6 motion deliverables pass codec/duration/dimensions/audio/hash/end-card/measurement gates; 15s heroes pass the -16 LUFS target')

const formatWallPass = heroRelease.results.every(item => {
  const joined = item.sourceStills.join(' ')
  return joined.includes('/4x5/') && joined.includes('/9x16/') && joined.includes('/16x9/')
})
check('format-wall', formatWallPass, 'Both 15s heroes use real release assets from 4:5 + 9:16 + 16:9')
check('hero-incremental-cost', heroRelease.results.every(item => item.generativeCostUsd === 0), '2/2 heroes add USD 0 model inference')

const timingPass = heroRelease.results.every(item => item.durationSeconds === 15 && item.deterministicEndcardSeconds === 2.5)
  && motionRelease.results.filter(item => item.kind === 'master').every(item => item.durationSeconds === 10 && item.motionSeconds === 8 && item.deterministicEndcardSeconds === 2)
  && motionRelease.results.filter(item => item.kind === 'bumper').every(item => item.durationSeconds === 6 && item.motionSeconds === 4 && item.deterministicEndcardSeconds === 2)
check('timing-edl', timingPass, 'EDL family verified: hero 15s, master 8+2s, bumper 4+2s')

const packagePath = path.join(runDir, campaign.release.package)
const packageBytes = await readFile(packagePath)
const packageHash = sha256(packageBytes)
const packageEntries = execFileSync('unzip', ['-Z1', packagePath], { encoding: 'utf8' }).split('\n').filter(Boolean)
const stillPackageCount = packageEntries.filter(entry => /^(4x5|9x16|3x1|16x9|a2|ooh-3x1)\/.*\.jpg$/.test(entry)).length
const motionPackageCount = packageEntries.filter(entry => /^motion\/.*\.mp4$/.test(entry)).length
const probePath = path.join(runDir, technicalProbe.output)
const probeInfo = JSON.parse(execFileSync('ffprobe', [
  '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', probePath
], { encoding: 'utf8' }))
const probeDuration = Number(probeInfo.format.duration)
const probeExcluded = technicalProbe.stage === 'motion-off-brand-proof'
  && !allMotion.some(item => item.output === technicalProbe.output)
  && !packageEntries.some(entry => entry.endsWith(path.basename(technicalProbe.output)))
check('technical-probe-excluded', probeExcluded && Math.abs(probeDuration - 3.008) <= 0.01, `Probe ${probeDuration.toFixed(3)}s retained outside release/package`)
check('release-package-count', stillPackageCount === 18 && motionPackageCount === 6, `${stillPackageCount}/18 stills + ${motionPackageCount}/6 motion in V3`)
check('release-package-hash', packageBytes.length === campaign.release.packageBytes && packageHash === campaign.release.packageSha256, `${packageHash} · ${packageBytes.length} bytes`)

const stillCost = staticMetrics.estimatedCostUsd.totalGenerative
const motionCost = motionSources.results.reduce((sum, item) => sum + item.estimatedProviderCostUsd, 0)
const probeCost = technicalProbe.estimatedProviderCostUsd
const releaseCost = Number((stillCost + motionCost).toFixed(4))
const experimentCost = Number((releaseCost + probeCost).toFixed(4))
check('motion-cost', motionCost === 2.08, 'USD 2.08 estimated for two 8s Omni clean masters')
check('release-cost', releaseCost === 2.965 && experimentCost === 3.355, `Release USD ${releaseCost.toFixed(4)}; experiment with probe USD ${experimentCost.toFixed(4)}`)

const fallback = campaign.motionFallback
check('seedance-fallback-rationale', fallback?.provider === 'Seedance reference-to-video' && fallback?.status === 'planned-not-invoked' && fallback?.additionalCostUsd === 0, 'Seedance fallback planned for fidelity failure; not invoked after Omni PASS')
check('human-pending', Array.isArray(campaign.humanPending) && campaign.humanPending.length >= 5, `${campaign.humanPending?.length ?? 0} explicit human/activation pending items`)

const passed = checks.every(item => item.pass)
await writeFile(
  path.join(runDir, 'qa', 'multimodal-qa.json'),
  `${JSON.stringify({
    passed,
    verdict: passed ? 'PASS creative release; human listen, destination normalization for masters/bumpers, prepress and media activation remain pending' : 'BLOCK',
    checks,
    technical,
    estimatedProviderCostUsd: {
      still: stillCost,
      omniTechnicalProbe: probeCost,
      omniReleaseMasters: motionCost,
      heroIncremental: 0,
      totalExperiment: experimentCost,
      releasePathOnly: releaseCost
    }
  }, null, 2)}\n`
)

const reproducibilityAudit = {
  stage: 'release-v3-reproducibility-audit',
  auditedAt: '2026-07-18',
  releaseInventory: {
    stills: 18,
    motion: { heroes15s: 2, masters10s: 2, bumpers6s: 2, total: 6 },
    totalAssets: 24
  },
  timingEdl: {
    document: 'brief/motion-15s-edl.md',
    hero: '7.2s motion + 1.5s M02 + 1.5s M03 + 2.3s format wall + 2.5s end card = 15.0s',
    master: '8.0s motion + 2.0s deterministic end card = 10.0s',
    bumper: '4.0s motion + 2.0s deterministic end card = 6.0s'
  },
  formatWall: {
    interval: '10.2-12.5s',
    releaseFormats: ['4x5', '9x16', '16x9'],
    deterministic: true,
    verified: formatWallPass
  },
  audioMeasurements: technical.map(item => ({
    id: item.id,
    file: item.file,
    integratedLufs: item.integratedLufs,
    peakDbfs: item.truePeakDbfs,
    policy: item.loudnessPolicy,
    measured: item.loudnessMeasuredPass && item.peakMeasuredPass
  })),
  costsUsd: {
    still: stillCost,
    omniReleaseMasters: motionCost,
    heroIncremental: 0,
    release: releaseCost,
    technicalProbeExcluded: probeCost,
    totalExperiment: experimentCost
  },
  technicalProbe: {
    file: technicalProbe.output,
    measuredDurationSeconds: probeDuration,
    releaseExcluded: probeExcluded
  },
  packageV3: {
    file: campaign.release.package,
    bytes: packageBytes.length,
    sha256: packageHash,
    manifestHashMatch: packageHash === campaign.release.packageSha256,
    stills: stillPackageCount,
    motion: motionPackageCount
  },
  fallback,
  humanPending: campaign.humanPending,
  verdict: passed ? 'PASS with human launch/prepress/audio gates pending' : 'BLOCK'
}
await writeFile(
  path.join(runDir, 'manifests', '11-reproducibility-audit.json'),
  `${JSON.stringify(reproducibilityAudit, null, 2)}\n`
)

const aggregateMetrics = {
  ...staticMetrics,
  scope: 'multimodal-release-v3',
  calls: {
    ...staticMetrics.calls,
    omniReleaseMasters: motionSources.results.length,
    technicalProbe: 1,
    releaseGenerative: staticMetrics.calls.totalGenerative + motionSources.results.length,
    experimentGenerative: staticMetrics.calls.totalGenerative + motionSources.results.length + 1
  },
  outputs: {
    territories: 3,
    anchor: 1,
    sourcePlates: 3,
    staticReleaseAssets: 18,
    motionReleaseAssets: 6,
    totalReleaseAssets: 24,
    technicalProbe: 1
  },
  estimatedCostUsd: {
    ...staticMetrics.estimatedCostUsd,
    omniReleaseMasters: motionCost,
    heroIncremental: 0,
    releasePathOnly: releaseCost,
    technicalProbeExcluded: probeCost,
    totalExperiment: experimentCost
  },
  packageV3: reproducibilityAudit.packageV3
}
await writeFile(path.join(runDir, 'qa', 'run-metrics.json'), `${JSON.stringify(aggregateMetrics, null, 2)}\n`)

const motionReview = allMotion.map((item, index) => ({
  id: `motion-${item.id}`,
  index: staticReview.length + index + 1,
  title: `${item.kind.toUpperCase()} · ${item.formatId} · ${item.durationSeconds}s`,
  src: `../${item.poster}`,
  href: `../${item.output}`,
  prompt: `Gemini Omni clean motion + deterministic M01 end card · ${item.brandMode}`
}))
await writeFile(
  path.join(runDir, 'review', 'multimodal-review-manifest.json'),
  `${JSON.stringify([...staticReview, ...motionReview], null, 2)}\n`
)

if (!passed) {
  process.stderr.write('Multimodal QA failed. See qa/multimodal-qa.json\n')
  process.exit(1)
}
process.stdout.write('Multimodal campaign QA passed · 18 stills + 6 professional motion deliverables\n')
