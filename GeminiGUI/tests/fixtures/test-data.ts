/**
 * Test Data for Playwright E2E Tests
 *
 * Centralized test data, constants, and helpers.
 */

// Test messages
export const TEST_MESSAGES = {
  simple: 'Hello, World!',
  polish: 'Sprawdź status systemu',
  withNewlines: 'Linia 1\nLinia 2\nLinia 3',
  long: 'A'.repeat(500),
  tooLong: 'A'.repeat(4001),
  markdown: '# Heading\n\n**Bold** text',
  code: '```js\nconsole.log("test");\n```',
  executePattern: 'Sprawdzam... [EXECUTE: "dir"]',
  dangerous: 'rm -rf /',
};

// Test prompts for Swarm
export const TEST_PROMPTS = {
  systemStatus: 'Sprawdź status systemu i wolne miejsce na dysku',
  projectAnalysis: 'Przeanalizuj strukturę projektu GeminiGUI',
  gitHistory: 'Wygeneruj raport z ostatnich commitów git',
  codeReview: 'Przejrzyj kod w pliku App.tsx i zasugeruj ulepszenia',
  simple: 'Powiedz cześć',
};

// Agent names from constants
export const AGENTS = [
  'Geralt',
  'Yennefer',
  'Triss',
  'Jaskier',
  'Vesemir',
  'Ciri',
  'Eskel',
  'Lambert',
  'Zoltan',
  'Regis',
  'Dijkstra',
  'Philippa',
] as const;

// Session titles
export const TEST_SESSION_TITLES = {
  default: 'New Chat',
  custom: 'Moja Testowa Sesja',
  renamed: 'Zmieniona Nazwa',
  search: 'UniqueSearchTerm',
};

// Settings values
export const TEST_SETTINGS = {
  ollamaEndpoint: {
    default: 'http://localhost:11434',
    custom: 'http://custom-server:8080',
  },
  geminiApiKey: {
    valid: 'AIzaSyTestApiKey12345',
    invalid: 'invalid-key',
  },
  systemPrompt: {
    default: 'Jesteś Jaskierem',
    custom: 'Testowy system prompt',
  },
};

// Keyboard shortcuts
export const SHORTCUTS = {
  openSettings: 'Control+,',
  openShortcuts: 'Control+/',
  clearChat: 'Control+l',
  newSession: 'Control+n',
  exportChat: 'Control+e',
  escape: 'Escape',
  enter: 'Enter',
  shiftEnter: 'Shift+Enter',
};

// Selectors (data-testid and CSS)
export const SELECTORS = {
  // Chat
  chatInput: 'textarea[placeholder*="polecenie"]',
  sendButton: 'button[type="submit"]',
  messageList: '[data-virtuoso-scroller]',
  markdownBody: '.markdown-body',
  streamingCursor: '.animate-pulse',
  emptyState: 'text=Oczekiwanie na dane',

  // Header
  header: 'header',
  logo: 'header h1',
  themeButton: 'button[title*="Motyw"]',
  statusBadge: '[class*="badge"]',

  // Sidebar
  sessionSidebar: 'aside:has-text("Sesje")',
  sessionItem: '[class*="cursor-pointer"]',
  createSessionButton: 'button:has([data-lucide="plus"])',

  // Settings Modal
  settingsModal: '.fixed.inset-0:has-text("Konfiguracja")',
  ollamaInput: 'input[placeholder*="localhost:11434"]',
  apiKeyInput: 'input[type="password"]',
  systemPromptTextarea: 'textarea',
  saveButton: 'button:has-text("Zapisz")',
  cancelButton: 'button:has-text("Anuluj")',
  clearChatButton: 'button:has-text("Wyczyść Czat")',

  // Memory Panel
  memoryPanel: ':has-text("Swiadomosc Roju")',
  knowledgeGraph: ':has-text("Graf Wiedzy")',
  agentMemory: ':has-text("Pamiec Agenta")',
  agentSelect: 'select',

  // Code Block
  codeBlock: 'pre code',
  runButton: 'button[title*="Uruchom"]',
  copyButton: 'button[title*="Kopiuj"]',
  saveToFileButton: 'button[title*="Zapisz do Pliku"]',

  // Icons (Lucide)
  sunIcon: '[data-lucide="sun"]',
  moonIcon: '[data-lucide="moon"]',
  plusIcon: '[data-lucide="plus"]',
  trashIcon: '[data-lucide="trash-2"]',
  checkIcon: '[data-lucide="check"]',
};

// Expected UI texts (Polish)
export const UI_TEXTS = {
  settings: {
    title: 'Konfiguracja Systemu',
    save: 'Zapisz',
    cancel: 'Anuluj',
    clearChat: 'Wyczyść Czat',
    factoryReset: 'Reset Fabryczny',
  },
  status: {
    streaming: 'ODBIERANIE STRUMIENIA DANYCH...',
    ready: 'Gotowy',
    geminiReady: 'Gemini Ready',
    noApiKey: 'No API Key',
    swarmInit: 'Inicjuję Protokół Wilczej Zamieci',
  },
  messages: {
    emptyState: 'Oczekiwanie na dane',
    executing: 'Wykonuję',
    systemOutput: 'SYSTEM OUTPUT',
  },
  memory: {
    title: 'Swiadomosc Roju',
    knowledgeGraph: 'Graf Wiedzy',
    agentMemory: 'Pamiec Agenta',
    noMemories: 'Brak wspomnien',
  },
  shortcuts: {
    title: 'Skróty Klawiszowe',
  },
  security: {
    dangerousCommand: 'BEZPIECZEŃSTWO',
  },
};

// Timeouts
export const TIMEOUTS = {
  short: 1000,
  medium: 5000,
  long: 15000,
  veryLong: 30000,
  streaming: 60000,
};

// Character limits (from constants/index.ts)
export const LIMITS = {
  maxContentLength: 50000,
  maxSystemPrompt: 10000,
  maxTitleLength: 100,
  maxSessions: 100,
  maxMessagesPerSession: 1000,
  maxAgentMemories: 1000,
};

/**
 * Generate a unique test ID
 */
export function generateTestId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate random text of specified length
 */
export function generateText(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/**
 * Create test message object
 */
export function createTestMessage(role: 'user' | 'assistant', content: string) {
  return {
    id: generateTestId(),
    role,
    content,
    timestamp: Date.now(),
  };
}
