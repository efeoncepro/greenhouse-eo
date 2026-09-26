import { describe, expect, it } from 'vitest'

import { convertGitignorePattern, gitignoreIgnores, parseGitignore } from './gitignore-ignores.mjs'

describe('convertGitignorePattern', () => {
  it('matches a slash-free pattern at any depth', () => {
    expect(convertGitignorePattern('*.log')).toBe('**/*.log')
    expect(convertGitignorePattern('node_modules/')).toBe('**/node_modules/')
  })

  it('anchors a leading slash to the root', () => {
    expect(convertGitignorePattern('/ai-generations/**/*.png')).toBe('ai-generations/**/*.png')
  })

  it('keeps inner-slash patterns relative to the root', () => {
    expect(convertGitignorePattern('scripts/foto/.componer-cta@*.regresion.mjs')).toBe(
      'scripts/foto/.componer-cta@*.regresion.mjs'
    )
  })

  it('extends dir/** to its contents and preserves negation', () => {
    expect(convertGitignorePattern('.captures/**')).toBe('.captures/**/*')
    expect(convertGitignorePattern('!.vercel/project.json')).toBe('!.vercel/project.json')
  })

  it('escapes minimatch-only syntax that gitignore treats literally', () => {
    expect(convertGitignorePattern('a{b}.js')).toBe('**/a\\{b}.js')
  })
})

describe('parseGitignore', () => {
  it('drops comments and blank lines', () => {
    expect(parseGitignore('# comment\n\n*.tmp\r\n')).toEqual(['**/*.tmp'])
  })
})

describe('gitignoreIgnores', () => {
  it('returns an empty ignore block when the file is missing', () => {
    expect(gitignoreIgnores('/nonexistent/.gitignore')).toEqual({ name: 'greenhouse/gitignore', ignores: [] })
  })

  it('reads the repository .gitignore, including the mutant copies of the CTA harness', () => {
    const { ignores } = gitignoreIgnores(new URL('../../.gitignore', import.meta.url).pathname)

    expect(ignores).toContain('scripts/foto/.componer-cta@*.regresion.mjs')
  })
})
