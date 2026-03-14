import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

type IntegrationItem = {
  label: string
  linked: boolean
}

type Props = {
  items: IntegrationItem[]
}

const IntegrationStatus = ({ items }: Props) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
    {items.map(item => (
      <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <i
          className={item.linked ? 'tabler-circle-check-filled' : 'tabler-circle'}
          style={{
            fontSize: 16,
            color: item.linked ? 'var(--mui-palette-success-main)' : 'var(--mui-palette-text-disabled)'
          }}
        />
        <Typography variant='body2' color={item.linked ? 'text.primary' : 'text.disabled'}>
          {item.label}
        </Typography>
      </Box>
    ))}
  </Box>
)

export default IntegrationStatus
