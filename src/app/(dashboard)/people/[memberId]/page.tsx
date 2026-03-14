import PersonView from '@views/greenhouse/people/PersonView'

type Props = {
  params: Promise<{ memberId: string }>
}

const PersonPage = async ({ params }: Props) => {
  const { memberId } = await params

  return <PersonView memberId={memberId} />
}

export default PersonPage
