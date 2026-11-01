import type { BudgetState, ChallengeState, InvitationOtpStore } from './types'

/** Test/local store. Serializes and clones state so rollback and concurrent consume match SQL semantics. */
export function createMemoryInvitationOtpStore(): InvitationOtpStore {
  let challenges = new Map<string, ChallengeState>()
  let budgets = new Map<string, BudgetState>()
  let tail: Promise<void> = Promise.resolve()

  return {
    async transaction(_keys, work) {
      const previous = tail
      let release!: () => void

      tail = new Promise<void>(resolve => { release = resolve })
      await previous
      const nextChallenges = structuredClone(challenges)
      const nextBudgets = structuredClone(budgets)

      try {
        const result = await work({
          getChallenge: async key => structuredClone(nextChallenges.get(key) ?? null),
          saveChallenge: async (key, row) => { nextChallenges.set(key, structuredClone(row)) },
          getBudget: async key => structuredClone(nextBudgets.get(key) ?? null),
          saveBudget: async (key, row) => { nextBudgets.set(key, structuredClone(row)) }
        })

        challenges = nextChallenges
        budgets = nextBudgets

        return result
      } finally { release() }
    }
  }
}
