import { useState, useEffect, useRef, memo } from 'react';
import { Lock, Download } from 'lucide-react';
import { MemoryPanel } from './MemoryPanel';
import { PanelHeader } from './ui/PanelHeader';

interface RightSidebarProps {
  count: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onExport: () => void;
}

const RightSidebarComponent: React.FC<RightSidebarProps> = ({
  count,
  onIncrement,
  onDecrement,
  onExport
}) => {
  // Worker Logic
  const [workerProgress, setWorkerProgress] = useState(0);
  const [workerResult, setWorkerResult] = useState<number | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/heavyLogic.worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current.onmessage = (e) => {
      const { type, value } = e.data;
      if (type === 'progress') setWorkerProgress(value);
      else if (type === 'result') {
        setWorkerResult(value);
        setIsWorking(false);
        setWorkerProgress(100);
      }
    };
    return () => { workerRef.current?.terminate(); };
  }, []);

  const startDecryption = () => {
    if (!workerRef.current) return;
    setIsWorking(true);
    setWorkerProgress(0);
    setWorkerResult(null);
    workerRef.current.postMessage(50000);
  };

  return (
    <aside className="flex col-span-1 flex-col gap-2 overflow-y-auto pr-1 h-full">

      <MemoryPanel />

      {/* ACTIONS SECTION */}
      <div className="glass-panel p-4 rounded-lg flex flex-col justify-center gap-4 border-[var(--matrix-border)]">
        <PanelHeader title="Akcje Sesji" />
        <button
          onClick={onExport}
          className="glass-button text-xs flex items-center justify-center gap-2"
          title="Eksportuj jako Markdown"
        >
          <Download size={14} /> Eksportuj Czat
        </button>
      </div>

      {/* WORKER SECTION */}
      <div className="glass-panel p-4 rounded-lg flex flex-col justify-center gap-4 border-[var(--matrix-border)]">
        <PanelHeader icon={Lock} title="Deszyfracja">
          {isWorking && <span className="text-[10px] animate-pulse text-[var(--matrix-accent)]">PRACA</span>}
        </PanelHeader>

        <div className="progress-bar">
          <div
            className="progress-bar-fill"
            style={{ width: `${workerProgress}%` }}
          ></div>
        </div>

        <div className="flex justify-between items-center">
          <div className="text-xs font-mono text-[var(--matrix-text-dim)]">
            {workerResult ? `Klucz: ${workerResult}` : isWorking ? `${Math.round(workerProgress)}%` : "IDLE"}
          </div>
          <button
            onClick={startDecryption}
            disabled={isWorking}
            className={`glass-button text-[10px] px-2 py-1 ${isWorking ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isWorking ? 'Działa...' : 'Start'}
          </button>
        </div>
      </div>

      {/* ZUSTAND SECTION */}
      <div className="glass-panel p-4 rounded-lg flex flex-col justify-center gap-4 border-[var(--matrix-border)]">
        <PanelHeader title="Stan Systemu" />
        <div className="flex items-center justify-between text-[var(--matrix-text)]">
          <span>Licznik Sync:</span>
          <span className="text-xl font-bold text-[var(--matrix-accent)]">{count}</span>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onIncrement} className="glass-button text-xs px-2">+</button>
          <button onClick={onDecrement} className="glass-button text-xs px-2">-</button>
        </div>
      </div>

    </aside>
  );
};

RightSidebarComponent.displayName = 'RightSidebar';

export const RightSidebar = memo(RightSidebarComponent);
