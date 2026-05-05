'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { employees, employeeList } from '../../lib/employees'
import '../globals.css'

const STATUS_COLS = [
  { key: 'pending', label: 'Pending Approval', color: '#C9A026' },
  { key: 'approved', label: 'Approved', color: '#4A90D9' },
  { key: 'done', label: 'Done', color: '#5CB85C' },
]

const PRIORITY_COLOR = { high: '#E84393', medium: '#C9A026', low: '#5A7A99' }
const BRAND_LABEL = { afix: 'afix.sg', atsell: 'atsell.io', both: 'Both' }

export default function TaskBoard() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState({})
  const [filter, setFilter] = useState('all')
  const [runningTask, setRunningTask] = useState(null)
  const [taskOutputs, setTaskOutputs] = useState({})

  const fetchTasks = useCallback(async () => {
    const res = await fetch('/api/tasks')
    const data = await res.json()
    setTasks(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  async function generateTasks(employeeId, type) {
    setGenerating(g => ({ ...g, [`${employeeId}-${type}`]: true }))
    try {
      await fetch('/api/tasks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, type }),
      })
      await fetchTasks()
    } finally {
      setGenerating(g => ({ ...g, [`${employeeId}-${type}`]: false }))
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

  async function deleteTask(id) {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  async function runTask(task) {
    setRunningTask(task.id)
    setTaskOutputs(o => ({ ...o, [task.id]: '' }))
    const emp = employees[task.employee]

    const prompt = `Execute this task and produce the actual output:\n\n**Task:** ${task.title}\n**Brief:** ${task.description}\n**Brand:** ${BRAND_LABEL[task.brand]}\n\nProduce the complete deliverable now. No preamble.`

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          systemPrompt: emp.systemPrompt,
        }),
      })
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const lines = decoder.decode(value).split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          try {
            const d = JSON.parse(line.slice(6))
            if (d.text) {
              full += d.text
              setTaskOutputs(o => ({ ...o, [task.id]: full }))
            }
          } catch {}
        }
      }
      await updateTask(task.id, { status: 'done', output: full, done_at: Date.now() })
    } finally {
      setRunningTask(null)
    }
  }

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.employee === filter)
  const rejected = filtered.filter(t => t.status === 'rejected')

  return (
    <div className="min-h-screen" style={{ background: '#0B1829' }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: '#1A3350' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm hover:opacity-70 transition-opacity" style={{ color: '#5A7A99' }}>← Dashboard</Link>
            <h1 className="text-lg font-semibold" style={{ fontFamily: 'Playfair Display, serif', color: '#C9A026' }}>Task Board</h1>
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: '#5A7A99' }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#C9A026' }} />
            {tasks.filter(t => t.status === 'pending').length} pending approval
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Generate + Filter bar */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#5A7A99' }}>Filter:</span>
          <button
            onClick={() => setFilter('all')}
            className="text-xs px-3 py-1.5 rounded-full transition-colors"
            style={{ background: filter === 'all' ? '#C9A026' : '#112236', color: filter === 'all' ? '#0B1829' : '#8899AA', border: '1px solid #1A3350' }}
          >
            All
          </button>
          {employeeList.map(emp => (
            <button
              key={emp.id}
              onClick={() => setFilter(emp.id)}
              className="text-xs px-3 py-1.5 rounded-full transition-colors"
              style={{ background: filter === emp.id ? emp.accent : '#112236', color: filter === emp.id ? '#0B1829' : '#8899AA', border: '1px solid #1A3350' }}
            >
              {emp.emoji} {emp.name}
            </button>
          ))}
        </div>

        {/* Generate buttons */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {employeeList.map(emp => (
            <div key={emp.id} className="rounded-lg p-3" style={{ background: '#112236', border: '1px solid #1A3350' }}>
              <div className="text-xs font-semibold mb-2" style={{ color: emp.accent }}>{emp.emoji} {emp.name}</div>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => generateTasks(emp.id, 'daily')}
                  disabled={generating[`${emp.id}-daily`]}
                  className="text-xs py-1 px-2 rounded transition-opacity disabled:opacity-50"
                  style={{ background: '#0B1829', color: '#8899AA', border: '1px solid #1A3350' }}
                >
                  {generating[`${emp.id}-daily`] ? '...' : '+ Daily'}
                </button>
                <button
                  onClick={() => generateTasks(emp.id, 'weekly')}
                  disabled={generating[`${emp.id}-weekly`]}
                  className="text-xs py-1 px-2 rounded transition-opacity disabled:opacity-50"
                  style={{ background: '#0B1829', color: '#8899AA', border: '1px solid #1A3350' }}
                >
                  {generating[`${emp.id}-weekly`] ? '...' : '+ Weekly'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-sm" style={{ color: '#5A7A99' }}>Loading tasks...</div>
        ) : (
          <>
            {/* Kanban columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {STATUS_COLS.map(col => {
                const colTasks = filtered.filter(t => t.status === col.key)
                return (
                  <div key={col.key}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: col.color }}>{col.label}</span>
                      <span className="text-xs ml-auto px-1.5 py-0.5 rounded" style={{ background: '#112236', color: '#5A7A99' }}>{colTasks.length}</span>
                    </div>
                    <div className="space-y-3">
                      {colTasks.length === 0 && (
                        <div className="text-xs text-center py-6 rounded-lg" style={{ color: '#2A4560', border: '1px dashed #1A3350' }}>
                          No tasks
                        </div>
                      )}
                      {colTasks.map(task => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          colColor={col.color}
                          onApprove={() => updateTask(task.id, { status: 'approved', approved_at: Date.now() })}
                          onReject={() => updateTask(task.id, { status: 'rejected' })}
                          onDelete={() => deleteTask(task.id)}
                          onRun={() => runTask(task)}
                          onMarkDone={() => updateTask(task.id, { status: 'done', done_at: Date.now() })}
                          isRunning={runningTask === task.id}
                          output={taskOutputs[task.id]}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Rejected tasks (collapsed) */}
            {rejected.length > 0 && (
              <details className="mt-8">
                <summary className="text-xs cursor-pointer" style={{ color: '#2A4560' }}>
                  {rejected.length} rejected task{rejected.length > 1 ? 's' : ''} — click to show
                </summary>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                  {rejected.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      colColor="#2A4560"
                      onApprove={() => updateTask(task.id, { status: 'pending' })}
                      onDelete={() => deleteTask(task.id)}
                      isRunning={false}
                    />
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function TaskCard({ task, colColor, onApprove, onReject, onDelete, onRun, onMarkDone, isRunning, output }) {
  const emp = employees[task.employee]
  const [showOutput, setShowOutput] = useState(false)

  useEffect(() => {
    if (output) setShowOutput(true)
  }, [output])

  return (
    <div className="rounded-xl p-4" style={{ background: '#112236', border: `1px solid #1A3350` }}>
      {/* Employee + brand */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{emp?.emoji}</span>
          <span className="text-xs font-medium" style={{ color: emp?.accent }}>{emp?.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#0B1829', color: '#5A7A99' }}>
            {BRAND_LABEL[task.brand]}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#0B1829', color: PRIORITY_COLOR[task.priority] }}>
            {task.priority}
          </span>
        </div>
      </div>

      {/* Title */}
      <div className="text-sm font-semibold mb-1" style={{ color: '#E8EDF2' }}>{task.title}</div>
      <p className="text-xs leading-relaxed mb-3" style={{ color: '#8899AA' }}>{task.description}</p>

      {/* Output */}
      {(output || task.output) && (
        <div className="mb-3">
          <button
            onClick={() => setShowOutput(v => !v)}
            className="text-xs mb-1.5"
            style={{ color: '#5CB85C' }}
          >
            {showOutput ? '▼' : '▶'} View output
          </button>
          {showOutput && (
            <div
              className="text-xs leading-relaxed p-3 rounded-lg whitespace-pre-wrap prose-chat overflow-auto"
              style={{ background: '#0B1829', color: '#8899AA', maxHeight: '200px', border: '1px solid #1A3350' }}
              dangerouslySetInnerHTML={{ __html: formatMsg(output || task.output) }}
            />
          )}
        </div>
      )}

      {/* Running indicator */}
      {isRunning && !output && (
        <div className="flex items-center gap-1.5 mb-3 text-xs" style={{ color: '#5A7A99' }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: emp?.accent }} />
          {emp?.name} is working...
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {task.status === 'pending' && (
          <>
            <button onClick={onApprove} className="text-xs px-2.5 py-1 rounded font-medium" style={{ background: '#4A90D922', color: '#4A90D9', border: '1px solid #4A90D944' }}>
              Approve
            </button>
            <button onClick={onReject} className="text-xs px-2.5 py-1 rounded" style={{ background: '#1A3350', color: '#5A7A99' }}>
              Reject
            </button>
          </>
        )}
        {task.status === 'approved' && (
          <>
            <button
              onClick={onRun}
              disabled={isRunning}
              className="text-xs px-2.5 py-1 rounded font-medium disabled:opacity-50"
              style={{ background: `${emp?.accent}22`, color: emp?.accent, border: `1px solid ${emp?.accent}44` }}
            >
              {isRunning ? 'Running...' : '▶ Run'}
            </button>
            <button onClick={onMarkDone} className="text-xs px-2.5 py-1 rounded" style={{ background: '#1A3350', color: '#5A7A99' }}>
              Mark done
            </button>
          </>
        )}
        {task.status === 'rejected' && (
          <button onClick={onApprove} className="text-xs px-2.5 py-1 rounded" style={{ background: '#1A3350', color: '#5A7A99' }}>
            Restore
          </button>
        )}
        <button onClick={onDelete} className="text-xs ml-auto" style={{ color: '#2A4560' }}>
          ✕
        </button>
      </div>
    </div>
  )
}

function formatMsg(content) {
  if (!content) return ''
  return content
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '<br/><br/>').replace(/\n/g, '<br/>')
}
