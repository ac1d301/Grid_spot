import axios from 'axios';

const BASE_URL = 'http://localhost:5001/api';

export interface User {
  id: string;
  username: string;
  email: string;
}

class AuthService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('f1_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('f1_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('f1_token');
  }

  getToken() {
    return this.token;
  }

  async register(username: string, email: string, password: string): Promise<User> {
    try {
      const res = await axios.post(`${BASE_URL}/auth/register`, { username, email, password });
      this.setToken(res.data.token);
      return res.data.user;
    } catch (error) {
      console.error('Registration failed:', error);
      throw new Error('Failed to register user');
    }
  }

  async login(email: string, password: string): Promise<User> {
    try {
      const res = await axios.post(`${BASE_URL}/auth/login`, { email, password });
      this.setToken(res.data.token);
      return res.data.user;
    } catch (error) {
      console.error('Login failed:', error);
      throw new Error('Failed to login user');
    }
  }

  async getCurrentUser(): Promise<User> {
    if (!this.token) throw new Error('No token');
    try {
      const res = await axios.get(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      return res.data.user;
    } catch (error) {
      console.error('Failed to get current user:', error);
      throw new Error('Failed to retrieve current user');
    }
  }

  logout() {
    this.clearToken();
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }
}

export const authService = new AuthService();
