import Stack from '@mui/material/Stack'

import ModuleLayout from '@/components/capabilities/ModuleLayout'
import { ExecutiveHeroCard } from '@/components/greenhouse'
import type { CapabilityModuleData } from '@/types/capabilities'

type GreenhouseCapabilityModuleProps = {
  clientName: string
  data: CapabilityModuleData
}

const GreenhouseCapabilityModule = ({ clientName, data }: GreenhouseCapabilityModuleProps) => {
  return (
    <Stack spacing={6}>
      <ExecutiveHeroCard
        eyebrow={data.hero.eyebrow}
        title={`${clientName}: ${data.hero.title}`}
        description={data.hero.description}
        highlights={data.hero.highlights}
        summaryLabel={data.hero.summaryLabel}
        summaryValue={data.hero.summaryValue}
        summaryDetail={data.hero.summaryDetail}
        badges={data.hero.badges}
      />

      <ModuleLayout data={data} />
    </Stack>
  )
}

export default GreenhouseCapabilityModule
