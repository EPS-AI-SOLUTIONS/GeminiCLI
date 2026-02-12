'use client';

/**
 * ClaudeHydra - ChatInput Component (Enhanced)
 * @module components/chat/ChatInput
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Paperclip, Send, StopCircle, X } from 'lucide-react';
import { memo, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import TextareaAutosize from 'react-textarea-autosize';
import { z } from 'zod';
import { cn } from '@/utils';

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export interface ChatInputProps {
  isStreaming: boolean;
  onSubmit: (prompt: string, image: string | null) => void;
  pendingImage: string | null;
  onClearImage: () => void;
  onPasteImage?: (base64: string) => void;
  onPasteFile?: (content: string, filename: string) => void;
}

const MAX_CHARS = 4000;

const chatSchema = z.object({
  prompt: z.string().max(MAX_CHARS, 'Zbyt długa wiadomość'),
});

type ChatFormData = z.infer<typeof chatSchema>;

// ============================================================================
// IMAGE PREVIEW
// ============================================================================

const ImagePreview = memo(({ src, onRemove }: { src: string; onRemove: () => void }) => (
  <motion.div
    layout
    initial={{ opacity: 0, scale: 0.8, y: 10 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.8, y: 10 }}
    className="relative inline-block w-fit mb-3 group"
  >
    <img
      src={src}
      alt="Preview"
      className="h-24 w-auto rounded-xl border border-[var(--matrix-accent)]/50 shadow-[0_0_15px_rgba(0,255,0,0.1)]"
    />
    <button
      type="button"
      onClick={onRemove}
      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all shadow-sm hover:scale-110"
    >
      <X size={14} strokeWidth={3} />
    </button>
  </motion.div>
));

ImagePreview.displayName = 'ImagePreview';

// ============================================================================
// CHAT INPUT
// ============================================================================

export const ChatInput = memo<ChatInputProps>(
  ({ isStreaming, onSubmit, pendingImage, onClearImage, onPasteImage, onPasteFile }) => {
    const {
      register,
      handleSubmit,
      reset,
      setFocus,
      watch,
      formState: { errors, isValid },
    } = useForm<ChatFormData>({
      resolver: zodResolver(chatSchema),
      mode: 'onChange',
      defaultValues: { prompt: '' },
    });

    const promptValue = watch('prompt');
    const charCount = promptValue.length;
    const isOverLimit = charCount > MAX_CHARS;

    useEffect(() => {
      setFocus('prompt');
    }, [setFocus]);

    const handleFormSubmit = (data: ChatFormData) => {
      if (isStreaming) return;
      if (!data.prompt.trim() && !pendingImage) return;
      onSubmit(data.prompt, pendingImage);
      reset();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(handleFormSubmit)();
      }
    };

    const handlePaste = useCallback(
      (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            const blob = item.getAsFile();
            if (blob) {
              const reader = new FileReader();
              reader.onload = (event) => {
                if (event.target?.result && typeof event.target.result === 'string') {
                  if (onPasteImage) onPasteImage(event.target.result);
                }
              };
              reader.readAsDataURL(blob);
              e.preventDefault();
              return;
            }
          }
          if (item.kind === 'file' && !item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file && file.size < 5 * 1024 * 1024) {
              const reader = new FileReader();
              reader.onload = (event) => {
                if (event.target?.result && typeof event.target.result === 'string') {
                  if (onPasteFile) {
                    onPasteFile(event.target.result.substring(0, 20000), file.name);
                  }
                }
              };
              reader.readAsText(file);
              e.preventDefault();
              return;
            }
          }
        }
      },
      [onPasteImage, onPasteFile],
    );

    const canSubmit =
      !isStreaming &&
      !isOverLimit &&
      (isValid || !!pendingImage) &&
      (promptValue.trim().length > 0 || !!pendingImage);

    return (
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="p-4 bg-transparent backdrop-blur-xl flex flex-col relative transition-all duration-500 z-10"
      >
        <AnimatePresence>
          {errors.prompt && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute bottom-full left-4 mb-2 flex items-center gap-2 text-xs text-red-400 bg-red-950/90 border border-red-500/30 px-3 py-2 rounded-lg shadow-lg backdrop-blur-sm"
            >
              <AlertCircle size={14} />
              <span>{errors.prompt.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {pendingImage && (
            <div className="flex w-full px-2">
              <ImagePreview src={pendingImage} onRemove={onClearImage} />
            </div>
          )}
        </AnimatePresence>

        <div className="flex gap-3 items-end w-full">
          <div className="relative flex-1 group">
            <TextareaAutosize
              {...register('prompt')}
              maxRows={12}
              minRows={1}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              disabled={isStreaming}
              placeholder={pendingImage ? 'Opisz cel wizualny...' : 'Wpisz polecenie...'}
              className={cn(
                'w-full bg-[var(--matrix-input-bg)] text-[var(--matrix-text)] border border-[var(--matrix-border)]',
                'rounded-xl px-5 py-3 pr-24',
                'focus:outline-none focus:ring-2 focus:ring-[var(--matrix-accent)]/50',
                'placeholder:text-[var(--matrix-text-dim)]/60 font-mono text-base resize-none scrollbar-hide',
                'transition-all duration-300 shadow-inner',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                isOverLimit && 'border-red-500 focus:ring-red-500',
                errors.prompt && 'border-red-500/50',
              )}
            />
            <div className="absolute inset-0 rounded-xl bg-[var(--matrix-accent)]/5 opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity duration-500 blur-sm" />
            <div className="absolute right-3 bottom-2.5 flex items-center gap-3">
              {charCount > 0 && (
                <div
                  className={cn(
                    'text-[10px] font-mono transition-colors duration-300',
                    isOverLimit ? 'text-red-500 font-bold' : 'text-[var(--matrix-text-dim)]/50',
                  )}
                >
                  {charCount}/{MAX_CHARS}
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              'flex items-center justify-center p-3.5 rounded-xl transition-all duration-300 mb-[1px]',
              canSubmit
                ? 'bg-[var(--matrix-accent)] text-black shadow-[0_0_15px_rgba(255,255,255,0.15)]'
                : 'bg-slate-700/50 text-slate-400',
              canSubmit
                ? 'hover:bg-white hover:shadow-[0_0_12px_rgba(255,255,255,0.3)] hover:scale-[1.03]'
                : '',
              'active:scale-95 active:translate-y-0',
              'disabled:cursor-not-allowed disabled:hover:scale-100',
            )}
            title={isStreaming ? 'Generowanie...' : 'Wyślij (Enter)'}
          >
            {isStreaming ? (
              <StopCircle className="animate-pulse text-red-900" size={20} fill="currentColor" />
            ) : (
              <Send size={20} className="ml-0.5" strokeWidth={2.5} />
            )}
          </button>
        </div>

        <div className="flex justify-between px-2 mt-2">
          <span className="text-[10px] text-[var(--matrix-text-dim)] opacity-50 flex items-center gap-1">
            <Paperclip size={10} />
            Ctrl+V: wklej obraz lub plik
          </span>
          <span className="text-[10px] text-[var(--matrix-text-dim)] opacity-50 font-mono">
            Shift+Enter: nowa linia
          </span>
        </div>
      </form>
    );
  },
);

ChatInput.displayName = 'ChatInput';

export default ChatInput;
