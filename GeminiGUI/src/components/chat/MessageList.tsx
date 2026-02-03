/**
 * GeminiGUI - MessageList Component
 * @module components/chat/MessageList
 *
 * Virtualized list of chat messages with Markdown rendering.
 */

import { useRef, memo } from 'react';
import { motion } from 'framer-motion';
import { FileText, Terminal, Copy, Check } from 'lucide-react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from '../CodeBlock';
import type { Message } from '../../types';
import { UI } from '../../constants';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';

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
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} py-2 px-4 group relative`}
        onContextMenu={(e) => onContextMenu(e, message)}
      >
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
                  p-2 rounded-full 
                  bg-neutral-900/90 text-white 
                  hover:bg-white hover:text-black
                  opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 
                  border border-white/20 shadow-md transform hover:scale-110
              `}
              title="Kopiuj wiadomość"
          >
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
          </button>

          {isSystem && (
            <div className="flex items-center gap-2 mb-1 border-b border-blue-500/20 pb-1 text-blue-400">
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

          {message.role === 'assistant' && isStreaming && isLast && (
            <span className="inline-block w-2 h-4 ml-1 bg-[var(--matrix-accent)] animate-pulse align-middle" />
          )}
        </div>
      </motion.div>
    );
  }
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
  ({
    messages,
    isStreaming = false,
    onExecuteCommand = () => {},
    onContextMenu = () => {}
  }) => {
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
  }
);

MessageList.displayName = 'MessageList';

export default MessageList;
