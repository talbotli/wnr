'use client'

import { useEffect, useState } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { supabase } from '@/lib/supabase'
import { Epic, Status, Site, STATUSES, PRIORITIES, SITES } from '@/lib/types'
import { downloadCsv } from '@/lib/exportCsv'
import Link from 'next/link'

const STATUS_COLORS: Record<Status, string> = {
  'Backlog': 'bg-gray-100 text-gray-700',
  'Selected': 'bg-blue-100 text-blue-700',
  'Requirements': 'bg-purple-100 text-purple-700',
  'Dev': 'bg-yellow-100 text-yellow-800',
  'QA': 'bg-orange-100 text-orange-700',
  'Needs Feedback': 'bg-amber-100 text-amber-700',
  'Approval': 'bg-pink-100 text-pink-700',
  'Awaiting Release': 'bg-cyan-100 text-cyan-700',
  'Done': 'bg-green-100 text-green-700',
  "Won't Do": 'bg-gray-200 text-gray-500',
}

const PRIORITY_COLORS: Record<string, string> = {
  'High': 'text-red-600',
  'Medium': 'text-yellow-600',
  'Low': 'text-gray-400',
}

async function persistPositions(ordered: Epic[]) {
  await Promise.all(ordered.map((epic, i) =>
    supabase.from('epics').update({ position: i }).eq('id', epic.id)
  ))
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
  const [editingRank, setEditingRank] = useState<string | null>(null)
  const [rankInput, setRankInput] = useState('')

  async function loadEpics() {
    let query = supabase.from('epics').select('*').order('position', { nullsFirst: false }).order('created_at', { ascending: false })
    if (filterStatus) query = query.eq('status', filterStatus)
    if (filterSite) query = query.eq('site', filterSite)
    if (search) query = query.ilike('title', `%${search}%`)
    const { data, error } = await query
    if (error) console.error('Failed to load epics:', error.message)
    const all = data || []
    const inactive = (e: Epic) => e.status === 'Done' || e.status === "Won't Do"
    const active = all.filter(e => !inactive(e) && e.priority !== 'Low')
    const low = all.filter(e => !inactive(e) && e.priority === 'Low')
    const done = all.filter(e => inactive(e))
    setEpics([...active, ...low, ...done])
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
      position: epics.length,
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
    await persistPositions(reordered)
  }

  async function exportAll() {
    const { data: allEpics } = await supabase.from('epics').select('*').order('position', { nullsFirst: false })
    const { data: allTasks } = await supabase.from('tasks').select('*').order('position')
    const { data: allBugs } = await supabase.from('bugs').select('*').order('created_at', { ascending: false })
    const epicMap = Object.fromEntries((allEpics || []).map(e => [e.id, e.title]))
    const rows = [
      ...(allEpics || []).map((e, i) => ({
        Type: 'Epic', Rank: i + 1, Epic: e.title, Task: '', Status: e.status,
        Priority: e.priority, Site: e.site || '', Assignee: e.assignee_name || '',
        'Due Date': e.due_date || '', Completed: '',
      })),
      ...(allTasks || []).map(t => ({
        Type: 'Task', Rank: '', Epic: epicMap[t.epic_id] || '', Task: t.title, Status: '',
        Priority: '', Site: '', Assignee: t.assignee_name || '',
        'Due Date': t.due_date || '', Completed: t.completed ? 'Yes' : 'No',
      })),
      ...(allBugs || []).map(b => ({
        Type: 'Bug', Rank: '', Epic: epicMap[b.epic_id] || '', Task: b.title, Status: b.status,
        Priority: '', Site: b.site || '', Assignee: '',
        'Due Date': '', Completed: '',
      })),
    ]
    downloadCsv(`functionair-export-${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  async function applyRankChange(epicId: string, newRank: number) {
    const fromIndex = epics.findIndex(e => e.id === epicId)
    const toIndex = Math.max(0, Math.min(newRank - 1, epics.length - 1))
    setEditingRank(null)
    if (fromIndex === toIndex) return
    const reordered = Array.from(epics)
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, moved)
    setEpics(reordered)
    await persistPositions(reordered)
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
          <div className="flex gap-2">
            <button
              onClick={exportAll}
              className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Export CSV
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              + New Epic
            </button>
          </div>
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
                            {/* Rank number — click to edit */}
                            <div className="w-8 flex-shrink-0 text-center" onClick={e => e.stopPropagation()}>
                              {editingRank === epic.id ? (
                                <input
                                  type="number"
                                  value={rankInput}
                                  min={1}
                                  max={epics.length}
                                  onChange={e => setRankInput(e.target.value)}
                                  onBlur={() => applyRankChange(epic.id, parseInt(rankInput) || index + 1)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') applyRankChange(epic.id, parseInt(rankInput) || index + 1)
                                    if (e.key === 'Escape') setEditingRank(null)
                                  }}
                                  className="w-8 text-center text-sm border border-blue-400 rounded focus:outline-none"
                                  autoFocus
                                />
                              ) : (
                                <span
                                  onClick={() => { setEditingRank(epic.id); setRankInput(String(index + 1)) }}
                                  className="text-sm font-medium text-gray-400 hover:text-blue-600 cursor-pointer select-none"
                                  title="Click to change rank"
                                >
                                  {index + 1}
                                </span>
                              )}
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
