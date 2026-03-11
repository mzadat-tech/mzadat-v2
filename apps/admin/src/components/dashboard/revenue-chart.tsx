'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface RevenueChartProps {
  data: { date: string; revenue: number; orders: number }[]
  currency: string
}

export function RevenueChart({ data, currency }: RevenueChartProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-[13px] font-semibold text-gray-900">Revenue</h2>
          <p className="text-[11px] text-gray-400">Last 7 days</p>
        </div>
      </div>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#12456e" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#12456e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}`}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 6,
                border: '1px solid #e5e7eb',
                backgroundColor: '#fff',
                boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.06)',
              }}
              formatter={(value: number) => [`${currency} ${value.toFixed(3)}`, 'Revenue']}
              labelStyle={{ fontSize: 11, color: '#6b7280' }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#12456e"
              strokeWidth={1.5}
              fill="url(#revenueGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
