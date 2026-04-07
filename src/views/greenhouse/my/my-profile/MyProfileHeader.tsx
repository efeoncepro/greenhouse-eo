'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'

import { getInitials } from '@/utils/getInitials'

type Props = {
  fullName: string
  avatarUrl: string | null
  designation: string | null
  department: string | null
  joiningDate: string | null
  bannerUrl?: string | null
}

const MyProfileHeader = ({ fullName, avatarUrl, designation, department, joiningDate, bannerUrl }: Props) => {
  return (
    <Card>
      <div
        className='bs-[200px]'
        style={{
          background: bannerUrl
            ? `url(${bannerUrl}) center/cover no-repeat`
            : 'linear-gradient(135deg, var(--mui-palette-primary-main) 0%, var(--mui-palette-primary-darkChannel) 50%, var(--mui-palette-info-main) 100%)',
          opacity: 0.85
        }}
      />
      <CardContent className='flex gap-5 justify-center flex-col items-center md:items-end md:flex-row !pt-0 md:justify-start'>
        <div className='flex rounded-bs-md mbs-[-40px] border-[5px] mis-[-5px] border-be-0 border-backgroundPaper bg-backgroundPaper'>
          {avatarUrl ? (
            <img height={120} width={120} src={avatarUrl} className='rounded' alt={fullName} />
          ) : (
            <CustomAvatar
              color='primary'
              skin='light-static'
              sx={{ width: 120, height: 120, fontSize: '2.5rem', borderRadius: 'var(--mui-shape-borderRadius)' }}
            >
              {getInitials(fullName)}
            </CustomAvatar>
          )}
        </div>
        <div className='flex is-full justify-start self-end flex-col items-center gap-6 sm-gap-0 sm:flex-row sm:justify-between sm:items-end'>
          <div className='flex flex-col items-center sm:items-start gap-2'>
            <Typography variant='h4'>{fullName}</Typography>
            <div className='flex flex-wrap gap-6 justify-center sm:justify-normal'>
              {designation && (
                <div className='flex items-center gap-2'>
                  <i className='tabler-briefcase' />
                  <Typography className='font-medium'>{designation}</Typography>
                </div>
              )}
              {department && (
                <div className='flex items-center gap-2'>
                  <i className='tabler-building' />
                  <Typography className='font-medium'>{department}</Typography>
                </div>
              )}
              {joiningDate && (
                <div className='flex items-center gap-2'>
                  <i className='tabler-calendar' />
                  <Typography className='font-medium'>Desde {joiningDate}</Typography>
                </div>
              )}
            </div>
            {designation && (
              <Chip size='small' variant='tonal' color='primary' label={designation} />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default MyProfileHeader
