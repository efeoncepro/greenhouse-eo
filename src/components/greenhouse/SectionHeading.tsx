'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

type SectionHeadingProps = {
  title: string
  description: string
}

const SectionHeading = ({ title, description }: SectionHeadingProps) => {
  return (
    <Box>
      <Typography variant='h5'>{title}</Typography>
      <Typography color='text.secondary'>{description}</Typography>
    </Box>
  )
}

export default SectionHeading
