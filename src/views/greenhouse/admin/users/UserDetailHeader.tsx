'use client'

import { useState } from 'react'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import { toast } from 'react-toastify'

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
  const [resending, setResending] = useState(false)

  const avatarSrc = data.avatarUrl
    ? `/api/media/users/${data.userId}/avatar`
    : resolveAvatarPath({ name: data.fullName, email: data.email })

  const handleResendOnboarding = async () => {
    setResending(true)

    try {
      const response = await fetch(`/api/admin/users/${data.userId}/resend-onboarding`, { method: 'POST' })
      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || GH_INTERNAL_MESSAGES.admin_user_detail_resend_onboarding_error)

        return
      }

      toast.success(GH_INTERNAL_MESSAGES.admin_user_detail_resend_onboarding_success)
    } catch {
      toast.error(GH_INTERNAL_MESSAGES.admin_user_detail_resend_onboarding_error)
    } finally {
      setResending(false)
    }
  }

  return (
    <Card>
      <div
        className='bs-[200px]'
        style={{
          background: 'linear-gradient(135deg, var(--mui-palette-primary-main) 0%, var(--mui-palette-primary-darkChannel) 50%, var(--mui-palette-info-main) 100%)',
          opacity: 0.85
        }}
      />
      <CardContent className='flex gap-5 justify-center flex-col items-center md:items-end md:flex-row !pt-0 md:justify-start'>
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
        <div className='flex is-full justify-start self-end flex-col items-center gap-6 sm-gap-0 sm:flex-row sm:justify-between sm:items-end'>
          <div className='flex flex-col items-center sm:items-start gap-2'>
            <div className='flex items-center gap-3'>
              <Typography variant='h4'>{data.fullName}</Typography>
              {data.eoId && (
                <Chip size='small' variant='outlined' color='primary' label={data.eoId} sx={{ fontFamily: 'monospace', fontWeight: 700 }} />
              )}
            </div>
            <div className='flex flex-wrap gap-6 justify-center sm:justify-normal'>
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
          <div className='flex gap-3'>
            <Button
              variant='contained'
              className='flex gap-2'
              startIcon={resending ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-mail-forward' />}
              onClick={handleResendOnboarding}
              disabled={data.status !== 'invited' || resending}
            >
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
