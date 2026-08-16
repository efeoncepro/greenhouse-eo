const enabled = (value: string | undefined) => value?.trim().toLowerCase() === 'true'

export const candidateReviewFlags = (env: NodeJS.ProcessEnv = process.env) => ({
  reader: enabled(env.HIRING_CANDIDATE_REVIEW_READER_ENABLED),
  projection: enabled(env.HIRING_CANDIDATE_REVIEW_PROJECTION_ENABLED)
})
