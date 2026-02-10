/**
 * Keyboard Shortcuts Integration Examples
 *
 * Real-world examples of how to use useHotkey and useKeyboardShortcuts
 * in GeminiHydra GUI components.
 */

// =============================================================================
// EXAMPLE 1: Chat Input with Submit Shortcut
// =============================================================================

import { useRef, useState } from 'react';
import { KEYBOARD_SHORTCUTS } from '@/constants';
import { useHotkey, useKeyboardShortcuts } from '@/hooks';

export function ChatInputExample() {
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Use multiple shortcuts for chat input
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts({
    [KEYBOARD_SHORTCUTS.SUBMIT_MESSAGE]: () => {
      if (message.trim()) {
        handleSubmit();
        setMessage('');
      }
    },
    [KEYBOARD_SHORTCUTS.FOCUS_INPUT]: () => {
      inputRef.current?.focus();
    },
    [KEYBOARD_SHORTCUTS.CLEAR_CHAT]: () => {
      if (confirm('Clear chat? This cannot be undone.')) {
        setMessage('');
        // Call clear handler
      }
    },
  });

  const handleSubmit = () => {
    console.log('Submitting:', message);
    // TODO: Call your submit handler here
  };

  return (
    <div className="chat-input">
      <textarea
        ref={inputRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message... (Ctrl+Enter to send)"
        rows={3}
      />
      <div className="shortcuts-hint">Ctrl+Enter: Send | Ctrl+L: Clear | Ctrl+Shift+I: Focus</div>
      <button onClick={handleSubmit}>Send Message</button>
    </div>
  );
}

// =============================================================================
// EXAMPLE 2: Settings Modal with Escape to Close
// =============================================================================

export function SettingsModalExample({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  // Single hotkey - close on Escape
  useHotkey(KEYBOARD_SHORTCUTS.CLOSE_MODAL, onClose, {
    enabled: isOpen, // Only listen when modal is open
    preventDefault: true,
  });

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>Settings</h2>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {/* Settings content */}
          <p>Press Escape to close</p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// EXAMPLE 3: Global App Shortcuts
// =============================================================================

export function AppGlobalShortcuts() {
  // Register global shortcuts at app level
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts({
    [KEYBOARD_SHORTCUTS.NEW_SESSION]: () => {
      console.log('Creating new session...');
      // TODO: Dispatch action to create new session
    },
    [KEYBOARD_SHORTCUTS.OPEN_SETTINGS]: () => {
      console.log('Opening settings...');
      // TODO: Show settings modal
    },
    [KEYBOARD_SHORTCUTS.TOGGLE_SIDEBAR]: () => {
      console.log('Toggling sidebar...');
      // TODO: Toggle sidebar visibility
    },
    [KEYBOARD_SHORTCUTS.SEARCH_SESSIONS]: () => {
      console.log('Opening search...');
      // TODO: Focus search or open search modal
    },
  });

  return (
    <div>
      {/* App content */}
      <p>Global shortcuts registered</p>
    </div>
  );
}

// =============================================================================
// EXAMPLE 4: Dynamic Shortcut Management
// =============================================================================

export function DynamicShortcutsExample() {
  const [isEditing, setIsEditing] = useState(false);
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts({});

  // Enable undo/redo when editing
  const startEditing = () => {
    setIsEditing(true);
    registerShortcut(KEYBOARD_SHORTCUTS.UNDO, () => {
      console.log('Undo action');
      // TODO: Implement undo
    });
    registerShortcut(KEYBOARD_SHORTCUTS.REDO, () => {
      console.log('Redo action');
      // TODO: Implement redo
    });
  };

  const stopEditing = () => {
    setIsEditing(false);
    unregisterShortcut(KEYBOARD_SHORTCUTS.UNDO);
    unregisterShortcut(KEYBOARD_SHORTCUTS.REDO);
  };

  return (
    <div>
      {!isEditing ? (
        <button onClick={startEditing}>Start Editing</button>
      ) : (
        <div>
          <p>Editing mode active</p>
          <p>Available: Ctrl+Z (Undo) | Ctrl+Shift+Z (Redo)</p>
          <button onClick={stopEditing}>Stop Editing</button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// EXAMPLE 5: Conditional Shortcuts (Modal vs Normal)
// =============================================================================

export function ConditionalShortcutsExample({ isModalOpen }: { isModalOpen: boolean }) {
  // Different shortcuts based on context
  useKeyboardShortcuts(
    isModalOpen
      ? {
          // Shortcuts only when modal is open
          [KEYBOARD_SHORTCUTS.CLOSE_MODAL]: () => {
            console.log('Close modal');
            // TODO: Close modal
          },
        }
      : {
          // Shortcuts when modal is closed
          [KEYBOARD_SHORTCUTS.NEW_SESSION]: () => {
            console.log('New session');
            // TODO: New session
          },
          [KEYBOARD_SHORTCUTS.OPEN_SETTINGS]: () => {
            console.log('Open settings');
            // TODO: Open settings
          },
        },
  );

  return (
    <div>
      <p>{isModalOpen ? 'Modal open' : 'Modal closed'}</p>
    </div>
  );
}

// =============================================================================
// EXAMPLE 6: Keyboard Shortcuts Help Modal
// =============================================================================

import { KEYBOARD_SHORTCUTS_LABELS } from '@/constants';

export function KeyboardShortcutsHelpModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  // Close help modal with Escape
  useHotkey(KEYBOARD_SHORTCUTS.CLOSE_MODAL, onClose, {
    enabled: isOpen,
  });

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal help-modal">
        <div className="modal-header">
          <h2>Keyboard Shortcuts</h2>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <table className="shortcuts-table">
            <thead>
              <tr>
                <th>Shortcut</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(KEYBOARD_SHORTCUTS_LABELS).map(([shortcut, label]) => (
                <tr key={shortcut}>
                  <td className="shortcut-code">
                    <kbd>{shortcut.toUpperCase().replace(/\+/g, ' + ')}</kbd>
                  </td>
                  <td>{label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// EXAMPLE 7: Complete Chat Component with All Shortcuts
// =============================================================================

export function CompleteChattingExample() {
  const [messages, setMessages] = useState<string[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Register all chat-related shortcuts
  const { registerShortcut } = useKeyboardShortcuts({
    [KEYBOARD_SHORTCUTS.SUBMIT_MESSAGE]: () => {
      if (currentMessage.trim()) {
        setMessages([...messages, currentMessage]);
        setCurrentMessage('');
      }
    },
    [KEYBOARD_SHORTCUTS.CLEAR_CHAT]: () => {
      if (confirm('Clear all messages?')) {
        setMessages([]);
      }
    },
    [KEYBOARD_SHORTCUTS.FOCUS_INPUT]: () => {
      inputRef.current?.focus();
    },
    [KEYBOARD_SHORTCUTS.OPEN_SETTINGS]: () => {
      setIsSettingsOpen(true);
    },
  });

  // Modal close handler
  useHotkey(KEYBOARD_SHORTCUTS.CLOSE_MODAL, () => setIsSettingsOpen(false), {
    enabled: isSettingsOpen,
  });

  return (
    <div className="chat-app">
      {/* Messages */}
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className="message">
            {msg}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="input-area">
        <textarea
          ref={inputRef}
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
          placeholder="Type message (Ctrl+Enter to send)..."
        />
        <button onClick={() => setMessages([...messages, currentMessage])}>Send</button>
        <button onClick={() => setIsSettingsOpen(true)}>Settings</button>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Settings</h2>
            <p>Settings panel</p>
            <button onClick={() => setIsSettingsOpen(false)}>Close</button>
            <p>Or press Escape</p>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="help-text">
        <p>Ctrl+Enter: Send | Ctrl+L: Clear | Ctrl+,: Settings | Escape: Close</p>
      </div>
    </div>
  );
}

// =============================================================================
// EXAMPLE 8: Using isHotkeyPressed Directly
// =============================================================================

import { isHotkeyPressed } from '@/hooks';

export function CustomKeyHandlerExample() {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Check specific hotkey
    if (isHotkeyPressed(event as any, KEYBOARD_SHORTCUTS.SUBMIT_MESSAGE)) {
      console.log('Submit via direct check');
    }

    // Multiple checks
    if (isHotkeyPressed(event as any, 'ctrl+s')) {
      event.preventDefault();
      console.log('Save');
    }
  };

  return <input type="text" placeholder="Custom key handler" onKeyDown={handleKeyDown} />;
}

// =============================================================================
// EXAMPLE 9: Integration in Session Sidebar
// =============================================================================

export function SessionSidebarExample() {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sidebar shortcuts
  useKeyboardShortcuts({
    [KEYBOARD_SHORTCUTS.NEW_SESSION]: () => {
      console.log('Creating new session');
      // TODO: Create new session
    },
    [KEYBOARD_SHORTCUTS.SEARCH_SESSIONS]: () => {
      searchInputRef.current?.focus();
    },
  });

  return (
    <aside className="sidebar">
      <h2>Sessions</h2>
      <input
        ref={searchInputRef}
        type="text"
        placeholder="Search (Ctrl+F)..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <button>New Session (Ctrl+N)</button>
      <ul>
        <li>Session 1</li>
        <li>Session 2</li>
      </ul>
    </aside>
  );
}

// =============================================================================
// EXAMPLE 10: Testing Pattern
// =============================================================================

/**
 * Example of how to test keyboard shortcuts
 */
export function KeyboardShortcutsTest() {
  const callback = () => {
    console.log('Callback executed');
  };

  useHotkey('ctrl+enter', callback);

  // In test:
  // const event = new KeyboardEvent('keydown', {
  //   key: 'Enter',
  //   ctrlKey: true,
  // });
  // window.dispatchEvent(event);
  // expect(callback).toHaveBeenCalled();

  return <div>Keyboard shortcut test component</div>;
}

// =============================================================================
// EXPORTS
// =============================================================================

export const examples = {
  ChatInputExample,
  SettingsModalExample,
  AppGlobalShortcuts,
  DynamicShortcutsExample,
  ConditionalShortcutsExample,
  KeyboardShortcutsHelpModal,
  CompleteChattingExample,
  CustomKeyHandlerExample,
  SessionSidebarExample,
  KeyboardShortcutsTest,
};
