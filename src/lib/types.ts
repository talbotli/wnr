export type Priority = 'High' | 'Medium' | 'Low'
export type Status = 'Backlog' | 'Selected' | 'Requirements' | 'Dev' | 'QA' | 'Approval' | 'Awaiting Release' | 'Done'
export type Site = 'WNR' | 'ATS'

export const STATUSES: Status[] = ['Backlog', 'Selected', 'Requirements', 'Dev', 'QA', 'Approval', 'Awaiting Release', 'Done']
export const PRIORITIES: Priority[] = ['High', 'Medium', 'Low']
export const SITES: Site[] = ['WNR', 'ATS']

export interface Epic {
  id: string
  title: string
  description: string | null
  priority: Priority
  status: Status
  site: Site | null
  position: number
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  epic_id: string
  title: string
  description: string | null
  assignee_name: string | null
  assignee_email: string | null
  due_date: string | null
  completed: boolean
  position: number
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  task_id: string
  author: string
  body: string
  created_at: string
}

export interface TeamMember {
  id: string
  name: string
  email: string
}
