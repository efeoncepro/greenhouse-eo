'use client'

import Stack from '@mui/material/Stack'

import type { AdminAccessOverview } from '@/lib/admin/get-admin-access-overview'

import UserListCards from './admin/users/UserListCards'
import UserListTable from './admin/users/UserListTable'

type Props = {
  data: AdminAccessOverview
}

const GreenhouseAdminUsers = ({ data }: Props) => {
  return (
    <Stack spacing={6}>
      <UserListCards data={data} />
      <UserListTable data={data} />
    </Stack>
  )
}

export default GreenhouseAdminUsers
