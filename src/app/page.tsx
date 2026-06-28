'use client'

import { useEffect, useState } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { supabase } from '@/lib/supabase'
import { Epic, Status, Site, STATUSES, PRIORITIES, SITES } from '@/lib/types'
import Link from 'next/link'

const STATUS_COLORS: Record<Status, string> = {
  'Backlog': 'bg-gray-100 text-gray-700',
  'Selected': 'bg-blue-100 text-blue-700',
  'Requirements': 'bg-purple-100 text-purple-700',
  'Dev': 'bg-yellow-100 text-yellow-800',
  'QA': 'bg-orange-100 text-orange-700',
  'Approval': 'bg-pink-100 text-pink-700',
  'Awaiting Release': 'bg-cyan-100 text-cyan-700',
  'Done': 'bg-green-100 text-green-700',
}

const PRIORITY_COLORS: Record<string, string> = {
  'High': 'text-red-600',
  'Medium': 'text-yellow-600',
  'Low': 'text-gray-400',
}

export default function Home() {
  const [epics, setEpics] = useState<Epic[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<Status | ''>('')
  const [filterSite, setFilterSite] = useState<Site | ''>('')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newSite, setNewSite] = useState<Site | ''>('')
  const [newPriority, setNewPriority] = useState<'High' | 'Medium' | 'Low'>('Medium')

  async function loadEpics() {
    let query = supabase.from('epics').select('*').order('position').order('created_at', { ascending: false })
    if (filterStatus) query = query.eq('status', filterStatus)
    if (filterSite) query = query.eq('site', filterSite)
    if (search) query = query.ilike('title', `%${search}%`)
    const { data, error } = await query
    if (error) console.error('Failed to load epics:', error.message)
    setEpics(data || [])
    setLoading(false)
  }

  useEffect(() => { loadEpics() }, [filterStatus, filterSite, search])

  async function createEpic(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    await supabase.from('epics').insert({
      title: newTitle.trim(),
      site: newSite || null,
      priority: newPriority,
    })
    setNewTitle('')
    setNewSite('')
    setNewPriority('Medium')
    setShowCreate(false)
    loadEpics()
  }

  async function onDragEnd(result: DropResult) {
    if (!result.destination) return
    const reordered = Array.from(epics)
    const [moved] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, moved)
    setEpics(reordered)
    const updates = reordered.map((epic, i) =>
      supabase.from('epics').update({ position: i }).eq('id', epic.id)
    )
    await Promise.all(updates)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-semibold text-gray-900">Functionair PM</h1>
            <nav className="flex gap-4 text-sm">
              <span className="text-gray-900 font-medium">Epics</span>
              <Link href="/bugs" className="text-gray-500 hover:text-gray-900">Bugs</Link>
            </nav>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            + New Epic
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            placeholder="Search epics..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64"
          />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as Status | '')}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={filterSite}
            onChange={e => setFilterSite(e.target.value as Site | '')}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Sites</option>
            {SITES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {showCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <form onSubmit={createEpic} className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
              <h2 className="text-lg font-semibold mb-4">New Epic</h2>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Epic title"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  autoFocus
                />
                <div className="flex gap-3">
                  <select
                    value={newSite}
                    onChange={e => setNewSite(e.target.value as Site | '')}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1"
                  >
                    <option value="">No site</option>
                    {SITES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value as 'High' | 'Medium' | 'Low')}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1"
                  >
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Create</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : epics.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">No epics yet</p>
            <p className="text-sm">Click &quot;+ New Epic&quot; to create your first one.</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="epics">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                  {epics.map((epic, index) => (
                    <Draggable key={epic.id} draggableId={epic.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`bg-white border rounded-lg transition-all ${snapshot.isDragging ? 'border-blue-400 shadow-lg' : 'border-gray-200'}`}
                        >
                          <div className="flex items-center">
                            <div
                              {...provided.dragHandleProps}
                              className="px-3 py-4 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
                            >
                              ⠿
                            </div>
                            <Link
                              href={`/epics/${epic.id}`}
                              className="flex-1 flex items-center gap-3 px-2 py-4 pr-5 hover:bg-gray-50"
                            >
                              <span className={`text-sm font-medium ${PRIORITY_COLORS[epic.priority]}`}>
                                {epic.priority === 'High' ? '▲' : epic.priority === 'Medium' ? '■' : '▼'}
                              </span>
                              <span className="font-medium text-gray-900 flex-1">{epic.title}</span>
                              {epic.assignee_name && (
                                <span className="text-xs text-gray-500">{epic.assignee_name}</span>
                              )}
                              {epic.due_date && (
                                <span className="text-xs text-gray-400">{new Date(epic.due_date).toLocaleDateString()}</span>
                              )}
                              {epic.site && (
                                <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600">{epic.site}</span>
                              )}
                              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[epic.status]}`}>
                                {epic.status}
                              </span>
                            </Link>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </main>
    </div>
  )
}
