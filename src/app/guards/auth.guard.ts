import { Injectable, inject } from '@angular/core';
import { 
  CanActivate, 
  ActivatedRouteSnapshot, 
  RouterStateSnapshot, 
  Router,
  UrlTree
} from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  private authService = inject(AuthService);
  private router = inject(Router);

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    
    // Check if user is authenticated
    if (this.authService.isLoggedIn()) {
      return true;
    }

    // User is not authenticated, redirect to login with return URL
    console.log('User not authenticated, redirecting to login');
    
    // Store the attempted URL for redirecting after login
    const returnUrl = state.url;
    
    // Navigate to login page with return URL as query parameter
    return this.router.createUrlTree(['/login'], {
      queryParams: { returnUrl: returnUrl }
    });
  }
}

/**
 * Alternative function-based guard approach for Angular 20+
 * You can use this instead of the class-based guard above
 */
export const authGuardFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  // Store the attempted URL for redirecting after login
  const returnUrl = state.url;
  
  // Navigate to login page with return URL as query parameter
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: returnUrl }
  });
};

/**
 * Guard to prevent authenticated users from accessing login page
 */
@Injectable({
  providedIn: 'root'
})
export class LoginGuard implements CanActivate {
  private authService = inject(AuthService);
  private router = inject(Router);

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    
    // If user is already logged in, redirect to dashboard
    if (this.authService.isLoggedIn()) {
      console.log('User already authenticated, redirecting to dashboard');
      return this.router.createUrlTree(['/dashboard']);
    }

    // User is not authenticated, allow access to login page
    return true;
  }
}

/**
 * Function-based version of LoginGuard
 */
export const loginGuardFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // If user is already logged in, redirect to dashboard
  if (authService.isLoggedIn()) {
    console.log('User already authenticated, redirecting to dashboard');
    return router.createUrlTree(['/dashboard']);
  }

  // User is not authenticated, allow access to login page
  return true;
};