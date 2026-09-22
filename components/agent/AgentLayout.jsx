'use client'
import { useEffect, useState } from "react"
import axios from "axios"
import Link from "next/link"
import { ArrowRightIcon, Banknote } from "lucide-react"
import AgentNavbar from "./AgentNavbar"
import AgentSidebar from "./AgentSidebar"
import Loading from "@/components/Loading"

const AgentLayout = ({ children }) => {
    const [isAgent, setIsAgent] = useState(false)
    const [agentInfo, setAgentInfo] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const check = async () => {
            try {
                const { data } = await axios.get("/api/agent/status")
                if (data.isAgent) {
                    setIsAgent(true)
                    setAgentInfo(data.agent)
                }
            } catch (err) {
                console.error("[AgentLayout]", err?.response?.data || err.message)
            } finally {
                setLoading(false)
            }
        }
        check()
    }, [])

    if (loading) return <Loading />

    if (!isAgent) return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 gap-4">
            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-2">
                <Banknote size={24} className="text-amber-400" />
            </div>
            <h1 className="text-2xl font-semibold text-slate-600">Agent access required</h1>
            <p className="text-slate-400 text-sm max-w-sm">
                You are not registered as an AMBER PAY agent. Contact support to become an agent.
            </p>
            <Link href="/" className="bg-slate-800 text-white flex items-center gap-2 mt-2 py-2.5 px-6 text-sm rounded-full hover:bg-slate-900 transition">
                Go to Home <ArrowRightIcon size={15} />
            </Link>
        </div>
    )

    return (
        <div className="flex flex-col h-screen bg-slate-50">
            <AgentNavbar agentInfo={agentInfo} />
            <div className="flex flex-1 overflow-hidden">
                <AgentSidebar agentInfo={agentInfo} />
                <main className="flex-1 overflow-y-auto p-6 lg:p-10">
                    {children}
                </main>
            </div>
        </div>
    )
}

export default AgentLayout
