import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { toSpanishError } from '../../core/es-error';
import { AlertService } from '../../services/alert.service';
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

  constructor(
    private auth: AuthService,
    private router: Router,
    private alert: AlertService
  ) {}

  async submit(): Promise<void> {
    const email = this.email.trim();
    const password = this.password;
    if (!email || !password) {
      await this.alert.warning('Completa email y contraseña');
      return;
    }

    this.loading.set(true);
    try {
      await this.auth.signIn(email, password);
      await this.router.navigateByUrl('/');
    } catch (e) {
      await this.alert.error(toSpanishError(e, 'No se pudo iniciar sesión'));
    } finally {
      this.loading.set(false);
    }
  }
}
