import axios from 'axios';
import { API_BASE_URL } from '../config/api';

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
      console.log('Sending registration request:', { username, email });
      
      const res = await axios.post(
        `${API_BASE_URL}/auth/register`,
        { username, email, password },
        { 
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000 // 10 second timeout
        }
      );
      
      console.log('Registration successful:', res.data);
      this.setToken(res.data.token);
      return res.data.user;
      
    } catch (error: any) {
      console.error('Registration failed:', error);
      
      if (error.response) {
        // Server responded with error status
        console.error('Error Status:', error.response.status);
        console.error('Error Data:', error.response.data);
        console.error('Request Data:', { username, email, password: '***' });
        
        const errorMessage = error.response.data?.message || 'Registration failed';
        throw new Error(errorMessage);
      } else if (error.request) {
        // Network error
        console.error('Network error - no response received:', error.request);
        throw new Error('Failed to connect to server. Please check your internet connection.');
      } else {
        // Other error
        console.error('Request setup error:', error.message);
        throw new Error('Failed to send registration request');
      }
    }
  }

  async login(email: string, password: string): Promise<User> {
    try {
      console.log('Sending login request for:', email);
      
      const res = await axios.post(
        `${API_BASE_URL}/auth/login`,
        { email, password },
        { 
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000 // 10 second timeout
        }
      );
      
      console.log('Login successful:', res.data);
      this.setToken(res.data.token);
      return res.data.user;
      
    } catch (error: any) {
      console.error('Login failed:', error);
      
      if (error.response) {
        console.error('Error Status:', error.response.status);
        console.error('Error Data:', error.response.data);
        
        const errorMessage = error.response.data?.message || 'Login failed';
        throw new Error(errorMessage);
      } else if (error.request) {
        console.error('Network error - no response received:', error.request);
        throw new Error('Failed to connect to server. Please check your internet connection.');
      } else {
        console.error('Request setup error:', error.message);
        throw new Error('Failed to send login request');
      }
    }
  }

  async getCurrentUser(): Promise<User> {
    if (!this.token) {
      throw new Error('No authentication token found');
    }
    
    try {
      const res = await axios.get(
        `${API_BASE_URL}/auth/me`,
        { 
          headers: { 
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );
      
      return res.data.user;
      
    } catch (error: any) {
      console.error('Failed to get current user:', error);
      
      if (error.response) {
        // Check if token is invalid (401/403)
        if (error.response.status === 401 || error.response.status === 403) {
          this.clearToken(); // Clear invalid token
          throw new Error('Session expired. Please login again.');
        }
        
        const errorMessage = error.response.data?.message || 'Failed to retrieve user information';
        throw new Error(errorMessage);
      } else if (error.request) {
        throw new Error('Failed to connect to server. Please check your internet connection.');
      } else {
        throw new Error('Failed to retrieve user information');
      }
    }
  }

  logout() {
    this.clearToken();
    console.log('User logged out successfully');
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  // Helper method to refresh token if needed
  async refreshToken(): Promise<boolean> {
    if (!this.token) return false;
    
    try {
      // Try to get current user to validate token
      await this.getCurrentUser();
      return true;
    } catch (error) {
      // Token is invalid, clear it
      this.clearToken();
      return false;
    }
  }
}

export const authService = new AuthService();
