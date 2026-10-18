import { isIP } from 'node:net'

import { MetaReadClient, MetaReadError, type JsonObject } from './client'
import type { MetaWritePlan } from './write-contract'

type MutationResult = { id: string; postId?: string }
type ReadBack = { verified: boolean; pending?: boolean; data: JsonObject }
type Outcome = 'not_sent' | 'rejected' | 'unknown'
type Destination = { path: string; credential: 'system' | 'page' }

export class MetaMutationError extends MetaReadError {
  readonly outcome: Outcome

  constructor(error: MetaReadError, outcome: Outcome) {
    super(error.code, error.exitCode, { httpStatus: error.httpStatus, metaCode: error.metaCode, metaSubcode: error.metaSubcode })
    this.name = 'MetaMutationError'
    this.outcome = outcome
  }
}

function object(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function matchesExpected(actual: unknown, expected: unknown): boolean {
  if (object(expected)) return object(actual) && Object.entries(expected).every(([key, value]) => matchesExpected(actual[key], value))
  if (Array.isArray(expected)) return Array.isArray(actual) && actual.length === expected.length &&
    expected.every(value => actual.some(item => matchesExpected(item, value)))
  if (typeof expected === 'number') return (typeof actual === 'number' || typeof actual === 'string') && Number(actual) === expected

return actual === expected
}

function id(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9]+(?:_[0-9]+)?$/.test(value)) throw new MetaReadError('INVALID_MUTATION_ID')

return value
}

function publicUrl(value: unknown): void {
  if (typeof value !== 'string') throw new MetaReadError('INVALID_PUBLIC_MEDIA_URL')
  let url: URL

  try { url = new URL(value) } catch { throw new MetaReadError('INVALID_PUBLIC_MEDIA_URL') }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '')
  const parts = host.split('.').map(Number)

  const privateV4 = isIP(host) === 4 && (parts[0] === 0 || parts[0] === 10 || parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) || (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) || parts[0] >= 224)

  const privateV6 = isIP(host) === 6 && (host === '::' || host === '::1' || /^(fc|fd|fe[89ab]|ff)/i.test(host) || host.startsWith('::ffff:'))

  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
      !host.includes('.') && !isIP(host) || /(^|\.)(localhost|local|internal)$/.test(host) || privateV4 || privateV6)
    throw new MetaReadError('INVALID_PUBLIC_MEDIA_URL')
}

/** Creates new objects only. There is no generic update, activation, delete, or retry method. */
export class MetaMutationClient extends MetaReadClient {
  readonly #containers = new Set<string>()

  /** Caller must first verify an own verified-container receipt and its full plan digest. */
  trustInstagramContainer(containerId: string): void {
    if (!/^\d+$/.test(containerId)) throw new MetaReadError('INVALID_MUTATION_ID')
    this.#containers.add(containerId)
  }

  private destination(plan: MetaWritePlan): Destination {
    const p = this.profile

    switch (plan.operation) {
      case 'campaign_create': return { path: '/act_' + p.adAccountId + '/campaigns', credential: 'system' }
      case 'adset_create': return { path: '/act_' + p.adAccountId + '/adsets', credential: 'system' }
      case 'creative_create': return { path: '/act_' + p.adAccountId + '/adcreatives', credential: 'system' }
      case 'ad_create': return { path: '/act_' + p.adAccountId + '/ads', credential: 'system' }
      case 'facebook_post_publish': return { path: '/' + p.pageId + '/feed', credential: 'page' }
      case 'facebook_photo_publish': return { path: '/' + p.pageId + '/photos', credential: 'page' }
      case 'instagram_container_create': return { path: '/' + p.instagramId + '/media', credential: 'page' }
      case 'instagram_publish': return { path: '/' + p.instagramId + '/media_publish', credential: 'page' }
      case 'facebook_comment_reply': return { path: '/' + id(plan.targetId) + '/comments', credential: 'page' }
      case 'instagram_comment_reply': return { path: '/' + id(plan.targetId) + '/replies', credential: 'page' }
      default: throw new MetaReadError('UNSUPPORTED_MUTATION_OPERATION')
    }
  }

  private guard(plan: MetaWritePlan): Destination {
    if (!object(plan) || !object(plan.params)) throw new MetaReadError('INVALID_WRITE_PLAN')
    const target = this.destination(plan)

    const allowed: Record<string, string[]> = {
      campaign_create: ['name', 'objective', 'special_ad_categories', 'status', 'buying_type'],
      adset_create: ['name', 'campaign_id', 'optimization_goal', 'billing_event', 'targeting', 'status',
        'daily_budget', 'lifetime_budget', 'start_time', 'end_time', 'bid_strategy', 'bid_amount', 'promoted_object', 'destination_type'],
      creative_create: ['name', 'object_story_id'],
      ad_create: ['name', 'adset_id', 'creative', 'status'],
      facebook_post_publish: ['message', 'link', 'published'],
      facebook_photo_publish: ['url', 'caption', 'published'],
      instagram_container_create: ['image_url', 'video_url', 'caption', 'alt_text', 'media_type', 'share_to_feed'],
      instagram_publish: ['creation_id'],
      facebook_comment_reply: ['message'],
      instagram_comment_reply: ['message']
    }

    if (Object.keys(plan.params).some(key => !allowed[plan.operation].includes(key))) throw new MetaReadError('UNSUPPORTED_MUTATION_PARAMETER')
    this.validateMutationParams(plan.params)
    const params = plan.params

    if (['campaign_create', 'adset_create', 'ad_create'].includes(plan.operation) && params.status !== 'PAUSED')
      throw new MetaReadError('ADS_MUST_BE_CREATED_PAUSED')
    if (plan.operation === 'campaign_create' && (!Array.isArray(params.special_ad_categories) || typeof params.objective !== 'string'))
      throw new MetaReadError('INVALID_WRITE_PLAN')

    if (plan.operation === 'adset_create') {
      const budgets = ['daily_budget', 'lifetime_budget'].filter(key => params[key] !== undefined)
      const budget = budgets.length === 1 ? String(params[budgets[0]]) : ''

      if (!/^[1-9][0-9]*$/.test(budget) || (budgets[0] === 'lifetime_budget' && !params.end_time))
        throw new MetaReadError('EXPLICIT_ADSET_BUDGET_REQUIRED')
    }

    if (plan.operation === 'ad_create' && (!object(params.creative) || Object.keys(params.creative).join(',') !== 'creative_id'))
      throw new MetaReadError('INVALID_AD_CREATIVE_REFERENCE')

    if (plan.operation === 'facebook_post_publish' || plan.operation === 'facebook_photo_publish') {
      if (params.published !== true) throw new MetaReadError('EXPLICIT_PUBLICATION_REQUIRED')
    }

    if (plan.operation === 'facebook_photo_publish') publicUrl(params.url)

    if (plan.operation === 'instagram_container_create') {
      if (params.media_type === undefined) {
        if (params.video_url !== undefined) throw new MetaReadError('INVALID_INSTAGRAM_MEDIA_TYPE')
        publicUrl(params.image_url)
      } else if (params.media_type === 'REELS') {
        if (params.image_url !== undefined) throw new MetaReadError('INVALID_INSTAGRAM_MEDIA_TYPE')
        publicUrl(params.video_url)
      } else throw new MetaReadError('INVALID_INSTAGRAM_MEDIA_TYPE')
    }

    if (plan.operation.endsWith('_comment_reply') && (typeof params.message !== 'string' || !params.message.trim()))
      throw new MetaReadError('EMPTY_REPLY')

return target
  }

  private async ownAd(idValue: unknown, type: 'campaign' | 'adset' | 'creative' | 'ad'): Promise<JsonObject> {
    const nodeId = id(idValue)

    const extra = type === 'adset' ? ',campaign_id,daily_budget,lifetime_budget,optimization_goal,billing_event,bid_strategy,promoted_object,targeting,start_time,end_time' : type === 'creative' ? ',object_story_id,effective_object_story_id'
      : type === 'ad' ? ',adset_id,creative{id}' : ',objective,daily_budget,lifetime_budget'

    const node = await this.readProof(nodeId, 'id,account_id,name' + (type === 'creative' ? '' : ',status') + extra, 'system')

    if (node.id !== nodeId || node.account_id !== this.profile.adAccountId) throw new MetaReadError('META_AD_ACCOUNT_OWNERSHIP_MISMATCH', 4)
    if (type === 'adset') await this.ownAd(node.campaign_id, 'campaign')
    if (type === 'creative') await this.ownFacebookPost(node.object_story_id ?? node.effective_object_story_id)

return node
  }

  private async ownFacebookPost(value: unknown): Promise<JsonObject> {
    const postId = id(value)

    if (!postId.startsWith(this.profile.pageId + '_')) throw new MetaReadError('META_FACEBOOK_POST_OWNERSHIP_MISMATCH', 4)
    const post = await this.readProof(postId, 'id,from{id},message,is_published,permalink_url', 'page')

    if (post.id !== postId || !object(post.from) || post.from.id !== this.profile.pageId)
      throw new MetaReadError('META_FACEBOOK_POST_OWNERSHIP_MISMATCH', 4)

return post
  }

  private async ownFacebookComment(commentId: string, postId: string): Promise<void> {
    await this.ownFacebookPost(postId)
    const seen = new Set<string>()
    let current = commentId

    for (let depth = 0; depth < 8; depth++) {
      if (seen.has(current)) throw new MetaReadError('META_COMMENT_PARENT_CYCLE', 4)
      seen.add(current)
      const comment = await this.readProof(id(current), 'id,object{id},parent{id}', 'page')

      if (comment.id !== current) throw new MetaReadError('META_COMMENT_OWNERSHIP_MISMATCH', 4)
      const objectId = object(comment.object) ? comment.object.id : undefined

      if (objectId !== undefined && objectId !== postId) throw new MetaReadError('META_COMMENT_OWNERSHIP_MISMATCH', 4)
      if (objectId === postId || object(comment.parent) && comment.parent.id === postId) return
      current = id(object(comment.parent) ? comment.parent.id : undefined)
    }

    throw new MetaReadError('META_COMMENT_OWNERSHIP_MISMATCH', 4)
  }

  private async ownInstagramComment(commentId: string, mediaId: string): Promise<void> {
    await this.inspectInstagramMedia(mediaId)
    const comment = await this.readProof(commentId, 'id,media{id}', 'page')

    if (comment.id !== commentId || !object(comment.media) || comment.media.id !== mediaId)
      throw new MetaReadError('META_COMMENT_OWNERSHIP_MISMATCH', 4)
  }

  async preflight(plan: MetaWritePlan): Promise<void> {
    const destination = this.guard(plan)

    await this.prepareMutation(plan.params, destination.credential)
    const params = plan.params

    switch (plan.operation) {
      case 'adset_create': {
        const campaign = await this.ownAd(params.campaign_id, 'campaign')

        if (Number(campaign.daily_budget ?? 0) > 0 || Number(campaign.lifetime_budget ?? 0) > 0)
          throw new MetaReadError('META_CAMPAIGN_BUDGET_CONFLICT', 4)
        break
      }

      case 'creative_create': await this.ownFacebookPost(params.object_story_id); break
      case 'ad_create':
        await this.ownAd(params.adset_id, 'adset')
        await this.ownAd(object(params.creative) ? params.creative.creative_id : undefined, 'creative')
        break
      case 'facebook_comment_reply':
        await this.ownFacebookComment(id(plan.targetId), id(plan.parentId))
        this.permitReplyPath(destination.path)
        break
      case 'instagram_comment_reply':
        await this.ownInstagramComment(id(plan.targetId), id(plan.parentId))
        this.permitReplyPath(destination.path)
        break

      case 'instagram_publish': {
        const containerId = id(params.creation_id)

        if (containerId !== plan.targetId || !this.#containers.has(containerId)) throw new MetaReadError('META_CONTAINER_PROVENANCE_REQUIRED', 4)
        const state = await this.readProof(containerId, 'id,status_code,status', 'page')

        if (state.id !== containerId || state.status_code !== 'FINISHED') throw new MetaReadError('META_CONTAINER_NOT_READY', 4)
        break
      }
    }
  }

  async submit(plan: MetaWritePlan): Promise<MutationResult> {
    try { await this.preflight(plan) } catch (error) {
      throw new MetaMutationError(error instanceof MetaReadError ? error : new MetaReadError('META_PREFLIGHT_FAILED'), 'not_sent')
    }

    const destination = this.destination(plan)

    try {
      const response = await this.postNative(destination.path, plan.params, destination.credential)

      if (typeof response.id !== 'string' || !/^[0-9]+(?:_[0-9]+)?$/.test(response.id)) throw new MetaReadError('META_MUTATION_RESULT_ID_MISSING', 5)
      if (plan.operation === 'instagram_container_create') this.#containers.add(response.id)
      const result: MutationResult = { id: response.id }

      if (response.post_id !== undefined) result.postId = id(response.post_id)

return result
    } catch (error) {
      const safe = error instanceof MetaReadError ? error : new MetaReadError('META_MUTATION_UNKNOWN', 5)
      const rejected = safe.code === 'META_API_ERROR' && safe.metaCode !== undefined && safe.httpStatus !== undefined && safe.httpStatus >= 400 && safe.httpStatus < 500
      const notSent = ['FORBIDDEN_PARAMETER', 'INVALID_PARAMS', 'INVALID_WRITE_PATH', 'INVALID_CREDENTIAL_SELECTOR', 'TOKEN_UNAVAILABLE', 'INVALID_TOKEN', 'META_PAGE_TOKEN_UNAVAILABLE'].includes(safe.code)

      throw new MetaMutationError(safe, rejected ? 'rejected' : notSent ? 'not_sent' : 'unknown')
    }
  }

  async readBack(plan: MetaWritePlan, result: MutationResult): Promise<ReadBack> {
    this.guard(plan)
    const resultId = id(result.id)
    const params = plan.params

    switch (plan.operation) {
      case 'campaign_create': {
        const node = await this.ownAd(resultId, 'campaign')


return { verified: node.status === 'PAUSED' && node.name === params.name && node.objective === params.objective, data: node }
      }

      case 'adset_create': {
        const node = await this.ownAd(resultId, 'adset')


        const keys = ['name', 'campaign_id', 'status', 'daily_budget', 'lifetime_budget', 'optimization_goal', 'billing_event', 'bid_strategy', 'promoted_object', 'targeting']
        const matches = keys.every(key => params[key] === undefined || matchesExpected(node[key], params[key]))

        const scheduleMatches = ['start_time', 'end_time'].every(key => params[key] === undefined ||
          typeof node[key] === 'string' && Date.parse(String(node[key])) === Date.parse(String(params[key])))


return { verified: node.status === 'PAUSED' && matches && scheduleMatches, data: node }
      }

      case 'creative_create': {
        const node = await this.ownAd(resultId, 'creative')


return { verified: node.object_story_id === params.object_story_id && node.name === params.name, data: node }
      }

      case 'ad_create': {
        const node = await this.ownAd(resultId, 'ad')

        await this.ownAd(node.adset_id, 'adset')
        const creativeId = object(node.creative) ? node.creative.id : undefined

        await this.ownAd(creativeId, 'creative')

return { verified: node.status === 'PAUSED' && node.adset_id === params.adset_id &&
          creativeId === (object(params.creative) ? params.creative.creative_id : undefined) && node.name === params.name, data: node }
      }

      case 'facebook_post_publish': {
        const post = await this.ownFacebookPost(resultId)


return { verified: post.is_published === true && (params.message === undefined || post.message === params.message), data: post }
      }

      case 'facebook_photo_publish': {
        const photo = await this.readProof(resultId, 'id,from{id},link,name', 'page')
        const post = result.postId ? await this.ownFacebookPost(result.postId) : undefined


return { verified: photo.id === resultId && object(photo.from) && photo.from.id === this.profile.pageId && post?.is_published === true,
          data: { photo, ...(post ? { post } : {}) } }
      }

      case 'instagram_container_create': {
        const state = await this.readProof(resultId, 'id,status_code,status', 'page')
        const verified = state.id === resultId && (state.status_code === 'FINISHED' || state.status_code === 'PUBLISHED')


return { verified, ...(state.status_code === 'IN_PROGRESS' ? { pending: true } : {}), data: state }
      }

      case 'instagram_publish': {
        const media = await this.inspectInstagramMedia(resultId)


return { verified: media.id === resultId, data: media }
      }

      case 'facebook_comment_reply': {
        await this.ownFacebookComment(id(plan.targetId), id(plan.parentId))
        const reply = await this.readProof(resultId, 'id,parent{id},message,from{id}', 'page')


return { verified: reply.id === resultId && object(reply.parent) && reply.parent.id === plan.targetId &&
          reply.message === params.message && (!object(reply.from) || reply.from.id === this.profile.pageId), data: reply }
      }

      case 'instagram_comment_reply': {
        await this.ownInstagramComment(id(plan.targetId), id(plan.parentId))
        const reply = await this.readProof(resultId, 'id,parent_id,text,from{id},media{id}', 'page')


return { verified: reply.id === resultId && reply.parent_id === plan.targetId && reply.text === params.message &&
          (!object(reply.from) || reply.from.id === this.profile.instagramId) &&
          (!object(reply.media) || reply.media.id === plan.parentId), data: reply }
      }
    }
  }
}
