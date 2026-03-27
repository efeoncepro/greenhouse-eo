'use client'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

interface Props {
  title: string
  subtitle: string
}

const GreetingCard = ({ title, subtitle }: Props) => {
  return (
    <Card className='relative overflow-hidden bg-primary-light dark:bg-primary-900/10'>
      <CardContent className='pt-8 pb-10 sm:pb-12 flex flex-col items-start gap-4'>
        <div className='max-w-[70%] space-y-2'>
          <Typography variant='h4' className='font-bold text-primary-main drop-shadow-sm leading-tight'>
            {title}
          </Typography>
          <Typography variant='body1' className='text-text-secondary'>
            {subtitle}
          </Typography>
        </div>

        <img
          alt='Greenhouse Welcome'
          src='/images/illustrations/characters/1.png'
          className='absolute block-end-0 inline-end-4 max-bs-[160px] sm:max-bs-[180px] object-contain drop-shadow-lg transition-transform hover:scale-105 duration-300 pointer-events-none'
        />
      </CardContent>
    </Card>
  )
}

export default GreetingCard
