import 'server-only'

import type { TenantContext } from '@/lib/tenant/get-tenant-context'

import { getGoogleGenAIClient, getGreenhouseAgentModel, getGreenhouseAgentRuntimeConfig } from '@/lib/ai/google-genai'

export type GreenhouseAgentMode = 'plan' | 'pair' | 'review' | 'implement'

export interface GreenhouseAgentInput {
  mode: GreenhouseAgentMode
  prompt: string
  surface?: string
  routePath?: string
  existingFiles?: string[]
  notes?: string[]
}

const MODE_GUIDANCE: Record<GreenhouseAgentMode, string> = {
  plan:
    'Return an implementation-ready recommendation. Prioritize hierarchy, pattern choice, file placement, naming, and guardrails.',
  pair:
    'Act as a pairing partner. Return the single next best move, why it comes next, what to reuse, and what to defer.',
  review:
    'Review the request critically. Findings first, ordered by severity. Focus on UX clarity, hierarchy, Vuexy fit, naming, accessibility, and missing states.',
  implement:
    'Return implementation guidance that can be turned into code directly. Keep it concrete, scoped, and aligned with the current repo structure.'
}

const normalizeList = (values?: string[]) =>
  (values || [])
    .map(value => value.trim())
    .filter(Boolean)
    .slice(0, 8)

const buildAgentPrompt = (input: GreenhouseAgentInput, tenant: TenantContext) => {
  const files = normalizeList(input.existingFiles)
  const notes = normalizeList(input.notes)
  const { projectId, location, model } = getGreenhouseAgentRuntimeConfig()

  return [
    'You are Greenhouse Agent, the main frontend specialist for this repo.',
    'You are an expert in Next.js App Router, Vuexy, MUI, Greenhouse nomenclature, and rich B2B portal UX.',
    'Treat Greenhouse client nomenclature as the source of truth for client-facing routes, but do not accidentally apply it to internal/admin surfaces.',
    'Respect Vuexy extension boundaries. Do not invent a parallel theme. Prefer local shared primitives before porting from full-version.',
    'For client-facing data surfaces, favor functional labels over metaphor. For experience layers, Greenhouse branding is allowed.',
    'Always account for loading, empty, warning, partial, and error states. Never rely on color alone for status.',
    '',
    `Mode: ${input.mode}`,
    MODE_GUIDANCE[input.mode],
    '',
    'Current repo runtime context:',
    `- Stack: Next.js App Router + Vuexy + MUI`,
    `- Vertex AI project: ${projectId}`,
    `- Vertex AI location: ${location}`,
    `- Requested model: ${model}`,
    '',
    'Authenticated operator context:',
    `- Tenant type: ${tenant.tenantType}`,
    `- Client: ${tenant.clientName} (${tenant.clientId})`,
    `- Primary role: ${tenant.primaryRoleCode}`,
    `- Route groups: ${tenant.routeGroups.join(', ') || 'none'}`,
    '',
    'Task context:',
    `- Surface: ${input.surface || 'unspecified'}`,
    `- Route path: ${input.routePath || 'unspecified'}`,
    files.length ? `- Existing files: ${files.join(', ')}` : '- Existing files: none provided',
    notes.length ? `- Notes: ${notes.join(' | ')}` : '- Notes: none provided',
    '',
    'User request:',
    input.prompt.trim(),
    '',
    'Response rules:',
    '- Be concise and implementation-oriented.',
    '- Tie recommendations to UX and framework fit, not taste alone.',
    '- If you identify risks or missing information, say so plainly.',
    '- For review mode, findings must come first.',
    '- Mention specific target files or component boundaries when useful.'
  ].join('\n')
}

export const isGreenhouseAgentMode = (value: string): value is GreenhouseAgentMode => {
  return value === 'plan' || value === 'pair' || value === 'review' || value === 'implement'
}

export const runGreenhouseAgent = async (input: GreenhouseAgentInput, tenant: TenantContext) => {
  const client = await getGoogleGenAIClient()

  const response = await client.models.generateContent({
    model: getGreenhouseAgentModel(),
    contents: buildAgentPrompt(input, tenant),
    config: {
      temperature: input.mode === 'review' ? 0.1 : 0.25
    }
  })

  const text = response.text?.trim()

  if (!text) {
    throw new Error('Greenhouse Agent returned an empty response')
  }

  return {
    model: getGreenhouseAgentModel(),
    text
  }
}
