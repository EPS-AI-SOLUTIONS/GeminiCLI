/**
 * useContextMenuActions - Context menu event handler hook
 *
 * Handles custom context menu actions from the SystemContextMenu component.
 * Extracted from App.tsx for better separation of concerns.
 */

import { useEffect } from 'react';

export type ContextAction = 'ask' | 'analyze' | 'run';

export interface ContextActionDetail {
  action: ContextAction;
  content: string;
}

export interface UseContextMenuActionsOptions {
  /** Handler for submitting prompts */
  handleSubmit: (prompt: string, image: string | null) => void;
}

/**
 * Hook for handling context menu actions
 *
 * Listens for 'gemini-context-action' custom events and triggers
 * appropriate actions based on the action type.
 *
 * @example
 * ```tsx
 * useContextMenuActions({
 *   handleSubmit: (prompt, image) => {
 *     // Submit the prompt to the chat
 *   },
 * });
 * ```
 */
export function useContextMenuActions(options: UseContextMenuActionsOptions): void {
  const { handleSubmit } = options;

  useEffect(() => {
    const handleContextAction = (e: Event) => {
      const customEvent = e as CustomEvent<ContextActionDetail>;
      const { action, content } = customEvent.detail;

      switch (action) {
        case 'ask':
          handleSubmit(content, null);
          break;

        case 'analyze':
          handleSubmit(
            `[ANALIZA KODU/TEKSTU]\n\n\`\`\`\n${content}\n\`\`\`\n\nPrzeanalizuj powyższy fragment. Wskaż błędy, potencjalne problemy i zaproponuj optymalizację.`,
            null,
          );
          break;

        case 'run':
          handleSubmit(
            `Chcę uruchomić komendę:\n\`${content}\`\n\nCzy jest bezpieczna? Jeśli tak, wykonaj ją.`,
            null,
          );
          break;
      }
    };

    window.addEventListener('gemini-context-action', handleContextAction);
    return () => window.removeEventListener('gemini-context-action', handleContextAction);
  }, [handleSubmit]);
}

export default useContextMenuActions;
