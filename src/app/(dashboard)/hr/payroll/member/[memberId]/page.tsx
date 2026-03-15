import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ memberId: string }>
}

export default async function PayrollMemberRedirect({ params }: Props) {
  const { memberId } = await params

  redirect(`/people/${memberId}?tab=payroll`)
}
