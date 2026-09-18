import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  mode = signal<'login' | 'register'>('login');
  email = '';
  password = '';
  fullName = '';
  loading = signal(false);
  error = signal<string | null>(null);

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  switchMode(mode: 'login' | 'register'): void {
    this.mode.set(mode);
    this.error.set(null);
  }

  async submit(): Promise<void> {
    const email = this.email.trim();
    const password = this.password;
    if (!email || !password) {
      this.error.set('Completa email y contraseña');
      return;
    }
    if (password.length < 6) {
      this.error.set('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    try {
      if (this.mode() === 'login') {
        await this.auth.signIn(email, password);
      } else {
        await this.auth.signUp(email, password, this.fullName);
        if (!this.auth.session()) {
          await this.auth.signIn(email, password);
        }
      }
      await this.router.navigateByUrl('/');
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'No se pudo autenticar';
      this.error.set(this.friendlyAuthError(raw));
    } finally {
      this.loading.set(false);
    }
  }

  private friendlyAuthError(message: string): string {
    const m = message.toLowerCase();
    if (m.includes('email not confirmed') || m.includes('email_not_confirmed')) {
      return 'Tu email aún no está confirmado. Espera un momento e intenta entrar de nuevo.';
    }
    if (m.includes('invalid login credentials')) {
      return 'Email o contraseña incorrectos';
    }
    if (m.includes('user already registered')) {
      return 'Ese email ya está registrado. Prueba con Entrar.';
    }
    return message;
  }
}
