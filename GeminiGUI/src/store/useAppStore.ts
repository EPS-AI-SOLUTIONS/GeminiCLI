import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface Session {
  id: string;
  title: string;
  createdAt: number;
}

export interface Settings {
  ollamaEndpoint: string;
  systemPrompt: string;
  geminiApiKey: string;
  defaultProvider: 'ollama' | 'gemini';
  useSwarm: boolean;
}

interface AppState {
  count: number;
  theme: 'dark' | 'light';
  provider: 'ollama' | 'gemini'; // Current active provider for the session or global override
  
  // Session Management
  sessions: Session[];
  currentSessionId: string | null;
  chatHistory: Record<string, Message[]>; // Key: sessionId -> Messages[]
  
  // Settings
  settings: Settings;

  // Actions
  increment: () => void;
  decrement: () => void;
  reset: () => void;
  toggleTheme: () => void;
  setProvider: (provider: 'ollama' | 'gemini') => void;
  
  // Chat Actions
  createSession: () => void;
  deleteSession: (id: string) => void;
  selectSession: (id: string) => void;
  addMessage: (msg: Message) => void;
  updateLastMessage: (content: string) => void;
  clearHistory: () => void; // Clears current session
  updateSessionTitle: (id: string, title: string) => void;
  
  // Settings Actions
  updateSettings: (settings: Partial<Settings>) => void;
}

const DEFAULT_SYSTEM_PROMPT = `
Jesteś Jaskierem z Wiedźmina – mistrzem słowa, trubadurem i niezbyt odważnym, ale niezwykle lojalnym kompanem. 
Twoim obecnym "Geraltem" jest użytkownik GeminiGUI. 
Mówisz w języku polskim, używając barwnego, nieco archaicznego, ale ironicznego języka. 
Często wtrącasz anegdoty o swoich przygodach, narzekasz na trudy podróży i nie szczędzisz lekkich złośliwości (roast), ale zawsze służysz pomocą.

Masz dostęp do magii (komend systemowych). Aby rzucić zaklęcie (wykonać komendę), użyj formatu:
[EXECUTE: "twoja komenda tutaj"]

Przykład:
Użytkownik: "Sprawdź wolne miejsce na dysku"
Jaskier: "Ech, Geralcie... to znaczy, Panie... Nawet w moim ekwipunku jest więcej miejsca niż na tym twoim magicznym krzemie. Spójrzmy tylko... [EXECUTE: "wmic logicaldisk get size,freespace,caption"]"

Używaj tego tylko do bezpiecznego zbierania informacji. Twoja pieśń musi być piękna, a kody czyste.
`;

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      count: 0,
      theme: 'dark',
      provider: 'ollama',
      
      sessions: [],
      currentSessionId: null,
      chatHistory: {},
      
      settings: {
        ollamaEndpoint: 'http://localhost:11434',
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        geminiApiKey: '',
        defaultProvider: 'ollama',
        useSwarm: false
      },

      increment: () => set((state) => ({ count: state.count + 1 })),
      decrement: () => set((state) => ({ count: state.count - 1 })),
      reset: () => set({ count: 0 }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setProvider: (provider: 'ollama' | 'gemini') => set({ provider }),
      
      createSession: () => {
        const id = crypto.randomUUID();
        const newSession: Session = { id, title: 'New Chat', createdAt: Date.now() };
        set(state => ({
          sessions: [newSession, ...state.sessions],
          currentSessionId: id,
          chatHistory: { ...state.chatHistory, [id]: [] }
        }));
      },

      deleteSession: (id) => set(state => {
        const newSessions = state.sessions.filter(s => s.id !== id);
        const { [id]: deleted, ...newHistory } = state.chatHistory;
        let newCurrentId = state.currentSessionId;
        
        if (state.currentSessionId === id) {
          newCurrentId = newSessions.length > 0 ? newSessions[0].id : null;
        }

        return {
          sessions: newSessions,
          chatHistory: newHistory,
          currentSessionId: newCurrentId
        };
      }),

      selectSession: (id) => set({ currentSessionId: id }),

      addMessage: (msg) => set(state => {
        if (!state.currentSessionId) return state;
        
        const currentMessages = state.chatHistory[state.currentSessionId] || [];
        const updatedMessages = [...currentMessages, msg];
        
        // Update Session Title if it's the first user message
        let updatedSessions = state.sessions;
        if (msg.role === 'user' && currentMessages.length === 0) {
             updatedSessions = state.sessions.map(s => 
               s.id === state.currentSessionId 
                 ? { ...s, title: msg.content.substring(0, 30) + (msg.content.length > 30 ? '...' : '') } 
                 : s
             );
        }

        return {
          chatHistory: {
            ...state.chatHistory,
            [state.currentSessionId]: updatedMessages
          },
          sessions: updatedSessions
        };
      }),

      updateLastMessage: (content) => set(state => {
        if (!state.currentSessionId) return state;
        const messages = state.chatHistory[state.currentSessionId] || [];
        if (messages.length === 0) return state;

        const newMessages = [...messages];
        const lastMsg = newMessages[newMessages.length - 1];
        
        newMessages[newMessages.length - 1] = {
          ...lastMsg,
          content: lastMsg.content + content
        };

        return {
          chatHistory: {
            ...state.chatHistory,
            [state.currentSessionId]: newMessages
          }
        };
      }),

      clearHistory: () => set(state => {
        if (!state.currentSessionId) return state;
        return {
          chatHistory: {
            ...state.chatHistory,
            [state.currentSessionId]: []
          }
        };
      }),

      updateSessionTitle: (id, title) => set(state => ({
        sessions: state.sessions.map(s => s.id === id ? { ...s, title } : s)
      })),

      updateSettings: (newSettings) => set(state => ({
        settings: { ...state.settings, ...newSettings }
      })),
    }),
    {
      name: 'gemini-storage-v2', // Changed name to reset storage structure
    }
  )
);