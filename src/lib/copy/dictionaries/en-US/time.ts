import type { TimeCopy } from '../../types'

export const time: TimeCopy = {
  justNow: 'Just now',
  minutesAgo: n => (n === 1 ? '1 minute ago' : `${n} minutes ago`),
  hoursAgo: n => (n === 1 ? '1 hour ago' : `${n} hours ago`),
  daysAgo: n => (n === 1 ? '1 day ago' : `${n} days ago`),
  yesterday: 'Yesterday',
  today: 'Today',
  tomorrow: 'Tomorrow'
}
