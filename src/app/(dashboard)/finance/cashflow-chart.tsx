'use client'

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export function CashflowChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-full items-center justify-center text-zinc-500 text-sm py-10">Nedostatek dat pro graf.</div>
  }

  // Agregace dat podle data
  const aggregated = data.reduce((acc: any, curr: any) => {
    const dateStr = new Date(curr.date).toLocaleDateString('cs-CZ', { month: 'short', day: 'numeric' })
    if (!acc[dateStr]) {
      acc[dateStr] = { date: dateStr, income: 0, expense: 0, balance: 0 }
    }
    if (curr.type === 'income') {
      acc[dateStr].income += Number(curr.amount)
      acc[dateStr].balance += Number(curr.amount)
    } else {
      acc[dateStr].expense += Number(curr.amount)
      acc[dateStr].balance -= Number(curr.amount)
    }
    return acc
  }, {})

  // Vytvoření průběžného zůstatku
  const chartData = Object.values(aggregated)
  let currentBalance = 0;
  chartData.forEach((item: any) => {
    currentBalance += item.balance;
    item.cumulativeBalance = currentBalance;
  });

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
        <XAxis 
          dataKey="date" 
          stroke="#888888" 
          fontSize={12} 
          tickLine={false} 
          axisLine={false} 
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}`}
        />
        <Tooltip 
          contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: '1px solid #e4e4e7', color: '#18181b' }}
          itemStyle={{ color: '#18181b' }}
        />
        <Line type="monotone" name="Zůstatek" dataKey="cumulativeBalance" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
        <Line type="monotone" name="Příjmy" dataKey="income" stroke="#10b981" strokeWidth={2} dot={false} strokeOpacity={0.6} />
        <Line type="monotone" name="Výdaje" dataKey="expense" stroke="#ef4444" strokeWidth={2} dot={false} strokeOpacity={0.6} />
      </LineChart>
    </ResponsiveContainer>
  )
}
