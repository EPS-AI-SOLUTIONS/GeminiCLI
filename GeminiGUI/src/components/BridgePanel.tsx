import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Check, X, ToggleLeft, ToggleRight, Clock } from 'lucide-react';
import { PanelHeader } from './ui/PanelHeader';
import type { BridgeRequest } from '../types';

interface BridgeData {
    requests: BridgeRequest[];
    auto_approve: boolean;
}

export const BridgePanel: React.FC = () => {
    const queryClient = useQueryClient();
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    // Fetch bridge data with React Query
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['bridge-state'],
        queryFn: async () => {
            const result = await invoke<BridgeData>('get_bridge_state');
            setLastUpdate(new Date());
            return result;
        },
        // Adaptive polling: faster when there are pending requests
        refetchInterval: (query) => {
            const data = query.state.data;
            const hasPending = data?.requests.some(r => r.status === 'pending');
            return hasPending ? 2000 : 10000; // 2s if pending, 10s otherwise
        },
        staleTime: 1000,
    });

    // Toggle auto-approve mutation
    const toggleMutation = useMutation({
        mutationFn: async (enabled: boolean) => {
            return await invoke<BridgeData>('set_auto_approve', { enabled });
        },
        onSuccess: (newData) => {
            queryClient.setQueryData(['bridge-state'], newData);
            setLastUpdate(new Date());
        },
    });

    // Action mutation (approve/reject)
    const actionMutation = useMutation({
        mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject' }) => {
            const command = action === 'approve' ? 'approve_request' : 'reject_request';
            return await invoke<BridgeData>(command, { id });
        },
        onSuccess: (newData) => {
            queryClient.setQueryData(['bridge-state'], newData);
            setLastUpdate(new Date());
        },
    });

    const handleToggle = useCallback(() => {
        if (!data) return;
        toggleMutation.mutate(!data.auto_approve);
    }, [data, toggleMutation]);

    const handleAction = useCallback((id: string, action: 'approve' | 'reject') => {
        actionMutation.mutate({ id, action });
    }, [actionMutation]);

    const pendingRequests = data?.requests.filter(r => r.status === 'pending') || [];
    const isProcessing = toggleMutation.isPending || actionMutation.isPending;

    const formatTime = (date: Date | null) => {
        if (!date) return '--:--';
        return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <div className="glass-panel p-4 rounded-lg flex flex-col gap-4 border-[var(--matrix-border)]">
            <PanelHeader
                icon={Shield}
                title="CLI Bridge"
                onRefresh={() => refetch()}
                isLoading={isLoading}
            >
                <span className="text-[10px] flex items-center gap-1 opacity-50">
                    <Clock size={10} /> {formatTime(lastUpdate)}
                </span>
            </PanelHeader>

            {error && (
                <div className="error-alert">
                    Blad polaczenia z Bridge
                </div>
            )}

            {/* Auto Approve Toggle */}
            <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--matrix-text)]">Auto-Zatwierdzanie</span>
                <button
                    onClick={handleToggle}
                    disabled={isProcessing}
                    className={`transition-colors ${isProcessing ? 'opacity-50' : ''}`}
                >
                    {data?.auto_approve ? (
                        <ToggleRight size={24} className="text-[var(--matrix-accent)]" />
                    ) : (
                        <ToggleLeft size={24} className="text-[var(--matrix-text-dim)]" />
                    )}
                </button>
            </div>

            {/* Status indicator */}
            <div className={data?.auto_approve ? 'success-alert' : 'warning-alert'}>
                {data?.auto_approve ? 'TRYB AUTOMATYCZNY' : 'TRYB RECZNY - wymaga zatwierdzenia'}
            </div>

            {/* Requests List */}
            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                {isLoading && !data ? (
                    <div className="text-center text-[10px] text-[var(--matrix-text-dim)] py-2">
                        Ladowanie...
                    </div>
                ) : pendingRequests.length === 0 ? (
                    <div className="text-center text-[10px] text-[var(--matrix-text-dim)] italic py-2">
                        Brak oczekujacych zadan.
                    </div>
                ) : (
                    pendingRequests.map(req => (
                        <div
                            key={req.id}
                            className="request-card"
                        >
                            <div className="mb-2 font-mono break-all text-[var(--matrix-text)]">
                                {(() => {
                                    const text = req.message || req.command || '';
                                    return text.length > 100 ? `${text.substring(0, 100)}...` : text;
                                })()}
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button
                                    onClick={() => handleAction(req.id, 'reject')}
                                    disabled={isProcessing}
                                    className="p-1 hover:bg-red-500/20 text-red-400 rounded transition-colors disabled:opacity-50"
                                    title="Odrzuc"
                                >
                                    <X size={14} />
                                </button>
                                <button
                                    onClick={() => handleAction(req.id, 'approve')}
                                    disabled={isProcessing}
                                    className="p-1 hover:bg-green-500/20 text-green-400 rounded transition-colors disabled:opacity-50"
                                    title="Zatwierdz"
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
                    Lacznie: {data.requests.length} | Oczekujace: {pendingRequests.length}
                </div>
            ) : null}
        </div>
    );
};
