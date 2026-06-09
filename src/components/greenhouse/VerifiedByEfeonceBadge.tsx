import GreenhouseVerificationBadge from './primitives/GreenhouseVerificationBadge'

export type VerificationBadgeLocale = 'es' | 'en'

type VerifiedByEfeonceBadgeProps = {
  locale?: VerificationBadgeLocale
  size?: 'small' | 'medium'
}

const VerifiedByEfeonceBadge = ({ locale = 'es', size = 'small' }: VerifiedByEfeonceBadgeProps) => (
  <GreenhouseVerificationBadge kind='efeonce' locale={locale} size={size} />
)

export default VerifiedByEfeonceBadge
