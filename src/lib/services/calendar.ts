export type CalendarItemStatus = 'draft' | 'in_progress' | 'review' | 'approved' | 'published' | 'archived'

export interface CalendarItem {
  id: string
  workspace_id: string
  campaign_id?: string | null
  title: string
  date: string | Date // YYYY-MM-DD or Date object
  channel?: string | null
  format?: string | null
  status: CalendarItemStatus
  owner_id?: string | null
  created_by?: string | null
  created_at: string | Date
  updated_at: string | Date
  is_topic?: boolean
  original_topic_id?: string
}

export async function fetchCalendarItems(workspaceId: string, startDate: string, endDate: string) {
  const res = await fetch(`/api/calendar?workspaceId=${workspaceId}&startDate=${startDate}&endDate=${endDate}`)
  if (!res.ok) throw new Error('Failed to fetch calendar items')
  const data = await res.json()
  return data.map((item: any) => ({
    ...item,
    date: new Date(item.date).toISOString().split('T')[0] // Format back to YYYY-MM-DD for client
  })) as CalendarItem[]
}

export async function createCalendarItem(item: Partial<CalendarItem>) {
  const res = await fetch('/api/calendar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  })
  if (!res.ok) throw new Error('Failed to create calendar item')
  return await res.json() as CalendarItem
}

export async function updateCalendarItem(id: string, updates: Partial<CalendarItem>) {
  const res = await fetch(`/api/calendar/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  })
  if (!res.ok) throw new Error('Failed to update calendar item')
  return await res.json() as CalendarItem
}
