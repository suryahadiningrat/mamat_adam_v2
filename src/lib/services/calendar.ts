import { supabase } from '@/lib/supabase'

export type CalendarItemStatus = 'draft' | 'in_progress' | 'review' | 'approved' | 'published' | 'archived'

export interface CalendarItem {
  id: string
  workspace_id: string
  campaign_id?: string | null
  title: string
  date: string // YYYY-MM-DD
  channel?: string | null
  format?: string | null
  status: CalendarItemStatus
  owner_id?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
}

export async function fetchCalendarItems(workspaceId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('calendar_items')
    .select('*')
    .eq('workspace_id', workspaceId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  if (error) {
    console.error('Error fetching calendar items:', error)
    throw error
  }
  return data as CalendarItem[]
}

export async function createCalendarItem(item: Partial<CalendarItem>) {
  const { data, error } = await supabase
    .from('calendar_items')
    .insert(item)
    .select()
    .single()

  if (error) {
    console.error('Error creating calendar item:', error)
    throw error
  }
  return data as CalendarItem
}

export async function updateCalendarItem(id: string, updates: Partial<CalendarItem>) {
  const { data, error } = await supabase
    .from('calendar_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating calendar item:', error)
    throw error
  }
  return data as CalendarItem
}
