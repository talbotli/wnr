'use client'

import { useEffect, useState, use } from 'react'
import { supabase } from '@/lib/supabase'
import { Epic, Task, Comment, TeamMember, STATUSES, PRIORITIES, SITES, Status } from '@/lib/types'
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

async function sendNotification(payload: Record<string, string>) {
  try { await fetch('/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }) } catch {}
}

export default function EpicDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [epic, setEpic] = useState<Epic | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [newComment, setNewComment] = useState('')
  const [commentAuthor, setCommentAuthor] = useState('')
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [taskEdit, setTaskEdit] = useState<Partial<Task>>({})
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])

  async function loadEpic() {
    const { data } = await supabase.from('epics').select('*').eq('id', id).single()
    if (data) {
      setEpic(data)
      setEditTitle(data.title)
      setEditDesc(data.description || '')
    }
  }

  async function loadTasks() {
    const { data } = await supabase.from('tasks').select('*').eq('epic_id', id).order('position').order('created_at')
    setTasks(data || [])
  }

  async function loadComments(taskId: string) {
    const { data } = await supabase.from('comments').select('*').eq('task_id', taskId).order('created_at')
    setComments(prev => ({ ...prev, [taskId]: data || [] }))
  }

  async function loadTeamMembers() {
    const { data } = await supabase.from('team_members').select('*').order('name')
    setTeamMembers(data || [])
  }

  useEffect(() => { loadEpic(); loadTasks(); loadTeamMembers() }, [id])

  async function updateEpic(updates: Partial<Epic>) {
    if (updates.status && epic && updates.status !== epic.status) {
      const { data: epicTasks } = await supabase.from('tasks').select('assignee_email').eq('epic_id', id).not('assignee_email', 'is', null)
      const emails = [...new Set((epicTasks || []).map(t => t.assignee_email).filter(Boolean))]
      if (emails.length) {
        sendNotification({ type: 'status_changed', to: emails.join(','), epicTitle: epic.title, newStatus: updates.status })
      }
    }
    await supabase.from('epics').update(updates).eq('id', id)
    loadEpic()
  }

  async function saveEpicEdit() {
    await updateEpic({ title: editTitle, description: editDesc || null })
    setEditing(false)
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTaskTitle.trim()) return
    await supabase.from('tasks').insert({ epic_id: id, title: newTaskTitle.trim() })
    setNewTaskTitle('')
    setShowAddTask(false)
    loadTasks()
  }

  async function deleteEpic() {
    if (!confirm('Delete this epic and all its tasks?')) return
    await supabase.from('epics').delete().eq('id', id)
    window.location.href = '/'
  }

  async function deleteTask(taskId: string) {
    if (!confirm('Delete this task?')) return
    await supabase.from('tasks').delete().eq('id', taskId)
    setExpandedTask(null)
    loadTasks()
  }

  async function toggleTask(task: Task) {
    await supabase.from('tasks').update({ completed: !task.completed }).eq('id', task.id)
    loadTasks()
  }

  async function saveTaskEdit(taskId: string) {
    const existing = tasks.find(t => t.id === taskId)
    if (taskEdit.assignee_email && epic && existing?.assignee_email !== taskEdit.assignee_email) {
      sendNotification({
        type: 'task_assigned',
        to: taskEdit.assignee_email,
        epicTitle: epic.title,
        taskTitle: taskEdit.title || existing?.title || '',
        assigneeName: taskEdit.assignee_name || '',
      })
    }
    await supabase.from('tasks').update(taskEdit).eq('id', taskId)
    setEditingTask(null)
    setTaskEdit({})
    loadTasks()
  }

  async function addComment(taskId: string) {
    if (!newComment.trim() || !commentAuthor.trim()) return
    await supabase.from('comments').insert({ task_id: taskId, author: commentAuthor.trim(), body: newComment.trim() })
    setNewComment('')
    loadComments(taskId)
  }

  function expandTask(taskId: string) {
    if (expandedTask === taskId) {
      setExpandedTask(null)
    } else {
      setExpandedTask(taskId)
      if (!comments[taskId]) loadComments(taskId)
    }
  }

  if (!epic) return <div className="p-8 text-gray-500">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">← Back</Link>
          <h1 className="text-xl font-semibold text-gray-900">Functionair PM</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6">
        {/* Epic Header */}
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
                <button onClick={saveEpicEdit} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700">Save</button>
                <button onClick={() => setEditing(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-2xl font-semibold text-gray-900">{epic.title}</h2>
                <div className="flex gap-3">
                  <button onClick={() => setEditing(true)} className="text-sm text-blue-600 hover:text-blue-800">Edit</button>
                  <button onClick={deleteEpic} className="text-sm text-red-500 hover:text-red-700">Delete</button>
                </div>
              </div>
              {epic.description && <p className="text-gray-600 text-sm mb-4">{epic.description}</p>}
            </>
          )}

          <div className="flex flex-wrap gap-3 mt-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Status</label>
              <select
                value={epic.status}
                onChange={e => updateEpic({ status: e.target.value as Status })}
                className={`text-sm font-medium px-3 py-1.5 rounded-full border-0 cursor-pointer ${STATUS_COLORS[epic.status]}`}
              >
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Priority</label>
              <select
                value={epic.priority}
                onChange={e => updateEpic({ priority: e.target.value as 'High' | 'Medium' | 'Low' })}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
              >
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Site</label>
              <select
                value={epic.site || ''}
                onChange={e => updateEpic({ site: e.target.value || null } as Partial<Epic>)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
              >
                <option value="">None</option>
                {SITES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Assignee</label>
              <select
                value={epic.assignee_email || ''}
                onChange={e => {
                  const member = teamMembers.find(m => m.email === e.target.value)
                  updateEpic({ assignee_name: member?.name || null, assignee_email: e.target.value || null } as Partial<Epic>)
                }}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
              >
                <option value="">Unassigned</option>
                {teamMembers.map(m => <option key={m.id} value={m.email}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Due date</label>
              <input
                type="date"
                value={epic.due_date || ''}
                onChange={e => updateEpic({ due_date: e.target.value || null } as Partial<Epic>)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
              />
            </div>
            <div className="text-xs text-gray-400 self-end">
              Updated {new Date(epic.updated_at).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Tasks */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Tasks ({tasks.filter(t => t.completed).length}/{tasks.length})
            </h3>
            <button
              onClick={() => setShowAddTask(true)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              + Add Task
            </button>
          </div>

          {showAddTask && (
            <form onSubmit={addTask} className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Task title..."
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                autoFocus
              />
              <button type="submit" className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700">Add</button>
              <button type="button" onClick={() => setShowAddTask(false)} className="text-sm text-gray-500">Cancel</button>
            </form>
          )}

          <div className="space-y-1">
            {tasks.map(task => (
              <div key={task.id} className="border border-gray-100 rounded-lg">
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => expandTask(task.id)}
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={(e) => { e.stopPropagation(); toggleTask(task) }}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  <span className={`flex-1 text-sm ${task.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                    {task.title}
                  </span>
                  {task.assignee_name && (
                    <span className="text-xs text-gray-500">{task.assignee_name}</span>
                  )}
                  {task.due_date && (
                    <span className="text-xs text-gray-400">{new Date(task.due_date).toLocaleDateString()}</span>
                  )}
                  <span className="text-gray-300 text-xs">{expandedTask === task.id ? '▼' : '▶'}</span>
                </div>

                {expandedTask === task.id && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                    {editingTask === task.id ? (
                      <div className="space-y-2 mb-4">
                        <input
                          value={taskEdit.title || ''}
                          onChange={e => setTaskEdit(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          placeholder="Title"
                        />
                        <textarea
                          value={taskEdit.description || ''}
                          onChange={e => setTaskEdit(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          placeholder="Description"
                          rows={2}
                        />
                        <select
                          value={taskEdit.assignee_email || ''}
                          onChange={e => {
                            const member = teamMembers.find(m => m.email === e.target.value)
                            setTaskEdit(prev => ({
                              ...prev,
                              assignee_name: member?.name || null,
                              assignee_email: e.target.value || null,
                            }))
                          }}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        >
                          <option value="">Unassigned</option>
                          {teamMembers.map(m => <option key={m.id} value={m.email}>{m.name}</option>)}
                        </select>
                        <input
                          type="date"
                          value={taskEdit.due_date || ''}
                          onChange={e => setTaskEdit(prev => ({ ...prev, due_date: e.target.value || null }))}
                          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => saveTaskEdit(task.id)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm">Save</button>
                          <button onClick={() => setEditingTask(null)} className="text-sm text-gray-500">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-4">
                        {task.description && <p className="text-sm text-gray-600 mb-2">{task.description}</p>}
                        <div className="flex gap-4 text-xs text-gray-500">
                          {task.assignee_email && <span>{task.assignee_email}</span>}
                          {task.due_date && <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>}
                        </div>
                        <div className="flex gap-3 mt-2">
                          <button
                            onClick={() => { setEditingTask(task.id); setTaskEdit(task) }}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            Edit task
                          </button>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Delete task
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Comments */}
                    <div className="border-t border-gray-100 pt-3">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Comments</h4>
                      {(comments[task.id] || []).length === 0 ? (
                        <p className="text-xs text-gray-400 mb-2">No comments yet</p>
                      ) : (
                        <div className="space-y-2 mb-3">
                          {(comments[task.id] || []).map(c => (
                            <div key={c.id} className="text-sm">
                              <span className="font-medium text-gray-700">{c.author}</span>
                              <span className="text-gray-400 text-xs ml-2">{new Date(c.created_at).toLocaleString()}</span>
                              <p className="text-gray-600 mt-0.5">{c.body}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <select
                          value={commentAuthor}
                          onChange={e => setCommentAuthor(e.target.value)}
                          className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs w-28"
                        >
                          <option value="">Who</option>
                          {teamMembers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                        </select>
                        <input
                          value={newComment}
                          onChange={e => setNewComment(e.target.value)}
                          placeholder="Add a comment..."
                          className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs"
                          onKeyDown={e => { if (e.key === 'Enter') addComment(task.id) }}
                        />
                        <button
                          onClick={() => addComment(task.id)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Post
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {tasks.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">No tasks yet</p>}
          </div>
        </div>
      </main>
    </div>
  )
}
