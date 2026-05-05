'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { employees, employeeList } from '../../lib/employees'
import '../globals.css'

const COLS = [
  { key: 'pending',  label: 'Pending',  color: '#C9A026' },
  { key: 'approved', label: 'Approved', color: '#4A90D9' },
  { key: 'done',     label: 'Done',     color: '#5CB85C' },
]

const PRIORITY_DOT = { high: '#E84393', medium: '#C9A026', low: '#3A5A7A' }
const TYPE_LABEL = { daily: 'Daily', weekly: 'Weekly', systems: 'Setup', handoff: 'Handoff' }
const BRAND_LABEL = { afix: 'afix.sg', atsell: 'atsell.io', both: 'Both' }

export default function TaskBoard() {
  const [tasks, setTasks]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [generating, setGenerating] = useState({})
  const [filter, setFilter]         = useState('all')
  const [runningTask, setRunningTask] = useState(null)
  const [taskOutputs, setTaskOutputs] = useState({})
  const [showGenerate, setShowGenerate] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting]   = useState(false)

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

  async function generateAll(type) {
    setGenerating(g => ({ ...g, [`all-${type}`]: true }))
    try {
      await Promise.all(employeeList.map(emp =>
        fetch('/api/tasks/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeId: emp.id, type }),
        })
      ))
      await fetchTasks()
    } finally {
      setGenerating(g => ({ ...g, [`all-${type}`]: false }))
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

  async function resetBoard() {
    setResetting(true)
    await fetch('/api/tasks/reset', { method: 'POST' })
    setTasks([])
    setResetting(false)
    setConfirmReset(false)
  }

  async function runTask(task) {
    setRunningTask(task.id)
    setTaskOutputs(o => ({ ...o, [task.id]: '' }))
    const emp = employees[task.employee]
    const context = task.handoffContext ? `\n\nContext from handoff:\n${task.handoffContext}` : ''

    // If this task targets a specific file, instruct Claude to output ONLY the file content
    const fileInstruction = task.filePath
      ? `\n\nIMPORTANT: Your output will be committed directly to \`${task.filePath}\` in the ${task.repo} repo. Output ONLY the complete file content — no preamble, no explanation, no markdown fences. Start immediately with the file content.`
      : `\n\nProduce the complete deliverable now. No preamble.`

    const prompt = `Execute this task and produce the actual output:\n\n**Task:** ${task.title}\n**Brief:** ${task.description}\n**Brand:** ${BRAND_LABEL[task.brand]}${context}${fileInstruction}`

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          systemPrompt: emp.systemPrompt,
          employeeId: emp.id,
        }),
      })
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value).split('\n').filter(l => l.startsWith('data: '))) {
          try {
            const d = JSON.parse(line.slice(6))
            if (d.text) { full += d.text; setTaskOutputs(o => ({ ...o, [task.id]: full })) }
          } catch {}
        }
      }
      await updateTask(task.id, { status: 'done', output: full, done_at: Date.now() })
    } finally {
      setRunningTask(null)
    }
  }

  const filtered  = filter === 'all' ? tasks : tasks.filter(t => t.employee === filter)
  const rejected  = filtered.filter(t => t.status === 'rejected')
  const pending   = tasks.filter(t => t.status === 'pending').length
  const anyGenerating = Object.values(generating).some(Boolean)

  return (
    <div className="min-h-screen" style={{ background: '#0B1829' }}>

      {/* Header */}
      <div className="border-b" style={{ borderColor: '#1A3350' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="text-sm hover:opacity-70 transition-opacity" style={{ color: '#5A7A99' }}>← Dashboard</Link>
          <h1 className="font-semibold" style={{ fontFamily: 'Playfair Display, serif', color: '#C9A026' }}>Task Board</h1>

          {/* Pending badge */}
          {pending > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: '#C9A02622', color: '#C9A026', border: '1px solid #C9A02644' }}>
              {pending} pending
            </span>
          )}

          <div className="ml-auto flex items-center gap-2">
            {/* Generate toggle */}
            <button
              onClick={() => setShowGenerate(v => !v)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
              style={{ background: showGenerate ? '#C9A026' : '#112236', color: showGenerate ? '#0B1829' : '#8899AA', border: '1px solid #1A3350' }}
            >
              {anyGenerating ? '⟳ Generating...' : '+ Generate'}
            </button>

            {/* Reset */}
            {!confirmReset ? (
              <button
                onClick={() => setConfirmReset(true)}
                className="text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
                style={{ background: '#112236', color: '#5A7A99', border: '1px solid #1A3350' }}
              >
                Clear board
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-xs" style={{ color: '#E84393' }}>Sure?</span>
                <button onClick={resetBoard} disabled={resetting} className="text-xs px-2.5 py-1 rounded font-medium" style={{ background: '#E8439322', color: '#E84393', border: '1px solid #E8439344' }}>
                  {resetting ? '...' : 'Yes, clear'}
                </button>
                <button onClick={() => setConfirmReset(false)} className="text-xs px-2 py-1 rounded" style={{ background: '#112236', color: '#5A7A99' }}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Generate panel */}
      {showGenerate && (
        <div className="border-b" style={{ borderColor: '#1A3350', background: '#0D1F35' }}>
          <div className="max-w-7xl mx-auto px-6 py-5">
            {/* Generate all */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#5A7A99' }}>Generate for all</span>
              {['daily', 'weekly', 'systems'].map(type => (
                <button
                  key={type}
                  onClick={() => generateAll(type)}
                  disabled={generating[`all-${type}`]}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 transition-opacity"
                  style={{ background: '#112236', color: '#C9A026', border: '1px solid #C9A02644' }}
                >
                  {generating[`all-${type}`] ? '...' : `+ All ${type}`}
                </button>
              ))}
            </div>

            {/* Per-employee */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {employeeList.map(emp => (
                <div key={emp.id} className="rounded-lg p-3" style={{ background: '#112236', border: `1px solid ${emp.accent}22` }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span>{emp.emoji}</span>
                    <span className="text-xs font-semibold" style={{ color: emp.accent }}>{emp.name}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {['daily', 'weekly', 'systems'].map(type => (
                      <button
                        key={type}
                        onClick={() => generateTasks(emp.id, type)}
                        disabled={generating[`${emp.id}-${type}`]}
                        className="text-xs py-1 rounded disabled:opacity-50 transition-opacity capitalize"
                        style={{
                          background: '#0B1829',
                          color: type === 'systems' ? emp.accent : '#5A7A99',
                          border: `1px solid ${type === 'systems' ? emp.accent + '33' : '#1A3350'}`,
                        }}
                      >
                        {generating[`${emp.id}-${type}`] ? '...' : type === 'systems' ? '⚙ Setup' : `+ ${type}`}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-5">

        {/* Filter pills */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {[{ id: 'all', emoji: '◈', name: 'All', accent: '#C9A026' }, ...employeeList].map(e => (
            <button
              key={e.id}
              onClick={() => setFilter(e.id)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all"
              style={{
                background: filter === e.id ? e.accent : '#112236',
                color: filter === e.id ? '#0B1829' : '#5A7A99',
                border: `1px solid ${filter === e.id ? e.accent : '#1A3350'}`,
                fontWeight: filter === e.id ? 600 : 400,
              }}
            >
              {e.emoji} {e.name}
              {e.id !== 'all' && tasks.filter(t => t.employee === e.id && t.status === 'pending').length > 0 && (
                <span className="w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold"
                  style={{ background: filter === e.id ? '#0B182966' : e.accent + '33', color: filter === e.id ? '#0B1829' : e.accent }}>
                  {tasks.filter(t => t.employee === e.id && t.status === 'pending').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex gap-1.5">
              {[0,1,2].map(i => (
                <span key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#C9A026', animationDelay: `${i*150}ms` }} />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Kanban */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {COLS.map(col => {
                const colTasks = filtered.filter(t => t.status === col.key)
                return (
                  <div key={col.key}>
                    {/* Column header */}
                    <div className="flex items-center gap-2.5 mb-3 pb-3" style={{ borderBottom: `2px solid ${col.color}22` }}>
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: col.color }} />
                      <span className="text-sm font-semibold" style={{ color: col.color }}>{col.label}</span>
                      <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${col.color}18`, color: col.color }}>
                        {colTasks.length}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {colTasks.length === 0 && (
                        <div className="rounded-xl py-10 text-center text-xs" style={{ color: '#1A3350', border: '1px dashed #1A3350' }}>
                          Empty
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
                          onRefresh={fetchTasks}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Rejected (collapsed) */}
            {rejected.length > 0 && (
              <details className="mt-8">
                <summary className="text-xs cursor-pointer select-none" style={{ color: '#2A4560' }}>
                  {rejected.length} rejected — show
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
                      onRefresh={fetchTasks}
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

function TaskCard({ task, colColor, onApprove, onReject, onDelete, onRun, onMarkDone, isRunning, output, onRefresh }) {
  const emp = employees[task.employee]
  const [showOutput, setShowOutput] = useState(false)
  const [handoffTo, setHandoffTo]   = useState('')
  const [handing, setHanding]       = useState(false)
  const [pushing, setPushing]       = useState(false)
  const [prUrl, setPrUrl]           = useState(task.prUrl || '')
  const [prError, setPrError]       = useState('')

  useEffect(() => { if (output) setShowOutput(true) }, [output])

  async function pushToGitHub() {
    const content = output || task.output
    if (!content || !task.filePath || !task.repo) return
    setPushing(true); setPrError('')
    try {
      // Read current SHA (file may not exist yet)
      let currentSha
      try {
        const readRes = await fetch('/api/github/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repo: task.repo, path: task.filePath }),
        })
        const readData = await readRes.json()
        if (readData.type === 'file') currentSha = readData.sha
      } catch {}

      const writeRes = await fetch('/api/github/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: task.repo,
          path: task.filePath,
          content,
          message: `[${task.employee}] ${task.title}`,
          currentSha,
        }),
      })
      const writeData = await writeRes.json()
      if (writeData.pr_url) {
        setPrUrl(writeData.pr_url)
        await fetch(`/api/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prUrl: writeData.pr_url }),
        })
      } else {
        setPrError(writeData.error || 'PR creation failed')
      }
    } catch (e) {
      setPrError('Request failed')
    } finally {
      setPushing(false)
    }
  }

  async function doHandoff() {
    if (!handoffTo) return
    setHanding(true)
    await fetch('/api/tasks/handoff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromTask: { ...task, output: output || task.output }, toEmployeeId: handoffTo }),
    })
    setHandoffTo(''); setHanding(false); onRefresh?.()
  }

  const typeColor = { daily: '#3A5A7A', weekly: '#2A4A6A', systems: emp?.accent + '99', handoff: '#9B59B655' }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: '#112236', border: '1px solid #1A3350', borderLeft: `3px solid ${emp?.accent || colColor}` }}
    >
      <div className="p-4">
        {/* Top row: employee + badges */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-base leading-none">{emp?.emoji}</span>
            <span className="text-xs font-semibold" style={{ color: emp?.accent }}>{emp?.name}</span>
            {task.handoffFrom && (
              <span className="text-xs" style={{ color: '#5A7A99' }}>← {employees[task.handoffFrom]?.name}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: typeColor[task.type] || '#1A3350', color: '#8899AA' }}>
              {TYPE_LABEL[task.type] || task.type}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#0D1F35', color: '#4A6A8A' }}>
              {BRAND_LABEL[task.brand]}
            </span>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PRIORITY_DOT[task.priority] }} title={task.priority} />
          </div>
        </div>

        {/* Title */}
        <div className="text-sm font-semibold mb-1 leading-snug" style={{ color: '#E8EDF2' }}>{task.title}</div>
        <p className="text-xs leading-relaxed" style={{ color: '#5A7A99' }}>{task.description}</p>

        {/* Running */}
        {isRunning && (
          <div className="flex items-center gap-2 mt-3 text-xs" style={{ color: '#5A7A99' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: emp?.accent }} />
            {emp?.name} is working...
          </div>
        )}

        {/* Output */}
        {(output || task.output) && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <button onClick={() => setShowOutput(v => !v)} className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#5CB85C' }}>
                <span>{showOutput ? '▼' : '▶'}</span>
                <span>{showOutput ? 'Hide output' : 'View output'}</span>
              </button>
              {/* Auto-PR button for file-targeting tasks */}
              {task.filePath && task.repo && (
                prUrl ? (
                  <a href={prUrl} target="_blank" rel="noreferrer"
                    className="text-xs px-2 py-0.5 rounded font-medium"
                    style={{ background: '#5CB85C22', color: '#5CB85C', border: '1px solid #5CB85C44' }}>
                    ✓ PR open ↗
                  </a>
                ) : (
                  <button onClick={pushToGitHub} disabled={pushing}
                    className="text-xs px-2 py-0.5 rounded font-medium disabled:opacity-50"
                    style={{ background: '#4A90D922', color: '#4A90D9', border: '1px solid #4A90D944' }}>
                    {pushing ? 'Pushing...' : '→ Push to GitHub'}
                  </button>
                )
              )}
            </div>
            {prError && <div className="text-xs mb-1" style={{ color: '#E84393' }}>{prError}</div>}
            {/* File target indicator */}
            {task.filePath && (
              <div className="text-xs mb-1.5 font-mono" style={{ color: '#2A4560' }}>
                {task.repo}/{task.filePath}
              </div>
            )}
            {showOutput && (
              <div
                className="mt-2 text-xs leading-relaxed p-3 rounded-lg overflow-auto prose-chat"
                style={{ background: '#0B1829', color: '#8899AA', maxHeight: '180px', border: '1px solid #1A3350' }}
                dangerouslySetInnerHTML={{ __html: formatMsg(output || task.output) }}
              />
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid #0D1F35' }}>
          {task.status === 'pending' && (
            <>
              <button onClick={onApprove} className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-opacity hover:opacity-80"
                style={{ background: '#4A90D922', color: '#4A90D9', border: '1px solid #4A90D944' }}>
                Approve
              </button>
              <button onClick={onReject} className="text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                style={{ background: '#1A3350', color: '#5A7A99' }}>
                Reject
              </button>
            </>
          )}
          {task.status === 'approved' && (
            <>
              <button onClick={onRun} disabled={isRunning}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50 transition-opacity hover:opacity-80"
                style={{ background: `${emp?.accent}22`, color: emp?.accent, border: `1px solid ${emp?.accent}44` }}>
                {isRunning ? 'Running...' : '▶ Run'}
              </button>
              <button onClick={onMarkDone} className="text-xs px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                style={{ background: '#1A3350', color: '#5A7A99' }}>
                Mark done
              </button>
            </>
          )}
          {task.status === 'rejected' && (
            <button onClick={onApprove} className="text-xs px-2.5 py-1.5 rounded-lg"
              style={{ background: '#1A3350', color: '#5A7A99' }}>
              Restore
            </button>
          )}
          <button onClick={onDelete} className="ml-auto text-xs w-6 h-6 flex items-center justify-center rounded transition-opacity hover:opacity-80"
            style={{ color: '#2A4560' }}>✕
          </button>
        </div>
      </div>

      {/* Handoff bar */}
      {task.status === 'done' && (task.output || output) && (
        <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: '#0D1F35', borderTop: '1px solid #1A3350' }}>
          <span className="text-xs" style={{ color: '#3A5A7A' }}>Hand off →</span>
          <select value={handoffTo} onChange={e => setHandoffTo(e.target.value)}
            className="flex-1 text-xs rounded-lg px-2 py-1 outline-none"
            style={{ background: '#112236', color: '#5A7A99', border: '1px solid #1A3350' }}>
            <option value="">Pick employee...</option>
            {Object.values(employees).filter(e => e.id !== task.employee).map(e => (
              <option key={e.id} value={e.id}>{e.emoji} {e.name}</option>
            ))}
          </select>
          <button onClick={doHandoff} disabled={!handoffTo || handing}
            className="text-xs px-2.5 py-1 rounded-lg font-medium disabled:opacity-40 transition-opacity hover:opacity-80"
            style={{ background: '#4A90D922', color: '#4A90D9', border: '1px solid #4A90D944' }}>
            {handing ? '...' : 'Send'}
          </button>
        </div>
      )}
    </div>
  )
}

function formatMsg(content) {
  if (!content) return ''
  return content
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>').replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '<br/><br/>').replace(/\n/g, '<br/>')
}
