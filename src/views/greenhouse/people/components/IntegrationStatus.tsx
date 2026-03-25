import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

type IntegrationItem = {
  label: string
  linked: boolean
}

type Props = {
  items: IntegrationItem[]
}

const TOOL_LOGOS: Record<string, string> = {
  Microsoft: '/images/integrations/microsoft.svg',
  Notion: '/images/integrations/notion.svg',
  HubSpot: '/images/integrations/hubspot.svg'
}

const IntegrationStatus = ({ items }: Props) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
    {items.map(item => (
      <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {TOOL_LOGOS[item.label] ? (
          <Box
            component='img'
            src={TOOL_LOGOS[item.label]}
            alt={item.label}
            sx={{
              width: 24,
              height: 24,
              objectFit: 'contain',
              opacity: item.linked ? 1 : 0.35,
              filter: item.linked ? 'none' : 'grayscale(100%)'
            }}
          />
        ) : (
          <i
            className={item.linked ? 'tabler-circle-check-filled' : 'tabler-circle'}
            style={{
              fontSize: 18,
              color: item.linked ? 'var(--mui-palette-success-main)' : 'var(--mui-palette-text-disabled)'
            }}
          />
        )}
        <Typography variant='body2' color={item.linked ? 'text.primary' : 'text.disabled'}>
          {item.label}
        </Typography>
        <i
          className={item.linked ? 'tabler-check' : 'tabler-x'}
          style={{
            fontSize: 14,
            marginLeft: 'auto',
            color: item.linked ? 'var(--mui-palette-success-main)' : 'var(--mui-palette-text-disabled)'
          }}
        />
      </Box>
    ))}
  </Box>
)

export default IntegrationStatus
