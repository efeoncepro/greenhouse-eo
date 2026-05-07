import { RuleTester } from 'eslint'

import rule from '../no-runtime-mockup-import.mjs'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  }
})

ruleTester.run('greenhouse/no-runtime-mockup-import', rule, {
  valid: [
    {
      code: "import SampleSprintsExperienceView from './SampleSprintsExperienceView'",
      filename: '/repo/src/views/greenhouse/agency/sample-sprints/SampleSprintsWorkspace.tsx',
      name: 'runtime imports shared shell'
    },
    {
      code: "export { default } from '../SampleSprintsExperienceView'",
      filename: '/repo/src/views/greenhouse/agency/sample-sprints/mockup/SampleSprintsMockupView.tsx',
      name: 'mockup wrapper imports shared shell'
    }
  ],
  invalid: [
    {
      code: "import MockupView from './mockup/SampleSprintsMockupView'",
      filename: '/repo/src/views/greenhouse/agency/sample-sprints/SampleSprintsWorkspace.tsx',
      errors: [{ messageId: 'runtimeMockupImport' }],
      name: 'runtime imports mockup child'
    },
    {
      code: "export { default } from '@/views/greenhouse/foo/mockup/FooMockup'",
      filename: '/repo/src/app/(dashboard)/foo/page.tsx',
      errors: [{ messageId: 'runtimeMockupImport' }],
      name: 'runtime re-exports mockup module'
    }
  ]
})
