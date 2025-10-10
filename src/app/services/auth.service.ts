import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

export interface User {
  id: string;
  username: string;
  email?: string;
  role?: string;
}

export interface LoginResponse {
  success: boolean;
  user: User;
  token: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = '/api/auth'; // Adjust this to your API endpoint
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private tokenKey = 'auth_token';
  private userKey = 'current_user';

  // Observable for components to subscribe to
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Check if user is already logged in on service initialization
    this.loadStoredAuth();
  }

  /**
   * Attempt to log in a user
   */
  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { username, password })
      .pipe(
        tap(response => {
          if (response.success && response.token && response.user) {
            this.setSession(response.token, response.user);
          }
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Alternative method for simple authentication (for demo purposes)
   * Remove this in production and use the HTTP-based login method above
   */
  loginDemo(username: string, password: string): Observable<LoginResponse> {
    // Simple demo authentication logic
    if (username === 'admin' && password === 'password123') {
      const mockResponse: LoginResponse = {
        success: true,
        user: {
          id: '1',
          username: 'admin',
          email: 'admin@example.com',
          role: 'administrator'
        },
        token: this.generateMockToken(),
        message: 'Login successful'
      };

      // Simulate network delay
      return of(mockResponse).pipe(
        tap(response => {
          this.setSession(response.token, response.user);
        })
      );
    } else {
      return throwError(() => ({
        error: {
          success: false,
          message: 'Invalid username or password'
        }
      }));
    }
  }

  /**
   * Log out the current user
   */
  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/logout`, {})
      .pipe(
        tap(() => this.clearSession()),
        catchError(() => {
          // Even if logout fails on server, clear local session
          this.clearSession();
          return of({ success: true });
        })
      );
  }

  /**
   * Simple logout for demo
   */
  logoutDemo(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  /**
   * Check if user is currently logged in
   */
  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;

    // Check if token is expired
    return !this.isTokenExpired(token);
  }

  /**
   * Get current user information
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Get stored token
   */
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Refresh token if needed
   */
  refreshToken(): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/refresh`, {})
      .pipe(
        tap(response => {
          if (response.success && response.token) {
            localStorage.setItem(this.tokenKey, response.token);
          }
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Private method to set authentication session
   */
  private setSession(token: string, user: User): void {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  /**
   * Private method to clear authentication session
   */
  private clearSession(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.currentUserSubject.next(null);
  }

  /**
   * Load stored authentication data on service init
   */
  private loadStoredAuth(): void {
    const token = localStorage.getItem(this.tokenKey);
    const userData = localStorage.getItem(this.userKey);

    if (token && userData && !this.isTokenExpired(token)) {
      try {
        const user: User = JSON.parse(userData);
        this.currentUserSubject.next(user);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        this.clearSession();
      }
    } else {
      this.clearSession();
    }
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(token: string): boolean {
    try {
      // For JWT tokens, you would decode and check expiration
      // This is a simple implementation for demo purposes
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch (error) {
      // If token can't be parsed, consider it expired
      return true;
    }
  }

  /**
   * Generate a mock JWT token for demo purposes
   */
  private generateMockToken(): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      sub: '1',
      username: 'admin',
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    }));
    const signature = btoa('mock_signature');
    return `${header}.${payload}.${signature}`;
  }

  /**
   * Handle HTTP errors
   */
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else {
      // Server-side error
      errorMessage = error.error?.message || `Error Code: ${error.status}\nMessage: ${error.message}`;
    }

    console.error('AuthService Error:', errorMessage);
    return throwError(() => ({ error: { message: errorMessage } }));
  };
}