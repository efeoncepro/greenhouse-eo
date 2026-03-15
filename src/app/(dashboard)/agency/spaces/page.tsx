import { redirect } from 'next/navigation'

export default function AgencySpacesRedirect() {
  redirect('/agency?tab=spaces')
}
