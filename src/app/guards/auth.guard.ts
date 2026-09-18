import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Wait until initial session is loaded
  const started = Date.now();
  while (!auth.ready() && Date.now() - started < 5000) {
    await new Promise((r) => setTimeout(r, 50));
  }

  if (auth.session()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const started = Date.now();
  while (!auth.ready() && Date.now() - started < 5000) {
    await new Promise((r) => setTimeout(r, 50));
  }

  if (auth.session()) {
    return router.createUrlTree(['/']);
  }

  return true;
};
