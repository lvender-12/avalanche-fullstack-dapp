'use client';

import { useState, useEffect } from 'react';
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useWriteContract,
} from 'wagmi';
import { injected } from 'wagmi/connectors';
import { SIMPLE_STORAGE_ADDRESS } from '@/src/contracts/address';

// 👉 ABI SIMPLE STORAGE
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

export default function Page() {
  // ==============================
  // MOUNT STATE
  // ==============================
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // ==============================
  // WALLET STATE
  // ==============================
  const { address, isConnected } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();

  // ==============================
  // LOCAL STATE
  // ==============================
  const [inputValue, setInputValue] = useState('');
  const [transactions, setTransactions] = useState<
    { value: string; status: 'pending' | 'success' | 'error'; hash?: string }[]
  >([]);

  // ==============================
  // READ CONTRACT
  // ==============================
  const { data: value, isLoading: isReading, refetch } = useReadContract({
    address: SIMPLE_STORAGE_ADDRESS,
    abi: SIMPLE_STORAGE_ABI,
    functionName: 'getValue',
  });

  // ==============================
  // WRITE CONTRACT
  // ==============================
  const { writeContract, isPending: isWriting } = useWriteContract();

  const handleSetValue = async () => {
    if (!inputValue) return;

    const newTx = { value: inputValue, status: 'pending' as const };
    setTransactions((prev) => [newTx, ...prev]);

    try {
      const tx = await writeContract({
        address: SIMPLE_STORAGE_ADDRESS,
        abi: SIMPLE_STORAGE_ABI,
        functionName: 'setValue',
        args: [BigInt(inputValue)],
      });

      setTransactions((prev) =>
        prev.map((t) =>
          t === newTx ? { ...t, status: 'success', hash: tx?.hash } : t
        )
      );

      refetch();
      setInputValue('');
    } catch (err) {
      setTransactions((prev) =>
        prev.map((t) => (t === newTx ? { ...t, status: 'error' } : t))
      );
    }
  };

  const shortenAddress = (addr?: string) =>
    addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '';

  // ==============================
  // TUNGGU MOUNT
  // ==============================
  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-start p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-4">Day 3 – Frontend dApp (Avalanche)</h1>

      <div className="flex flex-wrap gap-4 w-full justify-center">

        {/* WALLET CONNECT */}
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

        {/* READ CONTRACT */}
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg w-64 flex flex-col space-y-3">
          <h2 className="text-xl font-bold">Contract Value</h2>
          <p className="text-sm text-slate-400">Current Value:</p>
          <p className="text-2xl font-semibold">{isReading ? 'Loading…' : value?.toString()}</p>
          <button
            onClick={() => refetch()}
            className="w-full bg-slate-700 hover:bg-slate-600 py-2 rounded text-sm transition"
          >
            Refresh
          </button>
        </div>

        {/* WRITE CONTRACT */}
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
            disabled={isWriting || !inputValue}
            className={`w-full py-2 rounded font-semibold transition ${
              isWriting ? 'bg-slate-600 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500'
            }`}
          >
            {isWriting ? 'Updating…' : 'Set Value'}
          </button>
        </div>
      </div>

      {/* TRANSACTION HISTORY */}
      <div className="bg-slate-800 rounded-xl p-6 shadow-lg w-full max-w-2xl flex flex-col space-y-3 mt-4">
        <h2 className="text-xl font-bold">Transaction History</h2>
        {transactions.length === 0 && (
          <p className="text-sm text-slate-400">No transactions yet.</p>
        )}
        {transactions.map((tx, idx) => (
          <div key={idx} className="border border-slate-700 rounded p-2 flex justify-between items-center">
            <p className="text-sm">Value: {tx.value}</p>
            <p className={`text-sm font-semibold ${
              tx.status === 'pending' ? 'text-yellow-400' :
              tx.status === 'success' ? 'text-green-400' :
              'text-red-400'
            }`}>
              {tx.status.toUpperCase()}
            </p>
            {tx.hash && (
              <a
                href={`https://testnet.snowtrace.io/tx/${tx.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline text-blue-400"
              >
                View
              </a>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
