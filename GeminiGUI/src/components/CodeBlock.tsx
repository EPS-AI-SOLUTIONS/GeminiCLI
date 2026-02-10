import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { Check, Copy, Play, Save, Terminal } from 'lucide-react';
import type React from 'react';
import { memo, useRef, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { containsDangerousPatterns, escapeForShell } from '../utils/validators';

interface CodeBlockProps {
  language: string;
  value: string;
  onRun?: (cmd: string) => void;
}

const CodeBlockComponent: React.FC<CodeBlockProps> = ({ language, value, onRun }) => {
  const { copied, copyToClipboard } = useCopyToClipboard();
  const [isRunning, setIsRunning] = useState(false);
  const codeRef = useRef<HTMLPreElement>(null);
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  const handleCopy = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    copyToClipboard(value);
  };

  const handleSelectAll = () => {
    if (codeRef.current) {
      const range = document.createRange();
      range.selectNodeContents(codeRef.current);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const filePath = await save({
        filters: [
          {
            name: language || 'Text',
            extensions: [language || 'txt'],
          },
        ],
      });

      if (filePath) {
        await invoke('save_file_content', { path: filePath, content: value });
      }
    } catch (error) {
      console.error('Failed to save file:', error);
      alert(`Failed to save file: ${error}`);
    }
  };

  const handleRun = () => {
    if (!onRun) return;

    // SECURITY: Check for dangerous patterns
    if (containsDangerousPatterns(value)) {
      alert(
        'BEZPIECZEŃSTWO: Kod zawiera potencjalnie niebezpieczne wzorce i nie może być uruchomiony.',
      );
      return;
    }

    // SECURITY: Limit code length
    if (value.length > 5000) {
      alert('BEZPIECZEŃSTWO: Kod jest zbyt długi (max 5000 znaków).');
      return;
    }

    setIsRunning(true);

    // SECURITY: Safe escaping for shell execution
    const escapedValue = escapeForShell(value);
    let command: string;

    if (language === 'python' || language === 'py') {
      // Use -c with properly escaped code
      command = `python -c "${escapedValue}"`;
    } else if (language === 'javascript' || language === 'js' || language === 'node') {
      command = `node -e "${escapedValue}"`;
    } else if (language === 'bash' || language === 'sh' || language === 'shell') {
      // For shell scripts, only allow simple read-only commands
      const safeShellCommands = ['echo', 'pwd', 'ls', 'dir', 'date', 'whoami', 'hostname'];
      const firstWord = value.trim().split(/\s+/)[0].toLowerCase();

      if (!safeShellCommands.includes(firstWord)) {
        alert(
          `BEZPIECZEŃSTWO: Tylko podstawowe komendy shell są dozwolone: ${safeShellCommands.join(', ')}`,
        );
        setIsRunning(false);
        return;
      }
      command = value;
    } else {
      alert(`Uruchamianie dla ${language} nie jest bezpośrednio wspierane.`);
      setIsRunning(false);
      return;
    }

    onRun(command);
    setTimeout(() => setIsRunning(false), 1000);
  };

  return (
    <div
      className={`rounded-md border overflow-hidden my-2 ${
        isLight ? 'border-slate-200/60 bg-slate-50/80' : 'border-[var(--matrix-border)] bg-black/40'
      }`}
    >
      <div
        onClick={handleSelectAll}
        className={`flex justify-between items-center px-3 py-1.5 border-b cursor-pointer transition-colors select-none ${
          isLight
            ? 'bg-slate-100/80 border-slate-200/60 hover:bg-slate-200/60'
            : 'bg-white/5 border-[var(--matrix-border)] hover:bg-white/10'
        }`}
        title="Kliknij, aby zaznaczyć całość"
      >
        <span
          className={`text-xs font-mono uppercase ${
            isLight ? 'text-slate-500' : 'text-[var(--matrix-text-dim)]'
          }`}
        >
          {language || 'tekst'}
        </span>
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          {(language === 'python' ||
            language === 'js' ||
            language === 'javascript' ||
            language === 'bash' ||
            language === 'sh') && (
            <button
              onClick={handleRun}
              disabled={isRunning}
              className={`transition-colors ${
                isLight
                  ? 'text-slate-400 hover:text-emerald-600'
                  : 'text-[var(--matrix-text-dim)] hover:text-[var(--matrix-accent)]'
              }`}
              title="Uruchom Kod"
            >
              {isRunning ? <Terminal size={14} className="animate-spin" /> : <Play size={14} />}
            </button>
          )}

          <button
            onClick={handleSave}
            className={`transition-colors ${
              isLight
                ? 'text-slate-400 hover:text-emerald-600'
                : 'text-[var(--matrix-text-dim)] hover:text-[var(--matrix-accent)]'
            }`}
            title="Zapisz do Pliku"
          >
            <Save size={14} />
          </button>

          <button
            onClick={handleCopy}
            className={`transition-colors ${
              isLight
                ? 'text-slate-400 hover:text-emerald-600'
                : 'text-[var(--matrix-text-dim)] hover:text-[var(--matrix-accent)]'
            }`}
            title="Kopiuj"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      </div>
      <pre
        ref={codeRef}
        className={`p-3 overflow-x-auto text-sm font-mono bg-transparent m-0 select-text cursor-text ${
          isLight ? 'text-slate-800' : 'text-[var(--matrix-text)]'
        }`}
      >
        <code>{value}</code>
      </pre>
    </div>
  );
};

CodeBlockComponent.displayName = 'CodeBlock';

export const CodeBlock = memo(CodeBlockComponent);
