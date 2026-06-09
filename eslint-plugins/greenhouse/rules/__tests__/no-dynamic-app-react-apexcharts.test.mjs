import { RuleTester } from 'eslint'
import tsParser from '@typescript-eslint/parser'

import rule from '../no-dynamic-app-react-apexcharts.mjs'

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: 'module'
  }
})

ruleTester.run('greenhouse/no-dynamic-app-react-apexcharts', rule, {
  valid: [
    {
      code: "import AppReactApexCharts from '@/libs/styles/AppReactApexCharts'",
      filename: '/repo/src/views/greenhouse/home/v2/HomeRunwayStrategic.tsx',
      name: 'direct canonical wrapper import is allowed'
    },
    {
      code: "const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))",
      filename: '/repo/src/views/greenhouse/home/v2/HomeRunwayStrategic.test.tsx',
      name: 'tests are exempt'
    },
    {
      code: "const Chart = dynamic(() => import('@/components/SomeOtherClientOnlyThing'))",
      filename: '/repo/src/views/greenhouse/home/v2/HomeRunwayStrategic.tsx',
      name: 'other dynamic imports are allowed'
    }
  ],
  invalid: [
    {
      code: "const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))",
      filename: '/repo/src/views/greenhouse/home/v2/HomeRunwayStrategic.tsx',
      name: 'dynamic wrapper import without options is blocked',
      errors: 1
    },
    {
      code: "const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'), { ssr: false })",
      filename: '/repo/src/components/card-statistics/StatsWithAreaChart.tsx',
      name: 'dynamic wrapper import with ssr false is blocked',
      errors: 1
    },
    {
      code: "const loader = () => import('@/libs/styles/AppReactApexCharts')",
      filename: '/repo/src/views/greenhouse/finance/FinanceDashboardView.tsx',
      name: 'raw dynamic import of wrapper is blocked',
      errors: 1
    },
    {
      code: "import Chart from '@/libs/ApexCharts'",
      filename: '/repo/src/libs/styles/AppReactApexCharts.tsx',
      name: 'legacy ApexCharts indirection is blocked',
      errors: 1
    }
  ]
})
