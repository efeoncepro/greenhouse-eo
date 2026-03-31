'use client'

import { useRouter } from 'next/navigation'

import Box from '@mui/material/Box'

import CreatePlacementDialog from './CreatePlacementDialog'

type Props = {
  initialAssignmentId?: string | null
}

const CreatePlacementPageView = ({ initialAssignmentId }: Props) => {
  const router = useRouter()

  return (
    <Box sx={{ py: 6 }}>
      <CreatePlacementDialog
        open
        inline
        initialAssignmentId={initialAssignmentId}
        onClose={() => router.push('/agency/staff-augmentation')}
        onCreated={placementId => router.push(`/agency/staff-augmentation/${placementId}`)}
      />
    </Box>
  )
}

export default CreatePlacementPageView
