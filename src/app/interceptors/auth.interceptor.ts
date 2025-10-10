import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';

/**
 * HTTP Interceptor to automatically add authentication token to requests
 * and handle authentication errors
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Get the auth token from the service
  const authToken = authService.getToken();

  // Clone the request and add the authorization header if token exists
  let authReq = req;
  if (authToken && !req.url.includes('/login') && !req.url.includes('/refresh')) {
    authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${authToken}`)
    });
  }

  // Handle the request and catch authentication errors
  return next(authReq).pipe(
    catchError((error) => {
      // If we get a 401 (Unauthorized) response, logout the user
      if (error.status === 401 && !req.url.includes('/login')) {
        console.warn('Unauthorized request, logging out user');
        authService.logoutDemo();
        router.navigate(['/login']);
      }
      
      // If we get a 403 (Forbidden) response, redirect to login
      if (error.status === 403) {
        console.warn('Forbidden request, redirecting to login');
        router.navigate(['/login']);
      }

      return throwError(() => error);
    })
  );
};

/**
 * Alternative class-based interceptor (if you prefer this approach)
 */
/*
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Get the auth token from the service
    const authToken = this.authService.getToken();

    // Clone the request and add the authorization header if token exists
    let authReq = req;
    if (authToken && !req.url.includes('/login') && !req.url.includes('/refresh')) {
      authReq = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${authToken}`)
      });
    }

    // Handle the request and catch authentication errors
    return next.handle(authReq).pipe(
      catchError((error) => {
        // If we get a 401 (Unauthorized) response, logout the user
        if (error.status === 401 && !req.url.includes('/login')) {
          console.warn('Unauthorized request, logging out user');
          this.authService.logoutDemo();
          this.router.navigate(['/login']);
        }
        
        // If we get a 403 (Forbidden) response, redirect to login
        if (error.status === 403) {
          console.warn('Forbidden request, redirecting to login');
          this.router.navigate(['/login']);
        }

        return throwError(() => error);
      })
    );
  }
}
*/