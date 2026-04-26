export type ApiPlatformPaginationParams = {
  page: number
  pageSize: number
  offset: number
}

export type ApiPlatformPaginationMeta = {
  page: number
  pageSize: number
  total: number
  count: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  nextPage: number | null
  previousPage: number | null
}

const parsePositiveInteger = (value: string | null, fallback: number) => {
  if (!value) return fallback

  const parsed = Number(value)

  if (!Number.isFinite(parsed)) return fallback

  return Math.trunc(parsed)
}

export const parseApiPlatformPaginationParams = (
  request: Request,
  options?: {
    defaultPageSize?: number
    maxPageSize?: number
  }
): ApiPlatformPaginationParams => {
  const url = new URL(request.url)
  const defaultPageSize = options?.defaultPageSize ?? 25
  const maxPageSize = options?.maxPageSize ?? 100
  const rawPageSize = url.searchParams.get('pageSize') ?? url.searchParams.get('perPage')

  const page = Math.max(1, parsePositiveInteger(url.searchParams.get('page'), 1))
  const pageSize = Math.min(maxPageSize, Math.max(1, parsePositiveInteger(rawPageSize, defaultPageSize)))

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize
  }
}

export const buildApiPlatformPaginationMeta = ({
  page,
  pageSize,
  total,
  count
}: {
  page: number
  pageSize: number
  total: number
  count: number
}): ApiPlatformPaginationMeta => {
  const hasNextPage = page * pageSize < total
  const hasPreviousPage = page > 1

  return {
    page,
    pageSize,
    total,
    count,
    hasNextPage,
    hasPreviousPage,
    nextPage: hasNextPage ? page + 1 : null,
    previousPage: hasPreviousPage ? page - 1 : null
  }
}

export const buildApiPlatformPaginationLinkHeader = ({
  request,
  nextPage,
  previousPage
}: {
  request: Request
  nextPage: number | null
  previousPage: number | null
}) => {
  const links: string[] = []

  if (nextPage) {
    const nextUrl = new URL(request.url)

    nextUrl.searchParams.set('page', String(nextPage))
    links.push(`<${nextUrl.toString()}>; rel="next"`)
  }

  if (previousPage) {
    const previousUrl = new URL(request.url)

    previousUrl.searchParams.set('page', String(previousPage))
    links.push(`<${previousUrl.toString()}>; rel="prev"`)
  }

  return links.length > 0 ? links.join(', ') : null
}
