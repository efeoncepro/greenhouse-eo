import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

import type { CaptureFinding, CaptureManifest } from './manifest'

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const badgeClass = (severity: CaptureFinding['severity']): string => {
  if (severity === 'error') return 'error'
  if (severity === 'warning') return 'warning'

  return 'info'
}

export const buildCaptureReportHtml = (manifest: CaptureManifest): string => {
  const findings = manifest.qualityFindings ?? []
  const assertions = manifest.assertions ?? []
  const interactions = manifest.interactions ?? []

  const frameCards = manifest.frames
    .map(frame => {
      const frameFindings = frame.qualityFindings ?? []

      const findingList = frameFindings.length
        ? `<ul>${frameFindings.map(f => `<li class="${badgeClass(f.severity)}">${escapeHtml(f.code)}: ${escapeHtml(f.message)}</li>`).join('')}</ul>`
        : '<p class="muted">Sin findings automáticos.</p>'

      return `<article class="frame">
        <div class="frame-meta">
          <strong>${frame.index}. ${escapeHtml(frame.label)}</strong>
          <span>+${frame.tMs}ms${frame.interactionName ? ` · ${escapeHtml(frame.interactionName)}` : ''}</span>
        </div>
        <img src="${escapeHtml(frame.path)}" alt="${escapeHtml(frame.label)}" loading="lazy" />
        ${frame.note ? `<p>${escapeHtml(frame.note)}</p>` : ''}
        ${findingList}
      </article>`
    })
    .join('\n')

  const findingRows = findings.length
    ? findings.map(f => `<tr><td><span class="pill ${badgeClass(f.severity)}">${f.severity}</span></td><td>${escapeHtml(f.category)}</td><td><code>${escapeHtml(f.code)}</code></td><td>${escapeHtml(f.message)}</td></tr>`).join('\n')
    : '<tr><td colspan="4" class="muted">Sin findings automáticos.</td></tr>'

  const assertionRows = assertions.length
    ? assertions.map(a => `<tr><td><span class="pill ${a.status === 'passed' ? 'ok' : 'error'}">${a.status}</span></td><td><code>${escapeHtml(a.kind)}</code></td><td>${a.selector ? escapeHtml(a.selector) : '-'}</td><td>${escapeHtml(a.reason ?? a.message ?? '')}</td></tr>`).join('\n')
    : '<tr><td colspan="4" class="muted">Sin assertions declaradas.</td></tr>'

  const interactionRows = interactions.length
    ? interactions.map(i => `<tr><td><code>${escapeHtml(i.name)}</code></td><td>${escapeHtml(i.actionKind)}</td><td>${i.endMs - i.startMs}ms</td><td>${escapeHtml(i.intent)}</td><td>${i.frameLabels.map(escapeHtml).join(', ')}</td></tr>`).join('\n')
    : '<tr><td colspan="5" class="muted">Sin interactions V2 declaradas.</td></tr>'

  const baselineDiffs = manifest.baselineDiffs ?? []

  const baselinePill = (status: string): string => {
    if (status === 'match') return 'ok'
    if (status === 'exceeded' || status === 'dimension_mismatch' || status === 'frame_missing') return 'error'

    return 'warning'
  }

  const baselineRows = baselineDiffs.length
    ? baselineDiffs
        .map(d => {
          const ratio = d.diffRatio !== undefined ? `${(d.diffRatio * 100).toFixed(2)}%` : '—'
          const budget = d.maxDiffRatio !== undefined ? `${(d.maxDiffRatio * 100).toFixed(2)}%` : d.maxChangedPixels !== undefined ? `${d.maxChangedPixels}px` : '—'
          const artifact = d.diffArtifact ? `<a href="${escapeHtml(d.diffArtifact)}">diff PNG</a>` : d.detail ? escapeHtml(d.detail) : '—'

          return `<tr><td><span class="pill ${baselinePill(d.status)}">${escapeHtml(d.status)}</span></td><td><code>${escapeHtml(d.frameLabel)}</code>${d.viewportName ? ` · ${escapeHtml(d.viewportName)}` : ''}</td><td>${ratio}</td><td>${budget}</td><td>${artifact}</td></tr>`
        })
        .join('\n')
    : `<tr><td colspan="5" class="muted">Sin contrato baseline (declarar <code>baseline.surfaceId</code> + <code>fe:capture:diff --promote</code>).</td></tr>`

  const rt = manifest.runtimeSummary
  const runtimePill = (count: number): string => (count > 0 ? 'error' : 'ok')

  const runtimeSection = rt
    ? `<div class="meta">
        <div class="panel"><strong>console.error</strong><br><span class="pill ${runtimePill(rt.consoleErrorCount)}">${rt.consoleErrorCount}</span></div>
        <div class="panel"><strong>pageerror</strong><br><span class="pill ${runtimePill(rt.pageErrorCount)}">${rt.pageErrorCount}</span></div>
        <div class="panel"><strong>hydration</strong><br><span class="pill ${rt.hydrationWarningCount > 0 ? 'warning' : 'ok'}">${rt.hydrationWarningCount}</span></div>
        <div class="panel"><strong>http 4xx/5xx</strong><br><span class="pill ${runtimePill(rt.httpFailureCount)}">${rt.httpFailureCount}</span></div>
      </div>
      ${rt.consoleErrorSamples.length || rt.pageErrorSamples.length || rt.hydrationWarningSamples.length || rt.httpFailureSamples.length
        ? `<ul>${[
            ...rt.consoleErrorSamples.map(m => `<li class="error">console.error: ${escapeHtml(m)}</li>`),
            ...rt.pageErrorSamples.map(m => `<li class="error">pageerror: ${escapeHtml(m)}</li>`),
            ...rt.hydrationWarningSamples.map(m => `<li class="warning">hydration: ${escapeHtml(m)}</li>`),
            ...rt.httpFailureSamples.map(f => `<li class="error">HTTP ${f.status} ${escapeHtml(f.resourceType)}: ${escapeHtml(f.url)}</li>`)
          ].join('')}</ul>`
        : '<p class="muted">Sin errores de consola/red detectados.</p>'}`
    : '<p class="muted">Collectors runtime no registrados.</p>'

  const perf = manifest.performanceSummary

  const perfSection = perf
    ? `<div class="meta">
        <div class="panel"><strong>DOM nodes</strong><br>${perf.domNodes}</div>
        <div class="panel"><strong>Requests</strong><br>${perf.requestCount}</div>
        <div class="panel"><strong>Transfer</strong><br>${(perf.transferBytes / 1024).toFixed(0)} KB</div>
        <div class="panel"><strong>FCP</strong><br>${perf.fcpMs !== undefined ? `${perf.fcpMs}ms` : '—'}</div>
        <div class="panel"><strong>DCL</strong><br>${perf.domContentLoadedMs !== undefined ? `${perf.domContentLoadedMs}ms` : '—'}</div>
        ${perf.jsHeapBytes !== undefined ? `<div class="panel"><strong>JS heap</strong><br>${(perf.jsHeapBytes / 1048576).toFixed(1)} MB</div>` : ''}
      </div>`
    : '<p class="muted">Sin snapshot de performance.</p>'

  // Executive summary: ¿apto para implementar o requiere iteración?
  const errorCount = findings.filter(f => f.severity === 'error').length
  const warningCount = findings.filter(f => f.severity === 'warning').length

  const verdictLabel = manifest.exitCode === 1 || errorCount > 0
    ? 'Requiere iteración'
    : warningCount > 0
      ? 'Revisar antes de implementar'
      : 'Apto para implementar'

  const verdictClass = manifest.exitCode === 1 || errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'ok'
  const rubric = manifest.enterpriseRubric

  const rubricChip = rubric
    ? ` · rubric enterprise: <span class="pill ${rubric.verdict === 'pass' ? 'ok' : rubric.verdict === 'warning' ? 'warning' : 'error'}">${rubric.verdict}</span>`
    : ''

  const summarySection = `<div class="panel"><strong>Veredicto:</strong> <span class="pill ${verdictClass}">${verdictLabel}</span> · ${errorCount} error · ${warningCount} warning${rubricChip}</div>`

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>GVC report · ${escapeHtml(manifest.scenarioName)}</title>
  <style>
    :root { color-scheme: light; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f8f9fa; color: #1a1a2e; }
    body { margin: 0; padding: 24px; }
    header { margin-bottom: 24px; }
    h1 { margin: 0 0 8px; font-size: 1.35rem; }
    h2 { margin: 28px 0 12px; font-size: 1rem; }
    code { background: #eef2f6; border-radius: 4px; padding: 2px 5px; }
    .meta, .grid { display: grid; gap: 8px; }
    .meta { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
    .panel, .frame { background: #fff; border: 1px solid #dbdbdb; border-radius: 8px; padding: 16px; }
    .frames { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 16px; }
    .frame img { width: 100%; max-height: 480px; object-fit: contain; border: 1px solid #dbdbdb; border-radius: 6px; background: #fafbfc; }
    .frame-meta { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 10px; font-size: .875rem; }
    table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #dbdbdb; border-radius: 8px; overflow: hidden; }
    th, td { padding: 10px; border-bottom: 1px solid #eceff3; text-align: left; vertical-align: top; font-size: .875rem; }
    th { background: #fafbfc; font-size: .75rem; text-transform: uppercase; }
    .pill { display: inline-block; border-radius: 999px; padding: 2px 8px; font-size: .75rem; font-weight: 700; }
    .ok { background: #e9f8df; color: #245500; }
    .info { background: #e8f3ff; color: #024c8f; }
    .warning { background: #fff0e6; color: #9a3d00; }
    .error { background: #fbe6ee; color: #8e113c; }
    .muted { color: #667085; }
  </style>
</head>
<body>
  <header>
    <h1>Greenhouse Visual Capture report</h1>
    <div class="meta">
      <div class="panel"><strong>Scenario</strong><br><code>${escapeHtml(manifest.scenarioName)}</code></div>
      <div class="panel"><strong>Route</strong><br><code>${escapeHtml(manifest.route)}</code></div>
      <div class="panel"><strong>Env</strong><br>${escapeHtml(manifest.env)}</div>
      <div class="panel"><strong>Viewport</strong><br>${manifest.viewport.width}x${manifest.viewport.height}${manifest.viewportName ? ` · ${escapeHtml(manifest.viewportName)}` : ''}</div>
      <div class="panel"><strong>Exit</strong><br><span class="pill ${manifest.exitCode === 0 ? 'ok' : 'error'}">${manifest.exitCode}</span>${manifest.failureCategory ? ` · ${escapeHtml(manifest.failureCategory)}` : ''}</div>
      <div class="panel"><strong>Duration</strong><br>${manifest.durationMs}ms</div>
      ${manifest.outputs.trace ? `<div class="panel"><strong>Trace</strong><br><a href="${escapeHtml(manifest.outputs.trace)}">trace.zip</a><br><small class="muted">playwright show-trace</small></div>` : ''}
    </div>
  </header>

  <h2>Resumen ejecutivo</h2>
  ${summarySection}

  <h2>Readiness</h2>
  <div class="panel">
    <span class="pill ${manifest.readiness?.status === 'passed' ? 'ok' : manifest.readiness?.status === 'failed' ? 'error' : 'info'}">${manifest.readiness?.status ?? 'skipped'}</span>
    <span class="muted">${manifest.readiness?.durationMs ?? 0}ms</span>
    ${manifest.readiness?.error ? `<p class="error">${escapeHtml(manifest.readiness.error)}</p>` : ''}
  </div>

  <h2>Assertions</h2>
  <table><thead><tr><th>Status</th><th>Kind</th><th>Selector</th><th>Reason</th></tr></thead><tbody>${assertionRows}</tbody></table>

  <h2>Findings</h2>
  <table><thead><tr><th>Severity</th><th>Category</th><th>Code</th><th>Message</th></tr></thead><tbody>${findingRows}</tbody></table>

  <h2>Baseline diff</h2>
  <table><thead><tr><th>Status</th><th>Frame</th><th>Diff</th><th>Budget</th><th>Artifact</th></tr></thead><tbody>${baselineRows}</tbody></table>

  <h2>Runtime (console · page · hydration · network)</h2>
  ${runtimeSection}

  <h2>Performance (resource budgets)</h2>
  ${perfSection}

  <h2>Microinteractions</h2>
  <table><thead><tr><th>Name</th><th>Action</th><th>Segment</th><th>Intent</th><th>Frames</th></tr></thead><tbody>${interactionRows}</tbody></table>

  <h2>Frames</h2>
  <section class="frames">${frameCards || '<p class="muted">No hay frames.</p>'}</section>
</body>
</html>
`
}

export const writeCaptureReport = (dir: string, manifest: CaptureManifest): string => {
  const reportPath = join(dir, 'index.html')

  writeFileSync(reportPath, buildCaptureReportHtml(manifest), 'utf8')

  return 'index.html'
}
