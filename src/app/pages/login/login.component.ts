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
        // If email confirmation is disabled, session may already exist
        if (!this.auth.session()) {
          await this.auth.signIn(email, password);
        }
      }
      await this.router.navigateByUrl('/');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo autenticar');
    } finally {
      this.loading.set(false);
    }
  }
}
