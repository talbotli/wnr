'use client'

import { useEffect, useState, use, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Bug, BugScreenshot, Epic, STATUSES, SITES, Status } from '@/lib/types'
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

export default function BugDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [bug, setBug] = useState<Bug | null>(null)
  const [screenshots, setScreenshots] = useState<BugScreenshot[]>([])
  const [epics, setEpics] = useState<{ id: string; title: string }[]>([])
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)

  async function loadBug() {
    const { data } = await supabase.from('bugs').select('*').eq('id', id).single()
    if (data) {
      setBug(data)
      setEditTitle(data.title)
      setEditDesc(data.description || '')
    }
  }

  async function loadScreenshots() {
    const { data } = await supabase.from('bug_screenshots').select('*').eq('bug_id', id).order('created_at')
    setScreenshots(data || [])
  }

  async function loadEpics() {
    const { data } = await supabase.from('epics').select('id, title').order('title')
    setEpics(data || [])
  }

  useEffect(() => { loadBug(); loadScreenshots(); loadEpics() }, [id])

  async function updateBug(updates: Partial<Bug>) {
    await supabase.from('bugs').update(updates).eq('id', id)
    loadBug()
  }

  async function saveBugEdit() {
    await updateBug({ title: editTitle, description: editDesc || null })
    setEditing(false)
  }

  async function deleteBug() {
    if (!confirm('Delete this bug and all its screenshots?')) return
    for (const s of screenshots) {
      await supabase.storage.from('bug-screenshots').remove([s.file_path])
    }
    await supabase.from('bugs').delete().eq('id', id)
    window.location.href = '/bugs'
  }

  async function uploadFiles(files: FileList | File[]) {
    setUploading(true)
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      const path = `${id}/${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from('bug-screenshots').upload(path, file)
      if (!error) {
        await supabase.from('bug_screenshots').insert({ bug_id: id, file_path: path })
      }
    }
    setUploading(false)
    loadScreenshots()
  }

  async function deleteScreenshot(screenshot: BugScreenshot) {
    await supabase.storage.from('bug-screenshots').remove([screenshot.file_path])
    await supabase.from('bug_screenshots').delete().eq('id', screenshot.id)
    loadScreenshots()
  }

  function getPublicUrl(path: string) {
    return supabase.storage.from('bug-screenshots').getPublicUrl(path).data.publicUrl
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files)
  }, [id])

  if (!bug) return <div className="p-8 text-gray-500">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/bugs" className="text-gray-400 hover:text-gray-600 text-sm">← Bugs</Link>
          <h1 className="text-xl font-semibold text-gray-900">Functionair PM</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          {editing ? (
            <div className="space-y-3">
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-lg font-semibold"
              />
              <textarea
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                placeholder="Description..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button onClick={saveBugEdit} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700">Save</button>
                <button onClick={() => setEditing(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-red-500">●</span>
                  <h2 className="text-2xl font-semibold text-gray-900">{bug.title}</h2>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setEditing(true)} className="text-sm text-blue-600 hover:text-blue-800">Edit</button>
                  <button onClick={deleteBug} className="text-sm text-red-500 hover:text-red-700">Delete</button>
                </div>
              </div>
              {bug.description && <p className="text-gray-600 text-sm mb-4">{bug.description}</p>}
            </>
          )}

          <div className="flex flex-wrap gap-3 mt-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Status</label>
              <select
                value={bug.status}
                onChange={e => updateBug({ status: e.target.value as Status })}
                className={`text-sm font-medium px-3 py-1.5 rounded-full border-0 cursor-pointer ${STATUS_COLORS[bug.status]}`}
              >
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Site</label>
              <select
                value={bug.site || ''}
                onChange={e => updateBug({ site: e.target.value || null } as Partial<Bug>)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
              >
                <option value="">None</option>
                {SITES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Linked Epic</label>
              <select
                value={bug.epic_id || ''}
                onChange={e => updateBug({ epic_id: e.target.value || null } as Partial<Bug>)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
              >
                <option value="">None (standalone)</option>
                {epics.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
              </select>
            </div>
            <div className="text-xs text-gray-400 self-end">
              Updated {new Date(bug.updated_at).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Screenshots */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Screenshots</h3>

          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center mb-4 transition-colors ${
              dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
            }`}
          >
            <p className="text-sm text-gray-500 mb-2">
              {uploading ? 'Uploading...' : 'Drag & drop images here, or'}
            </p>
            <label className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer font-medium">
              click to upload
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => { if (e.target.files?.length) uploadFiles(e.target.files) }}
              />
            </label>
          </div>

          {screenshots.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No screenshots yet</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {screenshots.map(s => (
                <div key={s.id} className="relative group">
                  <a href={getPublicUrl(s.file_path)} target="_blank" rel="noopener noreferrer">
                    <img
                      src={getPublicUrl(s.file_path)}
                      alt="Bug screenshot"
                      className="w-full h-40 object-cover rounded-lg border border-gray-200"
                    />
                  </a>
                  <button
                    onClick={() => deleteScreenshot(s)}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-6 h-6 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
