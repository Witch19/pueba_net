import { Component, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Fluid } from 'primeng/fluid';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { Password } from 'primeng/password';

function readAuthError(err: HttpErrorResponse, mode: 'login' | 'register'): string {
  const body = err.error;
  if (typeof body === 'string' && body.trim()) {
    return body.trim();
  }
  if (body && typeof body === 'object') {
    if (typeof body.title === 'string' && body.title.trim()) {
      return body.title.trim();
    }
    if (typeof body.message === 'string' && body.message.trim()) {
      return body.message.trim();
    }
  }
  if (mode === 'register' && err.status === 409) {
    return 'Ya existe una cuenta con ese correo.';
  }
  if (mode === 'login' && err.status === 401) {
    return 'Correo o contraseña incorrectos.';
  }
  if (err.status === 0) {
    return 'No se pudo contactar al servidor. ';
  }
  return mode === 'register'
    ? 'No se pudo crear la cuenta. Intenta de nuevo.'
    : 'No se pudo iniciar sesión. Intenta de nuevo.';
}

@Component({
  selector: 'app-login-panel',
  standalone: true,
  imports: [FormsModule, Button, Card, Fluid, InputText, Message, Password],
  templateUrl: './login-panel.component.html',
  styleUrl: './login-panel.component.css'
})
export class LoginPanelComponent {
  private readonly auth = inject(AuthService);

  readonly loggedIn = output<void>();

  registerMode = false;
  email = '';
  password = '';
  loading = false;
  errorMessage: string | null = null;

  readonly cardHeader = (): string =>
    this.registerMode ? 'Crear cuenta' : 'Iniciar sesión';

  showRegister(): void {
    this.registerMode = true;
    this.errorMessage = null;
  }

  showLogin(): void {
    this.registerMode = false;
    this.errorMessage = null;
  }

  submit(): void {
    this.errorMessage = null;
    const email = this.email.trim();
    if (!email || !this.password) {
      this.errorMessage = 'Completa correo y contraseña.';
      return;
    }
    this.loading = true;
    const mode = this.registerMode ? 'register' : 'login';
    const req$ = this.registerMode
      ? this.auth.register(email, this.password)
      : this.auth.login(email, this.password);

    req$.subscribe({
      next: (res) => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('userEmail', res.email ?? email);
        localStorage.setItem('userRole', res.role ?? '');
        this.loading = false;
        this.loggedIn.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.errorMessage = readAuthError(err, mode);
      }
    });
  }
}
