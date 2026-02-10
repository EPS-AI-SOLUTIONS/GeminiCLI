/**
 * GeminiGUI - MessageList Component
 * @module components/chat/MessageList
 *
 * Virtualized list of chat messages with Markdown rendering.
 */

import { motion } from 'framer-motion';
import { Bot, Check, Copy, FileText, Terminal, User } from 'lucide-react';
import { memo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import remarkGfm from 'remark-gfm';
import { UI } from '../../constants';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import type { Message } from '../../types';
import { CodeBlock } from '../CodeBlock';

// ============================================================================
// TYPES
// ============================================================================

export interface MessageListProps {
  messages: Message[];
  isStreaming?: boolean;
  onExecuteCommand?: (cmd: string) => void;
  onContextMenu?: (e: React.MouseEvent, message: Message) => void;
}

// ============================================================================
// MESSAGE ITEM
// ============================================================================

interface MessageItemProps {
  message: Message;
  isLast: boolean;
  isStreaming: boolean;
  onExecuteCommand: (cmd: string) => void;
  onContextMenu: (e: React.MouseEvent, message: Message) => void;
}

const MessageItem = memo<MessageItemProps>(
  ({ message, isLast, isStreaming, onExecuteCommand, onContextMenu }) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';
    const { copied, copyToClipboard } = useCopyToClipboard();

    const handleCopyMessage = () => {
      copyToClipboard(message.content);
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'} py-2 px-4 group relative`}
        onContextMenu={(e) => onContextMenu(e, message)}
      >
        {!isUser && !isSystem && (
          <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-[var(--matrix-accent)]/10 flex items-center justify-center mb-1">
            <Bot size={14} className="text-[var(--matrix-accent)]" />
          </div>
        )}
        <div
          className={
            isUser
              ? 'message-bubble-user'
              : isSystem
                ? 'message-bubble-system'
                : 'message-bubble-assistant'
          }
        >
          {/* Copy Button (Now inside bubble, top-right) */}
          <button
            onClick={handleCopyMessage}
            className={`
                  absolute top-2 right-2
                  p-1.5 rounded-lg
                  bg-black/30 text-white/80
                  hover:bg-[var(--matrix-accent)] hover:text-black
                  opacity-15 group-hover:opacity-100 transition-all duration-200 z-20
                  shadow-sm transform hover:scale-110 backdrop-blur-sm
              `}
            title="Kopiuj wiadomość"
          >
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
          </button>

          {isSystem && (
            <div className="flex items-center gap-2 mb-1.5 border-b border-blue-500/15 pb-1.5 text-blue-500/70">
              <Terminal size={14} />
              <span className="font-bold">SYSTEM OUTPUT</span>
            </div>
          )}

          <div className="markdown-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code(props) {
                  const { children, className, ...rest } = props;
                  const match = /language-(\w+)/.exec(className || '');
                  return match ? (
                    <CodeBlock
                      language={match[1]}
                      value={String(children).replace(/\n$/, '')}
                      onRun={(cmd) => onExecuteCommand(cmd)}
                    />
                  ) : (
                    <code {...rest} className={className}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>

          {/* Timestamp */}
          {message.timestamp && (
            <div
              className={`text-[10px] mt-1.5 ${isUser ? 'text-black/40' : 'text-[var(--matrix-text-dim)]/40'} font-mono`}
            >
              {new Date(message.timestamp).toLocaleTimeString('pl-PL', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          )}

          {message.role === 'assistant' && isStreaming && isLast && (
            <span className="inline-block w-1.5 h-3.5 ml-1 rounded-sm bg-[var(--matrix-accent)] animate-pulse align-middle" />
          )}
        </div>
        {isUser && (
          <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-[var(--matrix-accent)]/20 flex items-center justify-center mb-1">
            <User size={14} className="text-black" />
          </div>
        )}
      </motion.div>
    );
  },
);

MessageItem.displayName = 'MessageItem';

// ============================================================================
// EMPTY STATE
// ============================================================================

const EmptyState = memo(() => (
  <div className="h-full flex flex-col items-center justify-center text-[var(--matrix-text-dim)] opacity-50 gap-2">
    <FileText size={48} />
    <span>Oczekiwanie na dane lub plik...</span>
  </div>
));

EmptyState.displayName = 'EmptyState';

// ============================================================================
// MESSAGE LIST
// ============================================================================

export const MessageList = memo<MessageListProps>(
  ({ messages, isStreaming = false, onExecuteCommand = () => {}, onContextMenu = () => {} }) => {
    const virtuosoRef = useRef<VirtuosoHandle>(null);

    if (messages.length === 0) {
      return <EmptyState />;
    }

    return (
      <Virtuoso
        ref={virtuosoRef}
        totalCount={messages.length}
        overscan={UI.VIRTUOSO_OVERSCAN}
        itemContent={(index) => (
          <MessageItem
            message={messages[index]}
            isLast={index === messages.length - 1}
            isStreaming={isStreaming}
            onExecuteCommand={onExecuteCommand}
            onContextMenu={onContextMenu}
          />
        )}
        followOutput="auto"
        className="h-full scrollbar-thin"
      />
    );
  },
);

MessageList.displayName = 'MessageList';

export default MessageList;
