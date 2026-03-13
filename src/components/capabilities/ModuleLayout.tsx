import Box from '@mui/material/Box'

import CapabilityCard from '@/components/capabilities/CapabilityCard'
import type { CapabilityModuleCardSize, CapabilityModuleData } from '@/types/capabilities'

type ModuleLayoutProps = {
  data: CapabilityModuleData
}

const sizeToColumns: Record<CapabilityModuleCardSize, Record<'xs' | 'md' | 'xl', string>> = {
  sm: { xs: '1 / -1', md: 'span 4', xl: 'span 3' },
  md: { xs: '1 / -1', md: 'span 6', xl: 'span 5' },
  lg: { xs: '1 / -1', md: 'span 6', xl: 'span 7' },
  full: { xs: '1 / -1', md: '1 / -1', xl: '1 / -1' }
}

const ModuleLayout = ({ data }: ModuleLayoutProps) => (
  <Box
    sx={{
      display: 'grid',
      gap: 3,
      gridTemplateColumns: {
        xs: '1fr',
        md: 'repeat(6, minmax(0, 1fr))',
        xl: 'repeat(12, minmax(0, 1fr))'
      }
    }}
  >
    {data.module.cards.map(card => (
      <Box
        key={card.id}
        sx={{
          gridColumn: {
            xs: sizeToColumns[card.size].xs,
            md: sizeToColumns[card.size].md,
            xl: sizeToColumns[card.size].xl
          }
        }}
      >
        <CapabilityCard card={card} data={data} />
      </Box>
    ))}
  </Box>
)

export default ModuleLayout
