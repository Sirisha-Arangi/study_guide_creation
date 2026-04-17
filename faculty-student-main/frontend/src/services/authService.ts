import apiService from './api';
import { User, UserCreate, UserLogin, AuthResponse } from '../types/auth';

class AuthService {
  async register(userData: UserCreate): Promise<User> {
    return await apiService.post<User>('/api/auth/register', userData);
  }

  async login(credentials: UserLogin): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>('/api/auth/login', credentials);
    
    // Store token and user in localStorage
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('token_type', response.token_type);
    
    // Get user info
    const user = await this.getCurrentUser();
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }
    
    return response;
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      return await apiService.get<User>('/api/auth/me');
    } catch (error) {
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      await apiService.post('/api/auth/logout');
    } catch (error) {
      // Continue with logout even if API call fails
    } finally {
      // Clear localStorage
      localStorage.removeItem('access_token');
      localStorage.removeItem('token_type');
      localStorage.removeItem('user');
    }
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('access_token');
    return !!token;
  }

  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  getStoredToken(): string | null {
    return localStorage.getItem('access_token');
  }
}

export const authService = new AuthService();
export default authService;
