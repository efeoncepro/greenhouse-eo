'use client'

import { useQuery } from '@tanstack/react-query'

import type { PeopleListPayload } from '@/types/people'
import { qk } from '@/lib/react-query'

/**
 * TASK-513 — Migration example #3.
 *
 * `/people` antes mantenia state local con useState + useEffect + useCallback
 * y un loadData() manual que el `CreateMemberDrawer` invocaba via prop.
 *
 * Con react-query:
 * - El refetch tras crear un colaborador es `queryClient.invalidateQueries({
 *   queryKey: qk.people.all })` desde el `onSuccess` del drawer; ya no
 *   necesitamos pasar `loadData` como prop.
 * - `refetchOnWindowFocus` mantiene la lista al dia cuando el usuario
 *   vuelve al tab despues de cambios externos.
 */
const fetchPeople = async (): Promise<PeopleListPayload> => {
  const res = await fetch('/api/people')

  if (!res.ok) {
    throw new Error(`Failed to fetch people: ${res.status}`)
  }

  return (await res.json()) as PeopleListPayload
}

const usePeopleList = () => {
  return useQuery({
    queryKey: qk.people.list(),
    queryFn: fetchPeople
  })
}

export default usePeopleList
