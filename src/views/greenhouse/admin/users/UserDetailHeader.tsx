'use client'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

import { IdentityImageUploader } from '@/components/greenhouse'
import { GH_INTERNAL_MESSAGES } from '@/config/greenhouse-nomenclature'
import type { AdminUserDetail } from '@/lib/admin/get-admin-user-detail'
import { resolveAvatarPath } from '@/lib/people/resolve-avatar-path'
import { getInitials } from '@/utils/getInitials'

import { formatDateTime, statusTone, tenantTone, toTitleCase } from './helpers'

type Props = {
  data: AdminUserDetail
}

const UserDetailHeader = ({ data }: Props) => {
  const avatarSrc = data.avatarUrl
    ? `/api/media/users/${data.userId}/avatar`
    : resolveAvatarPath({ name: data.fullName, email: data.email })

  return (
    <Card>
      <div
        className='bs-[200px]'
        style={{
          background: 'linear-gradient(135deg, var(--mui-palette-primary-main) 0%, var(--mui-palette-primary-darkChannel) 50%, var(--mui-palette-info-main) 100%)',
          opacity: 0.85
        }}
      />
      <CardContent className='flex flex-col items-center justify-center gap-5 !pt-0 md:flex-row md:items-end md:justify-start'>
        <div className='flex rounded-bs-md mbs-[-40px] border-[5px] mis-[-5px] border-be-0 border-backgroundPaper bg-backgroundPaper'>
          <IdentityImageUploader
            alt={data.fullName}
            currentImageSrc={avatarSrc || undefined}
            fallback={getInitials(data.fullName)}
            uploadUrl={`/api/admin/users/${data.userId}/avatar`}
            helperText={GH_INTERNAL_MESSAGES.admin_user_detail_avatar_helper}
            successText={GH_INTERNAL_MESSAGES.admin_media_upload_success}
            errorText={GH_INTERNAL_MESSAGES.admin_media_upload_error}
            invalidTypeText={GH_INTERNAL_MESSAGES.admin_media_upload_invalid_type}
            invalidSizeText={GH_INTERNAL_MESSAGES.admin_media_upload_invalid_size}
            idleCta={GH_INTERNAL_MESSAGES.admin_media_upload_cta}
            replaceCta={GH_INTERNAL_MESSAGES.admin_media_upload_replace}
            uploadingCta={GH_INTERNAL_MESSAGES.admin_media_upload_progress}
            size={120}
            variant='rounded'
            color={tenantTone(data.tenantType)}
          />
        </div>
        <div className='flex min-w-0 flex-1 self-end flex-col items-center justify-start gap-6 sm:flex-row sm:items-end sm:justify-between sm:gap-0'>
          <div className='flex min-w-0 flex-col items-center gap-2 sm:items-start'>
            <div className='flex min-w-0 flex-wrap items-center justify-center gap-3 sm:justify-start'>
              <Typography variant='h4' sx={{ wordBreak: 'break-word' }}>
                {data.fullName}
              </Typography>
              {data.eoId && (
                <Chip size='small' variant='outlined' color='primary' label={data.eoId} sx={{ fontFamily: 'monospace', fontWeight: 700 }} />
              )}
            </div>
            <div className='flex flex-wrap justify-center gap-6 sm:justify-normal'>
              <div className='flex items-center gap-2'>
                <i className='tabler-briefcase' />
                <Typography className='font-medium'>
                  {data.jobTitle || GH_INTERNAL_MESSAGES.admin_user_detail_job_title_empty}
                </Typography>
              </div>
              <div className='flex items-center gap-2'>
                <i className='tabler-building' />
                <Typography className='font-medium'>
                  {data.client.clientName}
                </Typography>
              </div>
              <div className='flex items-center gap-2'>
                <i className='tabler-calendar' />
                <Typography className='font-medium'>
                  {data.createdAt
                    ? GH_INTERNAL_MESSAGES.admin_user_detail_member_since(formatDateTime(data.createdAt))
                    : ''}
                </Typography>
              </div>
            </div>
            <div className='flex flex-wrap gap-2 justify-center sm:justify-normal'>
              <Chip size='small' variant='tonal' color={tenantTone(data.tenantType)} label={toTitleCase(data.tenantType)} />
              <Chip size='small' variant='tonal' color={statusTone(data.status)} label={toTitleCase(data.status)} />
              <Chip size='small' variant='outlined' label={toTitleCase(data.authMode)} />
            </div>
          </div>
          <div className='flex flex-wrap justify-center gap-3 sm:justify-end'>
            <Button variant='contained' className='flex gap-2' startIcon={<i className='tabler-mail-forward' />}>
              {GH_INTERNAL_MESSAGES.admin_user_detail_resend_onboarding}
            </Button>
            <Button variant='tonal' color='warning' className='flex gap-2' startIcon={<i className='tabler-user-cancel' />}>
              {GH_INTERNAL_MESSAGES.admin_user_detail_review_access}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default UserDetailHeader
