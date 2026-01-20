import React, { useEffect, useState } from 'react';
import { BrainCircuit, User, Share2 } from 'lucide-react';

// This is a placeholder for a real graph visualization library like D3 or Vis.js
const KnowledgeGraphVisualizer = ({ data }: { data: any }) => {
    if (!data || !data.nodes) return <div className="text-xs italic">Graf wiedzy jest pusty.</div>;
    return (
        <div className="text-xs font-mono p-2 bg-black/20 rounded border border-[var(--matrix-border)] max-h-64 overflow-auto">
            <h4 className="font-bold text-[var(--matrix-accent)]">Węzły ({data.nodes.length})</h4>
            <ul>
                {data.nodes.map((node: any) => (
                    <li key={node.id}>- {node.id} ({node.type})</li>
                ))}
            </ul>
            <h4 className="font-bold text-[var(--matrix-accent)] mt-2">Połączenia ({data.edges.length})</h4>
            <ul>
                {data.edges.map((edge: any, i: number) => (
                    <li key={i}>{`${edge.source} --[${edge.label}]--> ${edge.target}`}</li>
                ))}
            </ul>
        </div>
    );
};

export const MemoryPanel: React.FC = () => {
    const [knowledgeGraph, _setKnowledgeGraph] = useState<any>(null);
    const [agentMemories, _setAgentMemories] = useState<any[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<string>("Dijkstra");
    const [loading, setLoading] = useState(false);

    const agentList = ["Geralt", "Yennefer", "Triss", "Jaskier", "Vesemir", "Ciri", "Eskel", "Lambert", "Zoltan", "Regis", "Dijkstra", "Philippa"];

    const fetchKnowledgeGraph = async () => {
        // In a real implementation, this would be a Tauri command
        // For now, we simulate reading the file if it exists, or handle error
        // const graph = await invoke('get_knowledge_graph');
        // setKnowledgeGraph(graph);
    };

    const fetchAgentMemory = async () => {
        if (!selectedAgent) return;
        setLoading(true);
        // const memories = await invoke('get_agent_memory', { agentName: selectedAgent, topK: 10 });
        // setAgentMemories(memories);
        setLoading(false);
    };

    useEffect(() => {
        fetchKnowledgeGraph();
    }, []);

    useEffect(() => {
        fetchAgentMemory();
    }, [selectedAgent]);

    return (
        <div className="glass-panel p-4 rounded-lg flex flex-col gap-4 border-[var(--matrix-border)]">
            <div className="flex justify-between items-center text-[var(--matrix-text-dim)] border-b border-[var(--matrix-border)] pb-2">
                <span className="flex items-center gap-2 font-semibold text-sm">
                    <BrainCircuit size={16} /> Świadomość Roju
                </span>
            </div>

            {/* Knowledge Graph Section */}
            <div>
                <h3 className="text-xs font-bold uppercase text-[var(--matrix-accent)] mb-2 flex items-center gap-2"><Share2 size={12}/> Graf Wiedzy</h3>
                <KnowledgeGraphVisualizer data={knowledgeGraph} />
            </div>

            {/* Agent Memory Section */}
            <div>
                <h3 className="text-xs font-bold uppercase text-[var(--matrix-accent)] mb-2 flex items-center gap-2"><User size={12}/> Pamięć Agenta</h3>
                <select 
                    value={selectedAgent}
                    onChange={(e) => setSelectedAgent(e.target.value)}
                    className="matrix-input w-full rounded px-2 py-1 text-xs mb-2"
                >
                    {agentList.map(agent => <option key={agent} value={agent}>{agent}</option>)}
                </select>
                <div className="text-xs font-mono p-2 bg-black/20 rounded border border-[var(--matrix-border)] h-48 overflow-auto">
                    {loading && <span>Ładowanie...</span>}
                    {!loading && agentMemories.length === 0 && <span className="italic">Brak wspomnień dla tego agenta.</span>}
                    {/* Render memories here */}
                </div>
            </div>
        </div>
    );
};
