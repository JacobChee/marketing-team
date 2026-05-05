'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import './globals.css'
import { employeeList } from '../lib/employees'

export default function Dashboard() {
  const [pendingCounts, setPendingCounts] = useState({})

  useEffect(() => {
    fetch('/api/tasks?status=pending')
      .then(r => r.json())
      .then(tasks => {
        const counts = {}
        tasks.forEach(t => { counts[t.employee] = (counts[t.employee] || 0) + 1 })
        setPendingCounts(counts)
      })
      .catch(() => {})
  }, [])

  const totalPending = Object.values(pendingCounts).reduce((a, b) => a + b, 0)

  return (
    <div className="min-h-screen" style={{ background: '#0B1829' }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: '#1A3350' }}>
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#C9A026' }}>
              The Team
            </h1>
            <p className="text-sm mt-0.5" style={{ color: '#5A7A99' }}>
              afix.sg &nbsp;·&nbsp; atsell.io
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/tasks"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
              style={{ background: '#112236', color: '#C9A026', border: '1px solid #1A3350' }}
            >
              Task Board
              {totalPending > 0 && (
                <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold" style={{ background: '#C9A026', color: '#0B1829' }}>
                  {totalPending}
                </span>
              )}
            </Link>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs" style={{ color: '#5A7A99' }}>6 online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {employeeList.map((emp) => (
            <EmployeeCard key={emp.id} emp={emp} pending={pendingCounts[emp.id] || 0} />
          ))}
        </div>
      </div>
    </div>
  )
}

function EmployeeCard({ emp, pending }) {
  return (
    <Link href={`/${emp.id}`}>
      <div
        className="rounded-xl p-5 cursor-pointer transition-all duration-200 group"
        style={{ background: '#112236', border: '1px solid #1A3350' }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = emp.accent
          e.currentTarget.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = '#1A3350'
          e.currentTarget.style.transform = 'translateY(0)'
        }}
      >
        {/* Avatar + name */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden"
              style={{ border: `2px solid ${emp.accent}66`, background: `${emp.accent}22` }}
            >
              <img
                src={`https://api.dicebear.com/9.x/personas/svg?seed=${emp.name}&backgroundColor=transparent`}
                alt={emp.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="font-semibold text-base" style={{ color: '#E8EDF2' }}>{emp.name}</div>
              <div className="text-xs" style={{ color: emp.accent }}>{emp.role}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pending > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: '#C9A02633', color: '#C9A026', border: '1px solid #C9A02655' }}>
                {pending} pending
              </span>
            )}
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#1A3350', color: '#5A7A99' }}>
              online
            </span>
          </div>
        </div>

        {/* Tagline */}
        <p className="text-sm mb-4 italic" style={{ color: '#8899AA' }}>
          "{emp.tagline}"
        </p>

        {/* Skills */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {emp.skills.slice(0, 4).map(skill => (
            <span key={skill} className="text-xs px-2 py-0.5 rounded" style={{ background: '#0B1829', color: '#5A7A99', border: '1px solid #1A3350' }}>
              {skill}
            </span>
          ))}
          {emp.skills.length > 4 && (
            <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#0B1829', color: '#5A7A99', border: '1px solid #1A3350' }}>
              +{emp.skills.length - 4} more
            </span>
          )}
        </div>

        {/* CTA */}
        <div className="flex items-center justify-between text-sm font-medium" style={{ color: emp.accent }}>
          <span>Chat with {emp.name}</span>
          <span className="group-hover:translate-x-1 transition-transform duration-150">→</span>
        </div>
      </div>
    </Link>
  )
}
