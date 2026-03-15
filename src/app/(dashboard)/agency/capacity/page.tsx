import { redirect } from 'next/navigation'

export default function AgencyCapacityRedirect() {
  redirect('/agency?tab=capacidad')
}
