'use client'

import { RequestDialog } from '@/components/greenhouse'

type DashboardRequestDialogProps = {
  open: boolean
  intent: string | null
  onClose: () => void
}

const DashboardRequestDialog = ({ open, intent, onClose }: DashboardRequestDialogProps) => (
  <RequestDialog open={open} intent={intent} onClose={onClose} />
)

export default DashboardRequestDialog
