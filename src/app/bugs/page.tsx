'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Bug, Epic, Status, Site, STATUSES, SITES } from '@/lib/types'
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

export default function BugsPage() {
  const [bugs, setBugs] = useState<(Bug & { epic_title?: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<Status | ''>('')
  const [filterSite, setFilterSite] = useState<Site | ''>('')
  const [filterLinked, setFilterLinked] = useState<'all' | 'linked' | 'standalone'>('all')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newSite, setNewSite] = useState<Site | ''>('')
  const [epics, setEpics] = useState<Epic[]>([])

  async function loadBugs() {
    let query = supabase.from('bugs').select('*').order('created_at', { ascending: false })
    if (filterStatus) query = query.eq('status', filterStatus)
    if (filterSite) query = query.eq('site', filterSite)
    if (search) query = query.ilike('title', `%${search}%`)
    if (filterLinked === 'linked') query = query.not('epic_id', 'is', null)
    if (filterLinked === 'standalone') query = query.is('epic_id', null)
    const { data } = await query
    const bugList = data || []

    const epicIds = [...new Set(bugList.map(b => b.epic_id).filter(Boolean))]
    if (epicIds.length) {
      const { data: epicData } = await supabase.from('epics').select('id, title').in('id', epicIds)
      const epicMap = Object.fromEntries((epicData || []).map(e => [e.id, e.title]))
      bugList.forEach(b => { if (b.epic_id) b.epic_title = epicMap[b.epic_id] })
    }

    setBugs(bugList as (Bug & { epic_title?: string })[])
    setLoading(false)
  }

  async function loadEpics() {
    const { data } = await supabase.from('epics').select('id, title').order('title')
    setEpics(data || [])
  }

  useEffect(() => { loadBugs() }, [filterStatus, filterSite, filterLinked, search])
  useEffect(() => { loadEpics() }, [])

  async function createBug(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    await supabase.from('bugs').insert({
      title: newTitle.trim(),
      site: newSite || null,
    })
    setNewTitle('')
    setNewSite('')
    setShowCreate(false)
    loadBugs()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-semibold text-gray-900">Functionair PM</h1>
            <nav className="flex gap-4 text-sm">
              <Link href="/" className="text-gray-500 hover:text-gray-900">Epics</Link>
              <span className="text-gray-900 font-medium">Bugs</span>
            </nav>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700"
          >
            + New Bug
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            placeholder="Search bugs..."
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
          <select
            value={filterLinked}
            onChange={e => setFilterLinked(e.target.value as 'all' | 'linked' | 'standalone')}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Bugs</option>
            <option value="linked">Linked to Epic</option>
            <option value="standalone">Standalone</option>
          </select>
        </div>

        {showCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <form onSubmit={createBug} className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
              <h2 className="text-lg font-semibold mb-4">New Bug</h2>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Bug title"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  autoFocus
                />
                <select
                  value={newSite}
                  onChange={e => setNewSite(e.target.value as Site | '')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">No site</option>
                  {SITES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                <button type="submit" className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700">Create</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : bugs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">No bugs yet</p>
            <p className="text-sm">Click &quot;+ New Bug&quot; to report one.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {bugs.map(bug => (
              <Link
                key={bug.id}
                href={`/bugs/${bug.id}`}
                className="block bg-white border border-gray-200 rounded-lg px-5 py-4 hover:border-red-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-red-500 text-sm">●</span>
                  <span className="font-medium text-gray-900 flex-1">{bug.title}</span>
                  {bug.epic_title && (
                    <span className="text-xs text-purple-600 px-2 py-0.5 rounded bg-purple-50">{bug.epic_title}</span>
                  )}
                  {bug.site && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600">{bug.site}</span>
                  )}
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[bug.status]}`}>
                    {bug.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
