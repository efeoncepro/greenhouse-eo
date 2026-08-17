import { afterEach, describe, expect, it } from 'vitest'

import { isCareersEditorialDetailEnabled, isHiringPublicJobPostingSchemaEnabled } from './config'

const previousEditorial = process.env.CAREERS_DETAIL_EDITORIAL_V2_ENABLED
const previousSchema = process.env.HIRING_PUBLIC_JOBPOSTING_SCHEMA_ENABLED

afterEach(() => {
  if (previousEditorial === undefined) delete process.env.CAREERS_DETAIL_EDITORIAL_V2_ENABLED
  else process.env.CAREERS_DETAIL_EDITORIAL_V2_ENABLED = previousEditorial

  if (previousSchema === undefined) delete process.env.HIRING_PUBLIC_JOBPOSTING_SCHEMA_ENABLED
  else process.env.HIRING_PUBLIC_JOBPOSTING_SCHEMA_ENABLED = previousSchema
})

describe('careers detail rollout interlock', () => {
  it('mantiene el renderer editorial apagado por defecto', () => {
    delete process.env.CAREERS_DETAIL_EDITORIAL_V2_ENABLED

    expect(isCareersEditorialDetailEnabled()).toBe(false)
  })

  it('no permite schema sin renderer editorial visible', () => {
    process.env.HIRING_PUBLIC_JOBPOSTING_SCHEMA_ENABLED = 'true'
    process.env.CAREERS_DETAIL_EDITORIAL_V2_ENABLED = 'false'

    expect(isHiringPublicJobPostingSchemaEnabled()).toBe(false)
  })

  it('permite schema sólo cuando ambos flags están activos', () => {
    process.env.HIRING_PUBLIC_JOBPOSTING_SCHEMA_ENABLED = 'true'
    process.env.CAREERS_DETAIL_EDITORIAL_V2_ENABLED = 'true'

    expect(isHiringPublicJobPostingSchemaEnabled()).toBe(true)
  })
})
