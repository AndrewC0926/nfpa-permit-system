import axios from 'axios';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  context?: {
    permitId?: string;
    topic?: string;
  };
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

const chatbotApi = axios.create({
  baseURL: API_BASE_URL,
  // ... existing config ...
});

class ChatBotService {
  private baseUrl = '/api/chatbot';
  private currentSession: ChatSession | null = null;

  async initializeSession(context?: { permitId?: string; topic?: string }): Promise<ChatSession> {
    const response = await chatbotApi.post(`${this.baseUrl}/sessions`, { context });
    this.currentSession = response.data;
    if (!this.currentSession) throw new Error('No session returned');
    return this.currentSession;
  }

  async sendMessage(message: string): Promise<ChatMessage> {
    if (!this.currentSession) throw new Error('No active session');
    const response = await chatbotApi.post(`${this.baseUrl}/messages`, {
      sessionId: this.currentSession.id,
      message,
    });
    return response.data;
  }

  async getSessionHistory(sessionId: string): Promise<ChatSession> {
    const response = await chatbotApi.get(`${this.baseUrl}/sessions/${sessionId}`);
    this.currentSession = response.data;
    if (!this.currentSession) throw new Error('No session returned');
    return this.currentSession;
  }

  getCurrentSession(): ChatSession | null {
    return this.currentSession;
  }

  clearSession(): void {
    this.currentSession = null;
  }
}

export const chatBotService = new ChatBotService(); 