'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useWriteContract, useReadContract } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { SIMPLE_STORAGE_ADDRESS } from '@/src/contracts/address';

// ABI SimpleStorage
const SIMPLE_STORAGE_ABI = [
  {
    inputs: [],
    name: 'getValue',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '_value', type: 'uint256' }],
    name: 'setValue',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL!;

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
      // Ambil latest block dari backend
      const latestRes = await fetch(`${BACKEND}/blockchain/value`);
      const latestData = await latestRes.json();
      const latestBlock = BigInt(latestData.latestBlock || 0); // backend bisa dikasih latestBlock endpoint

      const BATCH = 2048n; // maksimal range block per batch
      let from = 0n; // mulai dari block 0
      let allEvents: any[] = [];

      while (from <= latestBlock) {
        const to = from + BATCH - 1n > latestBlock ? latestBlock : from + BATCH - 1n;

        const res = await fetch(`${BACKEND}/blockchain/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fromBlock: Number(from), toBlock: Number(to) }),
        });

        const json = await res.json();
        if (json && Array.isArray(json.data)) {
          allEvents.push(...json.data);
        }

        from = to + 1n; // next batch
      }

      // paling baru di atas
      setEvents(allEvents.reverse());
    } catch (e) {
      console.error('Fetch events failed:', e);
      setEvents([]);
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
      <div className="bg-slate-800 rounded-xl p-6 shadow-lg w-full max-w-2xl flex flex-col space-y-3 mt-4">
        <h2 className="text-xl font-bold">Contract Events</h2>

        {loadingEvents && <p className="text-sm text-slate-400">Loading events…</p>}

        {events.length === 0 && !loadingEvents && (
          <p className="text-sm text-slate-400">No events yet.</p>
        )}

        {events.map((e, idx) => (
          <div key={idx} className="border border-slate-700 rounded p-2 flex justify-between">
            <p className="text-sm">
              #{e.blockNumber} → {e.value}
            </p>
            <p className="text-xs text-slate-400">{e.txHash?.slice(0, 10)}…</p>
          </div>
        ))}
      </div>
    </main>
  );
}
