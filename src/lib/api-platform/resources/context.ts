import type { ApiPlatformRequestContext } from '@/lib/api-platform/core/context'

export const buildEcosystemContextPayload = (context: ApiPlatformRequestContext) => ({
  consumer: {
    consumerId: context.consumer.consumerId,
    publicId: context.consumer.publicId,
    sisterPlatformKey: context.consumer.sisterPlatformKey,
    consumerName: context.consumer.consumerName,
    consumerType: context.consumer.consumerType
  },
  binding: {
    bindingId: context.binding.bindingId,
    publicId: context.binding.publicId,
    sisterPlatformKey: context.binding.sisterPlatformKey,
    externalScopeType: context.binding.externalScopeType,
    externalScopeId: context.binding.externalScopeId,
    greenhouseScopeType: context.binding.greenhouseScopeType,
    organizationId: context.binding.organizationId,
    clientId: context.binding.clientId,
    spaceId: context.binding.spaceId,
    bindingStatus: context.binding.bindingStatus
  }
})
