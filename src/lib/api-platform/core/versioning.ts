import { ApiPlatformError } from './errors'

export const API_PLATFORM_VERSION_HEADER = 'x-greenhouse-api-version'
export const DEFAULT_API_PLATFORM_VERSION = '2026-04-25'

export const resolveApiPlatformVersion = (request: Request) => {
  const requestedVersion = request.headers.get(API_PLATFORM_VERSION_HEADER)?.trim()

  if (!requestedVersion) {
    return DEFAULT_API_PLATFORM_VERSION
  }

  if (requestedVersion !== DEFAULT_API_PLATFORM_VERSION) {
    throw new ApiPlatformError('Unsupported API version.', {
      statusCode: 400,
      errorCode: 'unsupported_api_version',
      details: {
        requestedVersion,
        supportedVersions: [DEFAULT_API_PLATFORM_VERSION]
      }
    })
  }

  return requestedVersion
}
