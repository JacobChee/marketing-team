'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { employees } from '../../lib/employees'
import '../globals.css'

export default function EmployeePage() {
  const params = useParams()
  const emp = employees[params.employee]
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('afix')
  const [mainTab, setMainTab] = useState('chat')
  const [tasks, setTasks] = useState([])
  const [generating, setGenerating] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!emp) return
    fetch(`/api/tasks?employee=${emp.id}`)
      .then(r => r.json())
      .then(setTasks)
      .catch(() => {})
  }, [emp])

  async function generateTasks(type) {
    setGenerating(true)
    try {
      const res = await fetch('/api/tasks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: emp.id, type }),
      })
      const newTasks = await res.json()
      setTasks(prev => [...newTasks, ...prev])
    } finally {
      setGenerating(false)
    }
  }

  async function updateTask(id, updates) {
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
  }

  if (!emp) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0B1829' }}>
        <div style={{ color: '#5A7A99' }}>Employee not found.</div>
      </div>
    )
  }

  async function sendMessage(e) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMsg = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          systemPrompt: emp.systemPrompt,
        }),
      })

      if (!res.ok) throw new Error('API error')

      const assistantMsg = { role: 'assistant', content: '' }
      setMessages(prev => [...prev, assistantMsg])

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.text) {
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: updated[updated.length - 1].content + data.text,
                }
                return updated
              })
            }
          } catch {}
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Check your API key.' }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0B1829' }}>
      {/* Top bar */}
      <div className="border-b flex-shrink-0" style={{ borderColor: '#1A3350' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/" className="text-sm hover:opacity-80 transition-opacity" style={{ color: '#5A7A99' }}>
            ← Back
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-lg">{emp.emoji}</span>
            <span className="font-semibold" style={{ color: '#E8EDF2' }}>{emp.name}</span>
            <span className="text-sm" style={{ color: emp.accent }}>{emp.role}</span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            {['chat', 'tasks'].map(tab => (
              <button
                key={tab}
                onClick={() => setMainTab(tab)}
                className="text-xs px-3 py-1.5 rounded-lg capitalize transition-colors"
                style={{
                  background: mainTab === tab ? emp.accent : 'transparent',
                  color: mainTab === tab ? '#0B1829' : '#5A7A99',
                  fontWeight: mainTab === tab ? 600 : 400,
                }}
              >
                {tab}
                {tab === 'tasks' && tasks.filter(t => t.status === 'pending').length > 0 && (
                  <span className="ml-1.5 w-4 h-4 inline-flex items-center justify-center rounded-full text-xs font-bold"
                    style={{ background: mainTab === 'tasks' ? '#0B1829' : '#C9A026', color: mainTab === 'tasks' ? emp.accent : '#0B1829' }}>
                    {tasks.filter(t => t.status === 'pending').length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden max-w-7xl mx-auto w-full">
        {/* Sidebar */}
        <div className="w-72 flex-shrink-0 border-r overflow-y-auto p-5" style={{ borderColor: '#1A3350' }}>
          {/* Avatar */}
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-3xl"
              style={{ background: `${emp.accent}22`, border: `1px solid ${emp.accent}55` }}
            >
              {emp.emoji}
            </div>
            <div>
              <div className="font-semibold" style={{ color: '#E8EDF2' }}>{emp.name}</div>
              <div className="text-xs" style={{ color: emp.accent }}>{emp.role}</div>
            </div>
          </div>

          {/* Mindset */}
          <div className="mb-5">
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#5A7A99' }}>Mindset</div>
            <p className="text-xs leading-relaxed" style={{ color: '#8899AA' }}>{emp.think}</p>
          </div>

          {/* Daily */}
          <div className="mb-5">
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#5A7A99' }}>Daily</div>
            <ul className="space-y-1.5">
              {emp.daily.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs" style={{ color: '#8899AA' }}>
                  <span style={{ color: emp.accent }} className="mt-0.5 flex-shrink-0">·</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Weekly */}
          <div className="mb-5">
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#5A7A99' }}>Weekly</div>
            <ul className="space-y-1.5">
              {emp.weekly.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs" style={{ color: '#8899AA' }}>
                  <span style={{ color: emp.accent }} className="mt-0.5 flex-shrink-0">·</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Brand tabs */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#5A7A99' }}>Brand Focus</div>
            <div className="flex gap-1 mb-3">
              {['afix', 'atsell'].map(brand => (
                <button
                  key={brand}
                  onClick={() => setActiveTab(brand)}
                  className="flex-1 text-xs py-1.5 rounded transition-colors"
                  style={{
                    background: activeTab === brand ? emp.accent : '#1A3350',
                    color: activeTab === brand ? '#0B1829' : '#5A7A99',
                    fontWeight: activeTab === brand ? 600 : 400,
                  }}
                >
                  {brand === 'afix' ? 'afix.sg' : 'atsell.io'}
                </button>
              ))}
            </div>
            <p className="text-xs leading-relaxed" style={{ color: '#8899AA' }}>
              {activeTab === 'afix' ? emp.afix : emp.atsell}
            </p>
          </div>
        </div>

        {/* Tasks panel */}
        {mainTab === 'tasks' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold" style={{ color: '#E8EDF2' }}>{emp.name}'s Tasks</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => generateTasks('daily')}
                  disabled={generating}
                  className="text-xs px-3 py-1.5 rounded-lg disabled:opacity-50 transition-opacity"
                  style={{ background: '#112236', color: '#8899AA', border: '1px solid #1A3350' }}
                >
                  {generating ? '...' : '+ Daily tasks'}
                </button>
                <button
                  onClick={() => generateTasks('weekly')}
                  disabled={generating}
                  className="text-xs px-3 py-1.5 rounded-lg disabled:opacity-50 transition-opacity"
                  style={{ background: '#112236', color: '#8899AA', border: '1px solid #1A3350' }}
                >
                  {generating ? '...' : '+ Weekly tasks'}
                </button>
              </div>
            </div>
            {tasks.length === 0 ? (
              <div className="text-center py-16 text-sm" style={{ color: '#2A4560' }}>
                No tasks yet — generate daily or weekly tasks above.
              </div>
            ) : (
              <div className="space-y-3 max-w-2xl">
                {['pending', 'approved', 'done', 'rejected'].map(status => {
                  const group = tasks.filter(t => t.status === status)
                  if (!group.length) return null
                  const statusColors = { pending: '#C9A026', approved: '#4A90D9', done: '#5CB85C', rejected: '#2A4560' }
                  const statusLabels = { pending: 'Pending Approval', approved: 'Approved', done: 'Done', rejected: 'Rejected' }
                  return (
                    <div key={status}>
                      <div className="flex items-center gap-2 mb-2 mt-4">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColors[status] }} />
                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: statusColors[status] }}>{statusLabels[status]}</span>
                      </div>
                      {group.map(task => (
                        <div key={task.id} className="rounded-xl p-4 mb-2" style={{ background: '#112236', border: '1px solid #1A3350' }}>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className="text-sm font-semibold" style={{ color: '#E8EDF2' }}>{task.title}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: '#0B1829', color: '#5A7A99' }}>
                              {task.brand === 'afix' ? 'afix.sg' : task.brand === 'atsell' ? 'atsell.io' : 'Both'}
                            </span>
                          </div>
                          <p className="text-xs mb-3" style={{ color: '#8899AA' }}>{task.description}</p>
                          <div className="flex items-center gap-2">
                            {status === 'pending' && (
                              <>
                                <button onClick={() => updateTask(task.id, { status: 'approved', approved_at: Date.now() })}
                                  className="text-xs px-2.5 py-1 rounded font-medium"
                                  style={{ background: '#4A90D922', color: '#4A90D9', border: '1px solid #4A90D944' }}>
                                  Approve
                                </button>
                                <button onClick={() => updateTask(task.id, { status: 'rejected' })}
                                  className="text-xs px-2.5 py-1 rounded"
                                  style={{ background: '#1A3350', color: '#5A7A99' }}>
                                  Reject
                                </button>
                              </>
                            )}
                            {status === 'approved' && (
                              <Link href={`/tasks`} className="text-xs px-2.5 py-1 rounded font-medium"
                                style={{ background: `${emp.accent}22`, color: emp.accent, border: `1px solid ${emp.accent}44` }}>
                                Run on Task Board →
                              </Link>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Chat area */}
        {mainTab === 'chat' && <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center pb-20">
                <div className="text-4xl mb-4">{emp.emoji}</div>
                <div className="font-semibold mb-1" style={{ color: '#E8EDF2' }}>{emp.name} is ready.</div>
                <p className="text-sm" style={{ color: '#5A7A99' }}>
                  Ask for a deliverable — copy, a plan, an audit, a report.
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-1 mr-3"
                    style={{ background: `${emp.accent}22`, border: `1px solid ${emp.accent}44` }}
                  >
                    {emp.emoji}
                  </div>
                )}
                <div
                  className="max-w-2xl rounded-xl px-4 py-3 text-sm prose-chat"
                  style={{
                    background: msg.role === 'user' ? emp.accent + '22' : '#112236',
                    border: `1px solid ${msg.role === 'user' ? emp.accent + '44' : '#1A3350'}`,
                    color: '#E8EDF2',
                    whiteSpace: 'pre-wrap',
                  }}
                  dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                />
              </div>
            ))}
            {loading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm mr-3 mt-1 flex-shrink-0"
                  style={{ background: `${emp.accent}22`, border: `1px solid ${emp.accent}44` }}
                >
                  {emp.emoji}
                </div>
                <div className="flex items-center gap-1.5 px-4 py-3 rounded-xl" style={{ background: '#112236', border: '1px solid #1A3350' }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: emp.accent, animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: emp.accent, animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: emp.accent, animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-4 flex-shrink-0" style={{ borderColor: '#1A3350' }}>
            <form onSubmit={sendMessage} className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={`Ask ${emp.name} for...`}
                disabled={loading}
                className="flex-1 rounded-lg px-4 py-3 text-sm outline-none disabled:opacity-50"
                style={{
                  background: '#112236',
                  border: '1px solid #1A3350',
                  color: '#E8EDF2',
                  caretColor: emp.accent,
                }}
                onFocus={e => { e.target.style.borderColor = emp.accent }}
                onBlur={e => { e.target.style.borderColor = '#1A3350' }}
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-5 py-3 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-40"
                style={{ background: emp.accent, color: '#0B1829' }}
              >
                Send
              </button>
            </form>
            <p className="text-xs mt-2 text-center" style={{ color: '#2A4560' }}>
              Powered by Claude claude-sonnet-4-6 · {emp.skills.slice(0, 3).join(', ')}
            </p>
          </div>
        </div>}
      </div>
    </div>
  )
}

function formatMessage(content) {
  if (!content) return ''
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, match => `<ul>${match}</ul>`)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
}
