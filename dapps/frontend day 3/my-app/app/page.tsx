'use client'

import { useState, useEffect } from 'react'
import {
  useAccount,
  useConnect,
  useDisconnect,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { injected } from 'wagmi/connectors'
import { SIMPLE_STORAGE_ADDRESS } from '@/src/contracts/address'
import { SIMPLE_STORAGE_ABI } from '@/src/contracts/abi/SimpleStorage'

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL

export default function Page() {
  // ==========================
  // STATE
  // ==========================
  const [mounted, setMounted] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [backendValue, setBackendValue] = useState('0')
  const [events, setEvents] = useState<any[]>([])
  const [loadingValue, setLoadingValue] = useState(false)
  const [loadingEvents, setLoadingEvents] = useState(false)

  useEffect(() => setMounted(true), [])

  // ==========================
  // WALLET
  // ==========================
  const { address, isConnected } = useAccount()
  const { connect, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()

  const shortenAddress = (addr?: string) =>
    addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : ''

  // ==========================
  // WRITE CONTRACT (wagmi v2)
  // ==========================
  const {
    writeContract,
    data: txHash,
    isPending: isWriting,
  } = useWriteContract()

  const {
    isLoading: isConfirming,
    isSuccess,
  } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  const handleSetValue = () => {
    if (!inputValue) return

    try {
      writeContract({
        address: SIMPLE_STORAGE_ADDRESS,
        abi: SIMPLE_STORAGE_ABI,
        functionName: 'setValue',
        args: [BigInt(inputValue)],
      })
    } catch (err) {
      console.error('Set value failed:', err)
    }
  }

  // ==========================
  // FETCH BACKEND
  // ==========================
  const fetchBackendValue = async () => {
    setLoadingValue(true)
    try {
      const res = await fetch(`${BACKEND}/blockchain/value`)
      const data = await res.json()
      setBackendValue(data.value)
    } catch (e) {
      console.error('Fetch value failed', e)
    }
    setLoadingValue(false)
  }

  const fetchEvents = async () => {
    setLoadingEvents(true)
    try {
      const res = await fetch(`${BACKEND}/blockchain/events`)
      const json = await res.json()
      if (Array.isArray(json?.data)) {
        setEvents(json.data.reverse())
      } else {
        setEvents([])
      }
    } catch (e) {
      console.error('Fetch events failed:', e)
      setEvents([])
    }
    setLoadingEvents(false)
  }

  const refreshEvents = async () => {
    setLoadingEvents(true)
    try {
      await fetch(`${BACKEND}/blockchain/update-events`, { method: 'POST' })
      await new Promise((r) => setTimeout(r, 3000))
      await fetchEvents()
    } catch (e) {
      console.error('Refresh events failed:', e)
    }
    setLoadingEvents(false)
  }

  // ==========================
  // EFFECTS
  // ==========================
  useEffect(() => {
    fetchBackendValue()
    fetchEvents()
  }, [])

  useEffect(() => {
    if (isSuccess) {
      setInputValue('')
      fetchBackendValue()
      fetchEvents()
    }
  }, [isSuccess])

  if (!mounted) return null

  // ==========================
  // UI
  // ==========================
  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center p-6 space-y-6">
      <h1 className="text-2xl font-bold">Day 3 – Full Stack dApp</h1>
      <h1 className="text-xl font-bold">Muhammad Nur Jagat Arya Damar</h1>
      <h1 className="text-lg font-bold">241011400372</h1>

      <div className="flex flex-wrap gap-4 justify-center w-full">
        {/* WALLET */}
        <div className="bg-slate-800 rounded-xl p-6 w-64 space-y-3">
          <h2 className="text-xl font-bold">Wallet</h2>
          {!isConnected ? (
            <button
              onClick={() => connect({ connector: injected() })}
              disabled={isConnecting}
              className="w-full bg-indigo-600 hover:bg-indigo-500 py-2 rounded"
            >
              {isConnecting ? 'Connecting…' : 'Connect Wallet'}
            </button>
          ) : (
            <>
              <p className="font-mono">{shortenAddress(address)}</p>
              <button
                onClick={() => disconnect()}
                className="text-sm text-red-400 underline"
              >
                Disconnect
              </button>
            </>
          )}
        </div>

        {/* VALUE */}
        <div className="bg-slate-800 rounded-xl p-6 w-64 space-y-3">
          <h2 className="text-xl font-bold">Contract Value</h2>
          <p className="text-2xl">
            {loadingValue ? 'Loading…' : backendValue}
          </p>
          <button
            onClick={fetchBackendValue}
            className="w-full bg-slate-700 py-2 rounded"
          >
            Refresh
          </button>
        </div>

        {/* SET VALUE */}
        <div className="bg-slate-800 rounded-xl p-6 w-64 space-y-3">
          <h2 className="text-xl font-bold">Update Value</h2>
          <input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700"
            placeholder="New value"
          />
          <button
            onClick={handleSetValue}
            disabled={!inputValue || isWriting || isConfirming}
            className="w-full bg-indigo-600 py-2 rounded disabled:bg-slate-600"
          >
            {isWriting
              ? 'Waiting Wallet…'
              : isConfirming
              ? 'Confirming…'
              : 'Set Value'}
          </button>
        </div>
      </div>

      {/* EVENTS */}
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-4xl">
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-bold">Contract Events</h2>
          <button
            onClick={refreshEvents}
            disabled={loadingEvents}
            className="bg-indigo-600 px-4 py-2 rounded disabled:bg-slate-600"
          >
            {loadingEvents ? 'Refreshing…' : 'Refresh Events'}
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto border border-slate-700 rounded">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 sticky top-0">
              <tr>
                <th className="p-2 text-left">Block</th>
                <th className="p-2 text-left">Value</th>
                <th className="p-2 text-left">Tx Hash</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 && !loadingEvents && (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-slate-400">
                    No events
                  </td>
                </tr>
              )}
              {events.map((e, i) => (
                <tr key={i} className="border-t border-slate-700">
                  <td className="p-2 font-mono">{e.blockNumber}</td>
                  <td className="p-2">{e.value}</td>
                  <td className="p-2 font-mono">
                    {e.txHash.slice(0, 12)}…
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
