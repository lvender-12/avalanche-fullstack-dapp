'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useWriteContract, useReadContract } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { SIMPLE_STORAGE_ADDRESS } from '@/src/contracts/address';
import { SIMPLE_STORAGE_ABI } from '@/src/contracts/abi/SimpleStorage';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;
console.log(BACKEND);

export default function Page() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { address, isConnected } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const [inputValue, setInputValue] = useState('');
  const [backendValue, setBackendValue] = useState('0');
  const [events, setEvents] = useState<any[]>([]);
  const [loadingValue, setLoadingValue] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // ==========================
  // READ & WRITE CONTRACT (frontend)
  // ==========================
  const { writeContract, isPending: isWriting } = useWriteContract();

  const handleSetValue = async () => {
    if (!inputValue) return;

    try {
      const tx = await writeContract({
        address: SIMPLE_STORAGE_ADDRESS,
        abi: SIMPLE_STORAGE_ABI,
        functionName: 'setValue',
        args: [BigInt(inputValue)],
      });

      console.log('Tx hash:', tx?.hash);
      setInputValue('');
      fetchBackendValue();
      fetchEvents();
    } catch (err) {
      console.error('Set value failed:', err);
    }
  };

  const shortenAddress = (addr?: string) =>
    addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '';

  // ==========================
  // FETCH BACKEND
  // ==========================
  const fetchBackendValue = async () => {
    setLoadingValue(true);
    try {
      const res = await fetch(`${BACKEND}/blockchain/value`);
      const data = await res.json();
      setBackendValue(data.value);
    } catch (e) {
      console.error('Fetch value failed', e);
    }
    setLoadingValue(false);
  };

  const fetchEvents = async () => {
    setLoadingEvents(true);

    try {
      const res = await fetch(`${BACKEND}/blockchain/events`);
      const json = await res.json();

      if (json && Array.isArray(json.data)) {
        setEvents(json.data.reverse()); // terbaru di atas
      } else {
        setEvents([]);
      }
    } catch (e) {
      console.error('Fetch events failed:', e);
      setEvents([]);
    }

    setLoadingEvents(false);
  };

  const refreshEvents = async () => {
    setLoadingEvents(true);

    try {
      // trigger backend ambil event dari blockchain
      await fetch(`${BACKEND}/blockchain/update-events`, {
        method: 'POST',
      });

      // tunggu backend selesai
      await new Promise((r) => setTimeout(r, 3000));

      // ambil event dari json backend
      await fetchEvents();
    } catch (e) {
      console.error('Refresh events failed:', e);
    }

    setLoadingEvents(false);
  };




  useEffect(() => {
    fetchBackendValue();
    fetchEvents();
  }, []);
  

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-start p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-4">Day 3 – Full Stack dApp</h1>
      <h1 className="text-2xl font-bold mb-4">muhammad nur jagat arya damar</h1>
      <h1 className="text-2xl font-bold mb-4">241011400372</h1>

      <div className="flex flex-wrap gap-4 w-full justify-center">

        {/* WALLET */}
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg w-64 flex flex-col space-y-3">
          <h2 className="text-xl font-bold">Wallet</h2>
          {!isConnected ? (
            <button
              onClick={() => connect({ connector: injected() })}
              disabled={isConnecting}
              className="w-full bg-indigo-600 hover:bg-indigo-500 py-2 rounded font-semibold transition"
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-slate-400">Address:</p>
              <p className="font-mono">{shortenAddress(address)}</p>
              <button
                onClick={() => disconnect()}
                className="text-sm text-red-500 underline"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>

        {/* VALUE */}
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg w-64 flex flex-col space-y-3">
          <h2 className="text-xl font-bold">Contract Value</h2>
          <p className="text-sm text-slate-400">Current Value:</p>
          <p className="text-2xl font-semibold">
            {loadingValue ? 'Loading…' : backendValue}
          </p>
          <button
            onClick={fetchBackendValue}
            className="w-full bg-slate-700 hover:bg-slate-600 py-2 rounded text-sm transition"
          >
            Refresh
          </button>
        </div>

        {/* SET */}
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg w-64 flex flex-col space-y-3">
          <h2 className="text-xl font-bold">Update Value</h2>
          <input
            type="number"
            placeholder="New value"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 focus:outline-none focus:ring focus:ring-indigo-500"
          />
          <button
            onClick={handleSetValue}
            disabled={!inputValue || isWriting}
            className={`w-full py-2 rounded font-semibold transition ${
              isWriting ? 'bg-slate-600 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500'
            }`}
          >
            {isWriting ? 'Updating…' : 'Set Value'}
          </button>
        </div>
      </div>

      {/* EVENTS */}
  <div className="bg-slate-800 rounded-xl p-6 shadow-lg w-full max-w-4xl mt-4">
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-xl font-bold">Contract Events</h2>
      <button
        onClick={refreshEvents}
        disabled={loadingEvents}
        className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded text-sm font-semibold disabled:bg-slate-600"
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

          {events.map((e, idx) => (
            <tr key={idx} className="border-t border-slate-700">
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
  );
}