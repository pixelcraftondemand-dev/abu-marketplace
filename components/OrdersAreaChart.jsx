'use client'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useSelector } from 'react-redux'
import useExchangeRate from '@/lib/hooks/useExchangeRate'
import { formatPrice, formatPriceCompact, getLocaleForLanguage, DEFAULT_CURRENCY } from '@/lib/utils/currency'

export default function OrdersAreaChart({ allOrders }) {
    const selectedCurrency = useSelector((state) => state.preferences.selectedCurrency)
    const selectedLanguage = useSelector((state) => state.preferences.selectedLanguage)
    const locale = getLocaleForLanguage(selectedLanguage)
    const { rate } = useExchangeRate(DEFAULT_CURRENCY, selectedCurrency)

    const ordersPerDay = allOrders.reduce((acc, order) => {
        const date = new Date(order.createdAt).toISOString().split('T')[0]
        if (!acc[date]) {
            acc[date] = { date, orders: 0, revenue: 0 }
        }
        acc[date].orders += 1
        acc[date].revenue += Number(order.total || 0)
        return acc
    }, {})

    const chartData = Object.values(ordersPerDay)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((d) => ({
            ...d,
            // Canonical revenue is USD; convert for display only.
            revenue: rate != null ? d.revenue * rate : d.revenue,
        }))

    const formatMoney = (value) => formatPrice(Number(value), selectedCurrency, locale)
    // Compact axis labels (e.g. "SLe 25.3K") so tall converted values stay readable.
    const formatAxis = (value) => formatPriceCompact(Number(value), selectedCurrency, locale)

    return (
        <div className="h-[320px] w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E7E2D8" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" allowDecimals={false} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tickFormatter={formatAxis} width={80} />
                    <Tooltip
                        formatter={(value, name) => {
                            if (name === 'revenue') return [formatMoney(value), 'Revenue']
                            return [value, 'Orders']
                        }}
                    />
                    <Area yAxisId="left" type="monotone" dataKey="orders" stroke="#2F6FEA" fill="#93B9FF" strokeWidth={2} />
                    <Area yAxisId="right" type="monotone" dataKey="revenue" stroke="#C9A96E" fill="#F0E3D1" strokeWidth={2} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}
