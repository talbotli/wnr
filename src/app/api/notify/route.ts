import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function POST(req: NextRequest) {
  if (!resend) {
    return NextResponse.json({ error: 'Email not configured' }, { status: 501 })
  }

  const { type, to, epicTitle, epicId, taskTitle, assigneeName, newStatus } = await req.json()

  let subject = ''
  let html = ''

  if (type === 'epic_assigned') {
    subject = `You've been assigned an Epic: ${epicTitle}`
    html = `
      <p>Hi ${assigneeName},</p>
      <p>You've been assigned an epic: <strong>${epicTitle}</strong></p>
      <p><a href="https://wnr-iota.vercel.app/epics/${epicId}">View epic →</a></p>
      <p>— Functionair PM</p>
    `
  } else if (type === 'task_assigned') {
    subject = `You've been assigned: ${taskTitle}`
    html = `
      <p>Hi ${assigneeName},</p>
      <p>You've been assigned a task: <strong>${taskTitle}</strong></p>
      <p>Epic: ${epicTitle}</p>
      <p>— Functionair PM</p>
    `
  } else if (type === 'status_changed') {
    subject = `Epic status updated: ${epicTitle}`
    html = `
      <p>The epic <strong>${epicTitle}</strong> has been moved to <strong>${newStatus}</strong>.</p>
      <p>— Functionair PM</p>
    `
  } else {
    return NextResponse.json({ error: 'Unknown notification type' }, { status: 400 })
  }

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'Functionair PM <notifications@truenorthpmsolutions.com>',
    to,
    subject,
    html,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
