'use client'

import Loading from '@/components/Loading'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Ban,
  CheckCircle2,
  Clock,
  DollarSign,
  Eye,
  RotateCcw,
  Shield,
  TrendingDown,
  TrendingUp,
  XCircle,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

// ─── Color palette ────────────────────────────────────────────────────────────

const COLORS = {
  gold: '#C9A96E',
  goldLight: '#F0E3D1',
  green: '#56C27A',
  greenLight: '#D7F7E3',
  red: '#E05252',
  redLight: '#FEF2F2',
  blue: '#5D83F8',
  blueLight: '#D9E7FF',
  purple: '#8B5CF6',
  purpleLight: '#EDE9FE',
  slate: '#64748B',
}

const TIER_COLORS = {
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
  medium: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
}

// ─── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({ title, value, subtitle, icon: Icon, color, trend }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className={`inline-flex rounded-xl p-2.5`} style={{ backgroundColor: color + '20' }}>
          <Icon size={18} style={{ color }} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      <p className="mt-3 text-sm text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
    </div>
  )
}

// ─── Alert history row ────────────────────────────────────────────────────────

function AlertRow({ alert }) {
  const tier = TIER_COLORS[alert.tier] || TIER_COLORS.medium
  const time = new Date(alert.firedAt).toLocaleString('en-US', {
    timeZone: 'Africa/Freetown',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className={`flex items-start gap-3 rounded-xl border ${tier.border} ${tier.bg} px-4 py-3`}>
      <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${tier.dot}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold uppercase ${tier.text}`}>{alert.tier}</span>
          <span className="text-xs text-slate-400">·</span>
          <span className="text-xs text-slate-500">{alert.metric}</span>
        </div>
        <p className="mt-1 text-sm text-slate-700 line-clamp-2">{alert.message}</p>
        <p className="mt-1 text-xs text-slate-400">{time}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold text-slate-900">{alert.actualValue}</p>
        <p className="text-xs text-slate-400">threshold: {alert.threshold}</p>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MonitoringDashboard() {
  const { user } = useUser()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [alertHistory, setAlertHistory] = useState([])
  const [alertConfig, setAlertConfig] = useState([])
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      try {
        const [metricsRes, alertsRes, configRes] = await Promise.all([
          axios.get('/api/admin/monitoring'),
          axios.get('/api/admin/monitoring?view=alerts&limit=50'),
          axios.get('/api/admin/monitoring?view=config'),
        ])
        setData(metricsRes.data)
        setAlertHistory(alertsRes.data.alerts || [])
        setAlertConfig(configRes.data.configs || [])
      } catch (error) {
        toast.error(error?.response?.data?.error || 'Failed to load monitoring data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  if (loading) return <Loading />
  if (!data) return <div className="p-8 text-center text-slate-500">No monitoring data available</div>

  const { metrics, recentAlerts, alertCounts, generatedAt } = data

  // ── Derived values ────────────────────────────────────────────────────────

  const successRate = metrics?.payment_success_rate?.value ?? 100
  const refundRate = metrics?.refund_rate?.value ?? 0
  const disputeRate = metrics?.dispute_rate?.value ?? 0
  const ledgerBalanced = metrics?.ledger_balance?.metadata?.balanced ?? true
  const ledgerImbalance = metrics?.ledger_balance?.value ?? 0
  const settlementFailRate = metrics?.settlement_failure_rate?.value ?? 0
  const webhookLag = metrics?.webhook_processing_lag?.value ?? 0
  const idempotencyConflict = metrics?.idempotency_conflict_rate?.value ?? 0
  const rateLimitTriggers = metrics?.rate_limit_triggers?.value ?? 0
  const fraudHigh = metrics?.fraud_score_distribution?.value ?? 0
  const fraudDist = metrics?.fraud_score_distribution?.metadata?.distribution ?? { low: 0, medium: 0, high: 0, critical: 0 }

  // ── Chart data: Fraud distribution ────────────────────────────────────────

  const fraudChartData = [
    { name: 'Low', value: fraudDist.low, color: COLORS.green },
    { name: 'Medium', value: fraudDist.medium, color: COLORS.gold },
    { name: 'High', value: fraudDist.high, color: '#F97316' },
    { name: 'Critical', value: fraudDist.critical, color: COLORS.red },
  ].filter((d) => d.value > 0)

  // ── Chart data: Alert distribution by tier ────────────────────────────────

  const alertTierData = [
    { name: 'Critical', value: alertCounts?.critical || 0, color: COLORS.red },
    { name: 'High', value: alertCounts?.high || 0, color: '#F97316' },
    { name: 'Medium', value: alertCounts?.medium || 0, color: COLORS.blue },
  ].filter((d) => d.value > 0)

  // ── Chart data: Metric health bar ─────────────────────────────────────────

  const healthMetrics = [
    { name: 'Payment Success', value: successRate, max: 100, unit: '%', good: successRate >= 95, color: successRate >= 95 ? COLORS.green : successRate >= 80 ? COLORS.gold : COLORS.red },
    { name: 'Refund Rate', value: (refundRate * 100).toFixed(2), max: 100, unit: '%', good: refundRate < 0.05, color: refundRate < 0.05 ? COLORS.green : refundRate < 0.15 ? COLORS.gold : COLORS.red },
    { name: 'Dispute Rate', value: (disputeRate * 100).toFixed(2), max: 100, unit: '%', good: disputeRate < 0.01, color: disputeRate < 0.01 ? COLORS.green : disputeRate < 0.05 ? COLORS.gold : COLORS.red },
    { name: 'Settlement Fail', value: (settlementFailRate * 100).toFixed(0), max: 100, unit: '%', good: settlementFailRate === 0, color: settlementFailRate === 0 ? COLORS.green : COLORS.red },
    { name: 'Idempotency Conflict', value: (idempotencyConflict * 100).toFixed(1), max: 100, unit: '%', good: idempotencyConflict < 0.05, color: idempotencyConflict < 0.05 ? COLORS.green : COLORS.gold },
    { name: 'Rate Limit Triggers', value: rateLimitTriggers, max: Math.max(rateLimitTriggers * 2, 20), unit: '', good: rateLimitTriggers < 10, color: rateLimitTriggers < 10 ? COLORS.green : COLORS.gold },
  ]

  return (
    <div className="space-y-8 pb-20 text-slate-700">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-[#1A1A1A] via-[#232323] to-[#2D2D2D] p-8 text-white shadow-[0_25px_80px_rgba(0,0,0,0.14)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#C9A96E]">Monitoring &amp; alerting</p>
            <h1 className="mt-3 text-3xl font-semibold">Payment system health</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Real-time metrics, alert history, and threshold configuration for the payment gateway.
              Data refreshes on each page load.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm backdrop-blur">
              <p className="text-slate-300">Last check</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {new Date(generatedAt).toLocaleTimeString('en-US', { timeZone: 'Africa/Freetown', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm backdrop-blur">
              <p className="text-slate-300">Alerts (24h)</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {(alertCounts?.critical || 0) + (alertCounts?.high || 0) + (alertCounts?.medium || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'alerts', label: 'Alert History' },
          { id: 'config', label: 'Thresholds' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
              activeTab === tab.id
                ? 'bg-[#1A1A1A] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB: Overview                                                     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <>
          {/* ── Summary cards ──────────────────────────────────────────── */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Payment success rate"
              value={`${successRate.toFixed(1)}%`}
              subtitle={successRate >= 95 ? 'Healthy' : 'Degraded'}
              icon={CheckCircle2}
              color={successRate >= 95 ? COLORS.green : successRate >= 80 ? COLORS.gold : COLORS.red}
            />
            <MetricCard
              title="Refund rate"
              value={`${(refundRate * 100).toFixed(2)}%`}
              subtitle="7-day trailing"
              icon={RotateCcw}
              color={refundRate < 0.05 ? COLORS.green : COLORS.gold}
            />
            <MetricCard
              title="Dispute rate"
              value={`${(disputeRate * 100).toFixed(2)}%`}
              subtitle="7-day trailing"
              icon={AlertTriangle}
              color={disputeRate < 0.01 ? COLORS.green : COLORS.red}
            />
            <MetricCard
              title="Ledger balance"
              value={ledgerBalanced ? 'Balanced' : `$${ledgerImbalance.toFixed(2)} off`}
              subtitle={ledgerBalanced ? 'Debits = credits' : 'IMBALANCE DETECTED'}
              icon={ledgerBalanced ? BadgeCheck : XCircle}
              color={ledgerBalanced ? COLORS.green : COLORS.red}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Settlement failures"
              value={`${(settlementFailRate * 100).toFixed(0)}%`}
              subtitle="Last 24h"
              icon={DollarSign}
              color={settlementFailRate === 0 ? COLORS.green : COLORS.red}
            />
            <MetricCard
              title="Webhook processing lag"
              value={`${webhookLag}ms`}
              subtitle="Average"
              icon={Clock}
              color={webhookLag < 5000 ? COLORS.green : COLORS.gold}
            />
            <MetricCard
              title="Fraud events (high+critical)"
              value={fraudHigh}
              subtitle="Last hour"
              icon={Shield}
              color={fraudHigh === 0 ? COLORS.green : COLORS.red}
            />
            <MetricCard
              title="Rate limit triggers"
              value={rateLimitTriggers}
              subtitle="Card testing attempts"
              icon={Ban}
              color={rateLimitTriggers < 10 ? COLORS.green : COLORS.gold}
            />
          </div>

          {/* ── Charts row ─────────────────────────────────────────────── */}
          <div className="grid gap-6 xl:grid-cols-2">
            {/* Metric health bars */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#A2825F]">System health</p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-900">Key metrics at a glance</h2>
                </div>
                <Activity size={18} className="text-slate-400" />
              </div>
              <div className="mt-6 space-y-4">
                {healthMetrics.map((m) => (
                  <div key={m.name}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{m.name}</span>
                      <span className="font-medium text-slate-900">{m.value}{m.unit}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min((Number(m.value) / m.max) * 100, 100)}%`,
                          backgroundColor: m.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fraud distribution pie */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#A2825F]">Risk profile</p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-900">Fraud score distribution</h2>
                </div>
                <Shield size={18} className="text-slate-400" />
              </div>
              <div className="mt-6 flex items-center justify-center">
                {fraudChartData.length > 0 ? (
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={fraudChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {fraudChartData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="py-12 text-sm text-slate-400">No fraud events in the last hour</p>
                )}
              </div>
              {fraudChartData.length > 0 && (
                <div className="mt-4 flex flex-wrap justify-center gap-4">
                  {fraudChartData.map((d) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-slate-600">{d.name}</span>
                      <span className="font-medium text-slate-900">{d.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Alert tier distribution ────────────────────────────────── */}
          {alertTierData.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#A2825F]">Alert activity</p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-900">Alerts fired in the last 24 hours</h2>
                </div>
                <AlertTriangle size={18} className="text-slate-400" />
              </div>
              <div className="mt-6 h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={alertTierData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E7E2D8" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {alertTierData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Recent alerts list ─────────────────────────────────────── */}
          {recentAlerts.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#A2825F]">Recent alerts</p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-900">Latest triggered alerts</h2>
                </div>
                <Eye size={18} className="text-slate-400" />
              </div>
              <div className="mt-5 space-y-3">
                {recentAlerts.slice(0, 5).map((alert) => (
                  <AlertRow key={alert.id} alert={alert} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB: Alert History                                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'alerts' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#A2825F]">Audit trail</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-900">All fired alerts (last 50)</h2>
            </div>
          </div>
          {alertHistory.length > 0 ? (
            <div className="mt-5 space-y-3">
              {alertHistory.map((alert) => (
                <AlertRow key={alert.id} alert={alert} />
              ))}
            </div>
          ) : (
            <div className="mt-12 text-center">
              <CheckCircle2 size={40} className="mx-auto text-green-400" />
              <p className="mt-4 text-sm text-slate-500">No alerts fired recently. All systems nominal.</p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB: Thresholds                                                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'config' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#A2825F]">Configuration</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-900">Alert thresholds</h2>
              <p className="mt-1 text-sm text-slate-500">These are configurable via the database — no code deploy needed to adjust.</p>
            </div>
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="pb-3 pr-4">Metric</th>
                  <th className="pb-3 pr-4">Tier</th>
                  <th className="pb-3 pr-4">Threshold</th>
                  <th className="pb-3 pr-4">Operator</th>
                  <th className="pb-3 pr-4">Window</th>
                  <th className="pb-3 pr-4">Cooldown</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alertConfig.map((cfg) => {
                  const tier = TIER_COLORS[cfg.tier] || TIER_COLORS.medium
                  return (
                    <tr key={cfg.id} className="hover:bg-slate-50">
                      <td className="py-3 pr-4 font-medium text-slate-900">{cfg.metric}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${tier.bg} ${tier.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${tier.dot}`} />
                          {cfg.tier}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-mono text-slate-700">{cfg.threshold}</td>
                      <td className="py-3 pr-4 text-slate-500">{cfg.operator}</td>
                      <td className="py-3 pr-4 text-slate-500">{cfg.windowMin}m</td>
                      <td className="py-3 pr-4 text-slate-500">{cfg.cooldownMin}m</td>
                      <td className="py-3">
                        {cfg.enabled ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                            <CheckCircle2 size={12} /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                            <XCircle size={12} /> Disabled
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}


