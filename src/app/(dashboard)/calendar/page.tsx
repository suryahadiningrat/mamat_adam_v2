'use client'

import React, { useState, useEffect } from 'react'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { CalendarItem, CalendarItemStatus, fetchCalendarItems, createCalendarItem, updateCalendarItem } from '@/lib/services/calendar'
import { ChevronLeft, ChevronRight, Plus, X, Calendar as CalendarIcon, AlignLeft } from 'lucide-react'

// Simple helper functions for dates
const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay()

export default function CalendarPage() {
  const { workspaceId } = useWorkspace()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [items, setItems] = useState<CalendarItem[]>([])
  const [loading, setLoading] = useState(true)
  
  // Drawer states
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Partial<CalendarItem> | null>(null)

  useEffect(() => {
    if (workspaceId) {
      loadMonthData(currentDate.getFullYear(), currentDate.getMonth())
    }
  }, [workspaceId, currentDate])

  const loadMonthData = async (year: number, month: number) => {
    if (!workspaceId) return
    setLoading(true)
    try {
      // Load roughly the current month
      const startDate = new Date(year, month, 1).toISOString().split('T')[0]
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]
      
      const data = await fetchCalendarItems(workspaceId, startDate, endDate)
      setItems(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handleDayClick = (day: number) => {
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day, 12).toISOString().split('T')[0]
    setSelectedItem({
      title: '',
      date: dateStr,
      status: 'draft',
      channel: 'Instagram',
      format: 'Post'
    })
    setDrawerOpen(true)
  }

  const handleItemClick = (e: React.MouseEvent, item: CalendarItem) => {
    e.stopPropagation()
    setSelectedItem(item)
    setDrawerOpen(true)
  }

  const handleSaveItem = async () => {
    if (!workspaceId || !selectedItem?.title || !selectedItem?.date) return
    
    try {
      if (selectedItem.id) {
        await updateCalendarItem(selectedItem.id, selectedItem)
      } else {
        await createCalendarItem({ ...selectedItem, workspace_id: workspaceId } as CalendarItem)
      }
      setDrawerOpen(false)
      loadMonthData(currentDate.getFullYear(), currentDate.getMonth())
    } catch (err) {
      alert("Failed to save calendar item")
    }
  }

  // Generate calendar grid
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  
  // Adjust so Monday is 0, Sunday is 6 (optional, here Sunday is 0)
  const blanks = Array.from({ length: firstDay }).map((_, i) => i)
  const days = Array.from({ length: daysInMonth }).map((_, i) => i + 1)

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'approved': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'review': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'in_progress': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      default: return 'bg-gray-800 text-gray-300 border-gray-700'
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col h-[calc(100vh-64px)]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Content Calendar</h1>
          <p className="text-gray-400 text-sm mt-1">Plan and manage your upcoming posts</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-gray-900 border border-gray-800 rounded-lg p-1">
            <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors">
              <ChevronLeft size={20} />
            </button>
            <span className="min-w-[140px] text-center font-medium text-white">{monthName}</span>
            <button onClick={handleNextMonth} className="p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>
          
          <button 
            onClick={() => handleDayClick(new Date().getDate())}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
          >
            <Plus size={18} />
            Add Post
          </button>
        </div>
      </div>

      <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex flex-col">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-gray-800 bg-gray-900/50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-3 text-center text-sm font-medium text-gray-400">
              {day}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 flex-1 auto-rows-fr">
          {blanks.map(b => (
            <div key={`blank-${b}`} className="border-b border-r border-gray-800/50 bg-gray-900/20 p-2 min-h-[120px]"></div>
          ))}
          
          {days.map(day => {
            const dateStr = new Date(year, month, day, 12).toISOString().split('T')[0]
            const dayItems = items.filter(item => item.date === dateStr)
            const isToday = new Date().toISOString().split('T')[0] === dateStr

            return (
              <div 
                key={day} 
                onClick={() => handleDayClick(day)}
                className={`border-b border-r border-gray-800 p-2 min-h-[120px] hover:bg-gray-800/30 transition-colors cursor-pointer group relative ${isToday ? 'bg-blue-900/10' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-gray-400 group-hover:text-white'}`}>
                    {day}
                  </span>
                  <Plus size={14} className="text-gray-600 opacity-0 group-hover:opacity-100" />
                </div>
                
                <div className="space-y-1.5">
                  {dayItems.map(item => (
                    <div 
                      key={item.id} 
                      onClick={(e) => handleItemClick(e, item)}
                      className={`text-xs p-1.5 rounded border ${getStatusColor(item.status)} truncate cursor-pointer hover:opacity-80 transition-opacity`}
                      title={item.title}
                    >
                      <span className="font-medium mr-1">{item.channel}</span>
                      {item.title}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Slide-out Drawer */}
      {drawerOpen && selectedItem && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setDrawerOpen(false)} />
          <div className="fixed top-0 right-0 h-full w-[450px] bg-gray-900 border-l border-gray-800 z-50 shadow-2xl flex flex-col animate-in slide-in-from-right">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white">
                {selectedItem.id ? 'Edit Post' : 'New Post'}
              </h2>
              <button onClick={() => setDrawerOpen(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Post Title</label>
                <input 
                  type="text"
                  value={selectedItem.title || ''}
                  onChange={e => setSelectedItem({...selectedItem, title: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="e.g., 3 Tips for Glowing Skin"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Date</label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input 
                      type="date" 
                      value={typeof selectedItem.date === 'string' ? selectedItem.date : selectedItem.date instanceof Date ? selectedItem.date.toISOString().split('T')[0] : ''} 
                      onChange={e => setSelectedItem({...selectedItem, date: e.target.value})} 
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" 
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
                  <select 
                    value={selectedItem.status || 'draft'}
                    onChange={e => setSelectedItem({...selectedItem, status: e.target.value as CalendarItemStatus})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="draft">Draft</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Pending Review</option>
                    <option value="approved">Approved</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Channel</label>
                  <select 
                    value={selectedItem.channel || 'Instagram'}
                    onChange={e => setSelectedItem({...selectedItem, channel: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option>Instagram</option>
                    <option>TikTok</option>
                    <option>LinkedIn</option>
                    <option>Blog</option>
                    <option>Twitter / X</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Format</label>
                  <select 
                    value={selectedItem.format || 'Post'}
                    onChange={e => setSelectedItem({...selectedItem, format: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option>Single Post</option>
                    <option>Carousel</option>
                    <option>Reel / Video</option>
                    <option>Article</option>
                  </select>
                </div>
              </div>
              
              <div className="pt-6 border-t border-gray-800">
                <button className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-medium transition-colors border border-gray-700">
                  <AlignLeft size={18} />
                  Open in AI Generator
                </button>
                <p className="text-center text-xs text-gray-500 mt-3">
                  This will take you to the content pipeline to draft this post.
                </p>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-800 bg-gray-900/80 backdrop-blur">
              <button 
                onClick={handleSaveItem}
                disabled={!selectedItem.title}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-bold transition-colors"
              >
                Save Calendar Item
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
