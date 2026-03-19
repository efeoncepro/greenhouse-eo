import { Button } from '@react-email/components'

import { EMAIL_COLORS, EMAIL_FONTS } from '../constants'

interface EmailButtonProps {
  href: string
  children: React.ReactNode
}

export default function EmailButton({ href, children }: EmailButtonProps) {
  return (
    <Button
      href={href}
      style={{
        backgroundColor: EMAIL_COLORS.primary,
        color: '#FFFFFF',
        fontFamily: EMAIL_FONTS.heading,
        fontWeight: 600,
        fontSize: '15px',
        padding: '14px 36px',
        borderRadius: '8px',
        textDecoration: 'none',
        display: 'inline-block',
        textAlign: 'center' as const,
        lineHeight: '1',
        border: `1px solid ${EMAIL_COLORS.primaryHover}`,
      }}
    >
      {children}
    </Button>
  )
}
