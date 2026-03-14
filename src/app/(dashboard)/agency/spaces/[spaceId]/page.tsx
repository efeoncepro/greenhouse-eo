import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

type Props = {
  params: { spaceId: string }
}

export default function AgencySpaceRedirectPage({ params }: Props) {
  redirect(`/dashboard?space=${params.spaceId}`)
}
