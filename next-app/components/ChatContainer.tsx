'use client';

/**
 * ClaudeHydra - ChatContainer Component
 * @module components/ChatContainer
 *
 * Main chat interface container using sub-components.
 */

import { memo, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { Message } from '@/types';
import { ChatInput, ChatMessageContextMenu, DragDropZone, MessageList } from './chat';

// ============================================================================
// TYPES
// ============================================================================

export interface ChatContainerProps {
  messages: Message[];
  isStreaming: boolean;
  onSubmit: (prompt: string, image: string | null) => void;
  onExecuteCommand: (cmd: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ChatContainer = memo<ChatContainerProps>(
  ({ messages, isStreaming, onSubmit, onExecuteCommand }) => {
    const [pendingImage, setPendingImage] = useState<string | null>(null);
    const [textContext, setTextContext] = useState<string>('');
    const [contextMenu, setContextMenu] = useState<{
      x: number;
      y: number;
      message: Message;
    } | null>(null);

    const handleImageDrop = useCallback((base64: string) => {
      const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
      if (typeof base64 === 'string' && base64.length > MAX_IMAGE_SIZE) {
        console.warn('[ChatContainer] Image too large, max 10MB base64');
        toast.error('Obraz zbyt duży (max 10MB)');
        return;
      }
      setPendingImage(base64);
      toast.success('Obraz dodany');
    }, []);

    const handleTextDrop = useCallback((content: string, filename: string) => {
      setTextContext(
        `[Plik Kontekstowy: ${filename}]\n\`\`\`\n${content}\n\`\`\`\n\nPrzeanalizuj tresc tego pliku.`,
      );
      toast.success(`Plik "${filename}" dodany jako kontekst`);
    }, []);

    const handlePasteImage = useCallback(
      (base64: string) => {
        handleImageDrop(base64);
      },
      [handleImageDrop],
    );

    useEffect(() => {
      const handleGlobalPaste = (e: ClipboardEvent) => {
        const active = document.activeElement;
        if (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement) {
          return;
        }

        const items = e.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
          if (item.type.startsWith('image/')) {
            const blob = item.getAsFile();
            if (blob) {
              const reader = new FileReader();
              reader.onload = (event) => {
                if (event.target?.result && typeof event.target.result === 'string') {
                  handleImageDrop(event.target.result);
                }
              };
              reader.readAsDataURL(blob);
              e.preventDefault();
              return;
            }
          }

          if (item.kind === 'file' && !item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              const MAX_FILE_SIZE = 5 * 1024 * 1024;
              if (file.size > MAX_FILE_SIZE) {
                toast.error(`Plik "${file.name}" zbyt duży (max 5MB)`);
                return;
              }
              const reader = new FileReader();
              reader.onload = (event) => {
                if (event.target?.result && typeof event.target.result === 'string') {
                  handleTextDrop(event.target.result.substring(0, 20000), file.name);
                }
              };
              reader.readAsText(file);
              e.preventDefault();
              return;
            }
          }
        }
      };

      window.addEventListener('paste', handleGlobalPaste);
      return () => window.removeEventListener('paste', handleGlobalPaste);
    }, [handleImageDrop, handleTextDrop]);

    const handleSubmit = useCallback(
      (prompt: string, image: string | null) => {
        const finalPrompt = textContext ? `${textContext}\n\n${prompt}` : prompt;
        onSubmit(finalPrompt, image);
        setTextContext('');
        setPendingImage(null);
      },
      [onSubmit, textContext],
    );

    const handleClearImage = useCallback(() => {
      setPendingImage(null);
    }, []);

    const handleContextMenu = useCallback((e: React.MouseEvent, message: Message) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, message });
    }, []);

    const handleCloseContextMenu = useCallback(() => {
      setContextMenu(null);
    }, []);

    const handleCopyMessage = useCallback(() => {
      if (contextMenu) {
        navigator.clipboard.writeText(contextMenu.message.content);
        handleCloseContextMenu();
      }
    }, [contextMenu, handleCloseContextMenu]);

    return (
      <DragDropZone onImageDrop={handleImageDrop} onTextDrop={handleTextDrop}>
        <div className="flex-1 w-full h-full flex flex-col min-h-0 relative gap-2">
          <div className="glass-panel flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-hidden">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm" style={{ color: 'var(--matrix-text-dim)' }}>
                    Wpisz wiadomość, aby rozpocząć rozmowę...
                  </p>
                </div>
              ) : (
                <MessageList
                  messages={messages}
                  isStreaming={isStreaming}
                  onExecuteCommand={onExecuteCommand}
                  onContextMenu={handleContextMenu}
                />
              )}
            </div>
          </div>

          {contextMenu && (
            <ChatMessageContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              isUser={contextMenu.message.role === 'user'}
              onClose={handleCloseContextMenu}
              onCopy={handleCopyMessage}
            />
          )}

          {textContext && (
            <div className="glass-panel shrink-0 px-4 py-2 flex items-center gap-2 text-xs text-[var(--matrix-text-dim)]">
              <span className="text-[var(--matrix-accent)]">📎</span>
              <span className="flex-1 truncate">
                Plik kontekstowy załadowany ({Math.round(textContext.length / 1024)}KB)
              </span>
              <button
                onClick={() => setTextContext('')}
                className="p-1 rounded hover:bg-red-500/20 hover:text-red-400 transition-colors"
                title="Usuń kontekst"
              >
                ✕
              </button>
            </div>
          )}

          <div className="glass-panel shrink-0">
            <ChatInput
              isStreaming={isStreaming}
              onSubmit={handleSubmit}
              pendingImage={pendingImage}
              onClearImage={handleClearImage}
              onPasteImage={handlePasteImage}
              onPasteFile={handleTextDrop}
            />
          </div>
        </div>
      </DragDropZone>
    );
  },
);

ChatContainer.displayName = 'ChatContainer';

export default ChatContainer;
