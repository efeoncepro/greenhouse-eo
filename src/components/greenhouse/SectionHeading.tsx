'use client'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

type SectionHeadingProps = {
  title: string
  description: string
}

const SectionHeading = ({ title, description }: SectionHeadingProps) => {
  return (
    <Box>
      <Stack spacing={0.75}>
      <Typography variant='h5'>{title}</Typography>
      <Typography variant='body2' color='text.secondary'>
        {description}
      </Typography>
      </Stack>
    </Box>
  )
}

export default SectionHeading
