import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { bulkCreateAssignments } from './postgres-evals-store'

// ── Types ──

type EligibleMemberRow = {
  member_id: string
  department_id: string | null
  reports_to_member_id: string | null
}

// ── Generator ──

/**
 * Generate eval assignments for all eligible members in a cycle.
 *
 * Steps:
 * 1. Get all active members with sufficient tenure (>= minTenureDays).
 * 2. For each eligible member:
 *    - Create a SELF assignment (member evaluates themselves).
 *    - Create a MANAGER assignment (their supervisor evaluates them), if reports_to exists.
 *    - Create PEER assignments: other members in the same department, up to 2 peers.
 * 3. Return the total count of assignments created.
 */
export async function generateAssignments(
  cycleId: string,
  minTenureDays: number
): Promise<number> {
  // Fetch eligible members: active + enough tenure
  const members = await runGreenhousePostgresQuery<EligibleMemberRow>(
    `
      SELECT
        member_id,
        department_id,
        reports_to_member_id
      FROM greenhouse_core.members
      WHERE active = true
        AND hire_date IS NOT NULL
        AND hire_date <= CURRENT_DATE - ($1 || ' days')::interval
    `,
    [minTenureDays]
  )

  if (members.length === 0) return 0

  // Index members by department for peer lookups
  const membersByDept = new Map<string, string[]>()

  for (const m of members) {
    if (m.department_id) {
      const list = membersByDept.get(m.department_id) ?? []

      list.push(m.member_id)
      membersByDept.set(m.department_id, list)
    }
  }

  // Set of eligible member IDs for quick lookup
  const eligibleSet = new Set(members.map(m => m.member_id))

  // Build all assignments
  const assignments: Array<{ evaluateeId: string; evaluatorId: string; evalType: string }> = []

  for (const member of members) {
    // Self assignment: member evaluates themselves
    assignments.push({
      evaluateeId: member.member_id,
      evaluatorId: member.member_id,
      evalType: 'self'
    })

    // Manager assignment: supervisor evaluates this member
    if (member.reports_to_member_id && eligibleSet.has(member.reports_to_member_id)) {
      assignments.push({
        evaluateeId: member.member_id,
        evaluatorId: member.reports_to_member_id,
        evalType: 'manager'
      })
    }

    // Peer assignments: up to 2 peers from the same department
    if (member.department_id) {
      const deptMembers = membersByDept.get(member.department_id) ?? []
      const peers = deptMembers.filter(id => id !== member.member_id)

      // Pick up to 2 peers (deterministic order from the query result)
      const selectedPeers = peers.slice(0, 2)

      for (const peerId of selectedPeers) {
        assignments.push({
          evaluateeId: member.member_id,
          evaluatorId: peerId,
          evalType: 'peer'
        })
      }
    }
  }

  if (assignments.length === 0) return 0

  return bulkCreateAssignments(cycleId, assignments)
}
