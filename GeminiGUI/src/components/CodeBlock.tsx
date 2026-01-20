import React, { useState } from 'react';
import { Check, Copy, Play, Save, Terminal } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';

interface CodeBlockProps {
  language: string;
  value: string;
  onRun?: (cmd: string) => void;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, value, onRun }) => {
  const [copied, setCopied] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    try {
      const filePath = await save({
        filters: [{
          name: language || 'Text',
          extensions: [language || 'txt']
        }]
      });
      
      if (filePath) {
        await invoke('save_file_content', { path: filePath, content: value });
      }
    } catch (error) {
      console.error('Failed to save file:', error);
      alert('Failed to save file: ' + error);
    }
  };

  const handleRun = () => {
    if (!onRun) return;
    setIsRunning(true);
    
    // Wrap code based on language
    let command = value;
    const escapedValue = value.replace(/"/g, '\"');

    if (language === 'python' || language === 'py') {
        command = `python -c "${escapedValue}"`;
    } else if (language === 'javascript' || language === 'js' || language === 'node') {
        command = `node -e "${escapedValue}"`;
    } else if (language === 'bash' || language === 'sh' || language === 'shell') {
        command = value;
    } else {
        alert(`Uruchamianie dla ${language} nie jest bezpośrednio wspierane.`);
        setIsRunning(false);
        return;
    }

    onRun(command);
    setTimeout(() => setIsRunning(false), 1000); // Reset state
  };

  return (
    <div className="rounded-md border border-[var(--matrix-border)] bg-black/40 overflow-hidden my-2">
      <div className="flex justify-between items-center px-3 py-1.5 bg-white/5 border-b border-[var(--matrix-border)]">
        <span className="text-xs font-mono text-[var(--matrix-text-dim)] uppercase">{language || 'tekst'}</span>
        <div className="flex gap-2">
          
          {(language === 'python' || language === 'js' || language === 'javascript' || language === 'bash' || language === 'sh') && (
              <button 
                onClick={handleRun} 
                disabled={isRunning}
                className="text-[var(--matrix-text-dim)] hover:text-[var(--matrix-accent)] transition-colors"
                title="Uruchom Kod"
              >
                {isRunning ? <Terminal size={14} className="animate-spin"/> : <Play size={14} />}
              </button>
          )}

          <button 
            onClick={handleSave} 
            className="text-[var(--matrix-text-dim)] hover:text-[var(--matrix-accent)] transition-colors"
            title="Zapisz do Pliku"
          >
            <Save size={14} />
          </button>

          <button 
            onClick={handleCopy} 
            className="text-[var(--matrix-text-dim)] hover:text-[var(--matrix-accent)] transition-colors"
            title="Kopiuj"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      </div>
      <pre className="p-3 overflow-x-auto text-sm font-mono text-[var(--matrix-text)] bg-transparent m-0">
        <code>{value}</code>
      </pre>
    </div>
  );
};
