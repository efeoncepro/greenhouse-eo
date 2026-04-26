export type ApiPlatformPagination = {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export const parseApiPlatformPagination = (
  request: Request,
  options?: {
    defaultPageSize?: number
    maxPageSize?: number
  }
) => {
  const url = new URL(request.url)
  const defaultPageSize = options?.defaultPageSize ?? 25
  const maxPageSize = options?.maxPageSize ?? 100
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'))
  const pageSize = Math.min(maxPageSize, Math.max(1, Number(url.searchParams.get('pageSize') || String(defaultPageSize))))

  return { page, pageSize }
}

export const buildApiPlatformPaginationMeta = ({
  page,
  pageSize,
  total
}: {
  page: number
  pageSize: number
  total: number
}): ApiPlatformPagination => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1
  }
}
