import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Shield, Check, X, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';

interface BridgeRequest {
    id: string;
    message: string;
    status: "pending" | "approved" | "rejected";
}

interface BridgeData {
    requests: BridgeRequest[];
    auto_approve: boolean;
}

export const BridgePanel: React.FC = () => {
    const [data, setData] = useState<BridgeData | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const result = await invoke<BridgeData>('get_bridge_state');
            setData(result);
        } catch (e) {
            console.error("Bridge Error:", e);
        } finally {
            setLoading(false);
        }
    };

    const toggleAutoApprove = async () => {
        if (!data) return;
        try {
            const newData = await invoke<BridgeData>('set_auto_approve', { enabled: !data.auto_approve });
            setData(newData);
        } catch (e) {
            console.error(e);
        }
    };

    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        try {
            const command = action === 'approve' ? 'approve_request' : 'reject_request';
            const newData = await invoke<BridgeData>(command, { id });
            setData(newData);
        } catch (e) {
            console.error(e);
        }
    };

    // Poll every 5 seconds
    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    const pendingRequests = data?.requests.filter(r => r.status === 'pending') || [];

    return (
        <div className="glass-panel p-4 rounded-lg flex flex-col gap-4 border-[var(--matrix-border)]">
            <div className="flex justify-between items-center text-[var(--matrix-text-dim)] border-b border-[var(--matrix-border)] pb-2">
                <span className="flex items-center gap-2 font-semibold text-sm">
                    <Shield size={16} /> CLI Bridge
                </span>
                <button onClick={fetchData} className={`hover:text-[var(--matrix-accent)] ${loading ? 'animate-spin' : ''}`}>
                    <RefreshCw size={12} />
                </button>
            </div>

            {/* Auto Approve Toggle */}
            <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--matrix-text)]">Auto-Zatwierdzanie</span>
                <button onClick={toggleAutoApprove} className="text-[var(--matrix-accent)]">
                    {data?.auto_approve ? <ToggleRight size={24} /> : <ToggleLeft size={24} className="text-[var(--matrix-text-dim)]"/>}
                </button>
            </div>

            {/* Requests List */}
            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                {pendingRequests.length === 0 ? (
                    <div className="text-center text-[10px] text-[var(--matrix-text-dim)] italic py-2">
                        Brak oczekujących żądań.
                    </div>
                ) : (
                    pendingRequests.map(req => (
                        <div key={req.id} className="bg-black/20 border border-[var(--matrix-border)] p-2 rounded text-xs">
                            <div className="mb-2 font-mono break-all">{req.message}</div>
                            <div className="flex gap-2 justify-end">
                                <button 
                                    onClick={() => handleAction(req.id, 'reject')}
                                    className="p-1 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                                >
                                    <X size={14} />
                                </button>
                                <button 
                                    onClick={() => handleAction(req.id, 'approve')}
                                    className="p-1 hover:bg-green-500/20 text-green-400 rounded transition-colors"
                                >
                                    <Check size={14} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
            
            {data?.requests.length ? (
                 <div className="text-[10px] text-right text-[var(--matrix-text-dim)]">
                    Łącznie: {data.requests.length} | Oczekujące: {pendingRequests.length}
                 </div>
            ) : null}
        </div>
    );
};
