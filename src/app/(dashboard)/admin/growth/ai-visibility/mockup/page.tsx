/**
 * TASK-1247 — Admin Review UI del AEO Grader · MOCKUP route.
 *
 * Ruta real Next.js para iterar el diseño con GVC (no es runtime aún). El shell productivo
 * saldrá fuera de `/mockup/` al conectar los readers/commands de 1244.
 */

import AdminReviewMockupView from '@/views/greenhouse/admin/growth/ai-visibility/mockup/AdminReviewMockupView'

export const dynamic = 'force-dynamic'

const AdminReviewMockupPage = () => <AdminReviewMockupView />

export default AdminReviewMockupPage
