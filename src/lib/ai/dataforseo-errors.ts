/** Configuration failures happen before provider I/O and must not be counted as provider requests. */
export class DataForSeoConfigurationError extends Error {
  readonly code = 'provider_configuration_missing'

  constructor(missing: 'DATAFORSEO_API_LOGIN' | 'DATAFORSEO_API_PASSWORD') {
    super(`DataForSEO configuration missing: ${missing}`)
    this.name = 'DataForSeoConfigurationError'
  }
}
