'use client'

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type Series = { key: string; label: string; color: string }

export function ProspectsWeeklyChart({ data, series }: { data: any[]; series: Series[] }) {
  const total = data.reduce((a, r) => a + series.reduce((s, se) => s + (r[se.key] || 0), 0), 0)
  if (!total) {
    return <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">Nedostatek dat pro graf.</div>
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--popover-foreground)', fontSize: '12px' }}
          labelStyle={{ color: 'var(--muted-foreground)', marginBottom: 2 }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {series.map((s) => <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={s.color} />)}
      </BarChart>
    </ResponsiveContainer>
  )
}
