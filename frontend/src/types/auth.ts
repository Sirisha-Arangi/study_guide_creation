export interface User {
  id: number;
  email: string;
  name: string;
  department?: string;
  branch?: string;
  year?: number;
  section?: string;
  roll_number?: string;
  role: 'teacher' | 'student';
  is_active: boolean;
}

export interface UserCreate {
  email: string;
  password: string;
  name: string;
  department?: string;
  branch?: string;
  year?: number;
  section?: string;
  roll_number?: string;
  role: 'teacher' | 'student';
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}
