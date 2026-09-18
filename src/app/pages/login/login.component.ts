import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { toSpanishError } from '../../core/es-error';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  email = '';
  password = '';
  loading = signal(false);
  error = signal<string | null>(null);

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  async submit(): Promise<void> {
    const email = this.email.trim();
    const password = this.password;
    if (!email || !password) {
      this.error.set('Completa email y contraseña');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    try {
      await this.auth.signIn(email, password);
      await this.router.navigateByUrl('/');
    } catch (e) {
      this.error.set(toSpanishError(e, 'No se pudo iniciar sesión'));
    } finally {
      this.loading.set(false);
    }
  }
}
