import MemberPayrollHistory from '@views/greenhouse/payroll/MemberPayrollHistory'

type Props = {
  params: Promise<{ memberId: string }>
}

const MemberPayrollPage = async ({ params }: Props) => {
  const { memberId } = await params

  return <MemberPayrollHistory memberId={memberId} />
}

export default MemberPayrollPage
