import 'server-only'

/**
 * Side-effect imports register handlers with `action-registry`. The endpoint at
 * `/api/teams-bot/messaging` imports this module to ensure the registry is populated
 * before dispatch.
 */

import './ops-alert-snooze'
import './notification-mark-read'
