import { User, ChatRoom, Message, AuthState } from '../types';
import * as SecureStore from 'expo-secure-store';

class ApiService {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = 'http://localhost:3001/api') {
    this.baseURL = baseURL;
    this.loadToken();
  }

  private async loadToken(): Promise<void> {
    try {
      this.token = await SecureStore.getItemAsync('auth_token');
    } catch (error) {
      console.error('Failed to load token:', error);
    }
  }

  private async saveToken(token: string): Promise<void> {
    try {
      this.token = token;
      await SecureStore.setItemAsync('auth_token', token);
    } catch (error) {
      console.error('Failed to save token:', error);
    }
  }

  private async removeToken(): Promise<void> {
    try {
      this.token = null;
      await SecureStore.deleteItemAsync('auth_token');
    } catch (error) {
      console.error('Failed to remove token:', error);
    }
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Authentication methods
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const result = await this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    await this.saveToken(result.token);
    return result;
  }

  async register(userData: {
    username: string;
    email: string;
    password: string;
    displayName?: string;
  }): Promise<{ user: User; token: string }> {
    const result = await this.request<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    await this.saveToken(result.token);
    return result;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      await this.removeToken();
    }
  }

  async refreshToken(): Promise<{ user: User; token: string }> {
    const result = await this.request<{ user: User; token: string }>('/auth/refresh', {
      method: 'POST',
    });

    await this.saveToken(result.token);
    return result;
  }

  // User methods
  async getProfile(): Promise<User> {
    return this.request<User>('/users/me');
  }

  async updateProfile(updates: Partial<User>): Promise<User> {
    return this.request<User>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async updateTheme(theme: string): Promise<User> {
    return this.request<User>('/users/theme', {
      method: 'PUT',
      body: JSON.stringify({ theme }),
    });
  }

  async searchUsers(query: string): Promise<User[]> {
    return this.request<User[]>(`/users/search?q=${encodeURIComponent(query)}`);
  }

  // Chat room methods
  async getRooms(): Promise<ChatRoom[]> {
    return this.request<ChatRoom[]>('/rooms');
  }

  async createRoom(data: {
    name?: string;
    participantEmails?: string[];
  }): Promise<ChatRoom> {
    return this.request<ChatRoom>('/rooms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getRoom(roomId: string): Promise<ChatRoom> {
    return this.request<ChatRoom>(`/rooms/${roomId}`);
  }

  async updateRoom(roomId: string, updates: Partial<ChatRoom>): Promise<ChatRoom> {
    return this.request<ChatRoom>(`/rooms/${roomId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteRoom(roomId: string): Promise<void> {
    await this.request(`/rooms/${roomId}`, { method: 'DELETE' });
  }

  async joinRoom(roomId: string): Promise<void> {
    await this.request(`/rooms/${roomId}/join`, { method: 'POST' });
  }

  async leaveRoom(roomId: string): Promise<void> {
    await this.request(`/rooms/${roomId}/leave`, { method: 'DELETE' });
  }

  // Message methods
  async getMessages(
    roomId: string, 
    options: { limit?: number; offset?: number } = {}
  ): Promise<Message[]> {
    const { limit = 50, offset = 0 } = options;
    return this.request<Message[]>(
      `/rooms/${roomId}/messages?limit=${limit}&offset=${offset}`
    );
  }

  async sendMessage(roomId: string, data: {
    content: string;
    type?: string;
    metadata?: any;
  }): Promise<Message> {
    return this.request<Message>(`/rooms/${roomId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMessage(messageId: string, content: string): Promise<Message> {
    return this.request<Message>(`/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  }

  async deleteMessage(messageId: string): Promise<void> {
    await this.request(`/messages/${messageId}`, { method: 'DELETE' });
  }

  async addReaction(messageId: string, type: string): Promise<void> {
    await this.request(`/messages/${messageId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
  }

  async removeReaction(messageId: string, type: string): Promise<void> {
    await this.request(`/messages/${messageId}/reactions/${type}`, {
      method: 'DELETE',
    });
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request<{ status: string; timestamp: string }>('/health');
  }

  // Token management
  getToken(): string | null {
    return this.token;
  }

  setToken(token: string): void {
    this.token = token;
  }

  hasValidToken(): boolean {
    return !!this.token;
  }
}

// Singleton instance
export const apiService = new ApiService();
export default apiService;