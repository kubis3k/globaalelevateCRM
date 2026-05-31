'use client'

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const czk = (n: number) =>
  new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(n)

export function CashflowChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        Nedostatek dat pro graf.
      </div>
    )
  }

  const aggregated = data.reduce((acc: any, curr: any) => {
    const dateStr = new Date(curr.date).toLocaleDateString('cs-CZ', { month: 'short', day: 'numeric' })
    if (!acc[dateStr]) acc[dateStr] = { date: dateStr, balance: 0 }
    acc[dateStr].balance += curr.type === 'income' ? Number(curr.amount) : -Number(curr.amount)
    return acc
  }, {})

  const chartData = Object.values(aggregated) as any[]
  let running = 0
  chartData.forEach((item) => {
    running += item.balance
    item.cumulativeBalance = running
  })

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          width={52}
          tickFormatter={(v) => new Intl.NumberFormat('cs-CZ', { notation: 'compact' }).format(Number(v))}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--popover)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            color: 'var(--popover-foreground)',
            fontSize: '12px',
            boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)',
          }}
          labelStyle={{ color: 'var(--muted-foreground)', marginBottom: 2 }}
          formatter={(value: any) => [czk(Number(value)), 'Zůstatek']}
        />
        <Area
          type="monotone"
          name="Zůstatek"
          dataKey="cumulativeBalance"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#balanceFill)"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
