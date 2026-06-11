'use client'

// TASK-1075 — tiny flat trend sparkline for the metrics ribbon (Apex sparkline mode).
import type { ApexOptions } from 'apexcharts'

import AppReactApexCharts from '@/libs/styles/AppReactApexCharts'

const PerfSparkline = ({ data, color }: { data: number[]; color: string }) => {
  const options: ApexOptions = {
    chart: { sparkline: { enabled: true }, animations: { enabled: true, speed: 500 } },
    stroke: { width: 2, curve: 'smooth', lineCap: 'round' },
    colors: [color],
    tooltip: { enabled: false },
    markers: { size: 0 }
  }

  return <AppReactApexCharts type='line' height={28} width={84} series={[{ data }]} options={options} />
}

export default PerfSparkline
