import { POST as revealSensitivePost } from '../reveal-sensitive/route'

export const dynamic = 'force-dynamic'

export function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return revealSensitivePost(request, context)
}
