import { NgIf } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ConfirmationService } from 'primeng/api';
import { LoginPanelComponent } from '../../components/login-panel/login-panel.component';
import { AuthService, AuthUserRow } from '../../services/auth.service';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Dialog } from 'primeng/dialog';
import { Divider } from 'primeng/divider';
import { Fluid } from 'primeng/fluid';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { Password } from 'primeng/password';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Toolbar } from 'primeng/toolbar';

function readApiError(err: HttpErrorResponse): string {
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
  if (err.status === 409) {
    return 'Conflicto: el recurso ya existe o hay duplicado.';
  }
  return `Error (${err.status}).`;
}

/** Sesión guardada solo si hay JWT y correo (el login siempre guarda ambos). */
function loadStoredSession(): { ok: boolean; email: string; role: string } {
  const token = localStorage.getItem('token')?.trim();
  const email = localStorage.getItem('userEmail')?.trim() ?? '';
  const role = localStorage.getItem('userRole')?.trim() ?? '';

  if (token && !email) {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    return { ok: false, email: '', role: '' };
  }

  return { ok: !!(token && email), email, role };
}

export interface RoleOption {
  label: string;
  value: 'Admin' | 'User';
}

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [
    NgIf,
    FormsModule,
    LoginPanelComponent,
    Button,
    Card,
    ConfirmDialog,
    Dialog,
    Divider,
    Fluid,
    InputText,
    Message,
    Password,
    ProgressSpinner,
    Select,
    TableModule,
    Tag,
    Toolbar
  ],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.css'
})
export class InicioComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly confirmation = inject(ConfirmationService);

  private readonly initial = loadStoredSession();

  readonly authenticated = signal(this.initial.ok);

  private readonly sessionEmail = signal(this.initial.email);
  private readonly sessionRole = signal(this.initial.role);

  readonly email = computed(() => this.sessionEmail());
  readonly role = computed(() => this.sessionRole());

  readonly users = signal<AuthUserRow[]>([]);
  usersLoading = false;
  usersError: string | null = null;

  readonly usersTableStyle: Record<string, string> = { 'min-width': '100%' };

  readonly roleOptions: RoleOption[] = [
    { label: 'Admin', value: 'Admin' },
    { label: 'User', value: 'User' }
  ];

  userDialogVisible = false;
  userDialogMode: 'create' | 'edit' = 'create';
  userForm = {
    id: 0,
    email: '',
    password: '',
    role: 'User' as 'Admin' | 'User'
  };
  userDialogSaving = false;
  /** Errores de validación o del API mientras el diálogo está abierto. */
  userSaveError: string | null = null;
  crudMessage: { severity: 'success' | 'error' | 'info'; text: string } | null = null;

  adminLoading = false;
  adminResult: unknown = null;
  adminError: string | null = null;

  ngOnInit(): void {
    if (this.authenticated()) {
      this.refreshUsersIfAdmin();
    }
  }

  onLoggedIn(): void {
    this.authenticated.set(true);
    this.sessionEmail.set((localStorage.getItem('userEmail') ?? '').trim());
    this.sessionRole.set((localStorage.getItem('userRole') ?? '').trim());
    this.adminError = null;
    this.adminResult = null;
    this.usersError = null;
    this.refreshUsersIfAdmin();
  }

  refreshUsersIfAdmin(): void {
    if (this.sessionRole() !== 'Admin') {
      this.users.set([]);
      this.usersLoading = false;
      this.usersError = null;
      return;
    }
    this.usersLoading = true;
    this.usersError = null;
    this.auth.getUsers().subscribe({
      next: (rows) => {
        this.users.set(rows);
        this.usersLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.usersLoading = false;
        this.users.set([]);
        if (err.status === 401 || err.status === 403) {
          this.usersError = 'No tienes permiso para ver la lista de usuarios.';
        } else if (err.status === 404) {
          this.usersError =
            'El servidor respondió 404 en /api/auth/users. Reinicia AuthDemo con la última versión del API.';
        } else if (err.status === 0) {
          this.usersError = 'Sin conexión con el servidor.';
        } else {
          this.usersError = 'No se pudo cargar la lista de usuarios.';
        }
      }
    });
  }

  tryAdmin(): void {
    this.adminError = null;
    this.adminResult = null;
    this.adminLoading = true;
    this.auth.getAdmin().subscribe({
      next: (res) => {
        this.adminLoading = false;
        this.adminResult = res;
      },
      error: (err: HttpErrorResponse) => {
        this.adminLoading = false;
        this.adminResult = null;
        if (err.status === 401 || err.status === 403) {
          this.adminError = 'No tienes permisos de administrador.';
        } else if (err.status === 0) {
          this.adminError = 'Sin conexión con el servidor.';
        } else {
          this.adminError = 'Error al llamar al endpoint protegido.';
        }
      }
    });
  }

  get showUsersError(): boolean {
    return this.usersError !== null && this.usersError !== '';
  }

  /** Carga inicial: spinner sin tabla. */
  get showUsersSpinner(): boolean {
    return !this.showUsersError && this.usersLoading && this.users().length === 0;
  }

  /** Tabla (con o sin filas) cuando ya no es la carga inicial vacía. */
  get showUsersDataBlock(): boolean {
    return !this.showUsersError && !(this.usersLoading && this.users().length === 0);
  }

  tagSeverity(roleName: string): 'success' | 'info' {
    return roleName === 'Admin' ? 'success' : 'info';
  }

  openCreateUser(): void {
    this.crudMessage = null;
    this.userSaveError = null;
    this.userDialogMode = 'create';
    this.userForm = { id: 0, email: '', password: '', role: 'User' };
    this.userDialogVisible = true;
  }

  openEditUser(row: AuthUserRow): void {
    this.crudMessage = null;
    this.userSaveError = null;
    this.userDialogMode = 'edit';
    this.userForm = {
      id: row.id,
      email: row.email,
      password: '',
      role: row.role === 'Admin' ? 'Admin' : 'User'
    };
    this.userDialogVisible = true;
  }

  closeUserDialog(): void {
    this.userDialogVisible = false;
    this.userDialogSaving = false;
    this.userSaveError = null;
  }

  saveUser(): void {
    this.userSaveError = null;
    const email = this.userForm.email.trim();
    if (!email) {
      this.userSaveError = 'El correo es obligatorio.';
      return;
    }
    if (this.userDialogMode === 'create' && !this.userForm.password.trim()) {
      this.userSaveError = 'La contraseña es obligatoria al crear.';
      return;
    }

    this.userDialogSaving = true;
    if (this.userDialogMode === 'create') {
      this.auth
        .createUser({
          email,
          password: this.userForm.password,
          role: this.userForm.role
        })
        .subscribe({
          next: () => {
            this.userDialogSaving = false;
            this.closeUserDialog();
            this.crudMessage = { severity: 'success', text: 'Usuario creado.' };
            this.refreshUsersIfAdmin();
          },
          error: (err: HttpErrorResponse) => {
            this.userDialogSaving = false;
            this.userSaveError = readApiError(err);
          }
        });
      return;
    }

    const body: { email?: string; password?: string; role?: string } = {};
    body.email = email;
    body.role = this.userForm.role;
    const pwd = this.userForm.password.trim();
    if (pwd) {
      body.password = pwd;
    }

    this.auth.updateUser(this.userForm.id, body).subscribe({
      next: () => {
        this.userDialogSaving = false;
        this.closeUserDialog();
        this.crudMessage = { severity: 'success', text: 'Usuario actualizado.' };
        this.refreshUsersIfAdmin();
      },
      error: (err: HttpErrorResponse) => {
        this.userDialogSaving = false;
        this.userSaveError = readApiError(err);
      }
    });
  }

  confirmDeleteUser(row: AuthUserRow): void {
    this.crudMessage = null;
    this.confirmation.confirm({
      message: `¿Eliminar a ${row.email}? Esta acción no se puede deshacer.`,
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.auth.deleteUser(row.id).subscribe({
          next: () => {
            this.crudMessage = { severity: 'success', text: 'Usuario eliminado.' };
            this.refreshUsersIfAdmin();
          },
          error: (err: HttpErrorResponse) => {
            this.crudMessage = { severity: 'error', text: readApiError(err) };
          }
        });
      }
    });
  }

  dismissCrudMessage(): void {
    this.crudMessage = null;
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    this.authenticated.set(false);
    this.sessionEmail.set('');
    this.sessionRole.set('');
    this.adminError = null;
    this.adminResult = null;
    this.users.set([]);
    this.usersError = null;
    this.usersLoading = false;
    this.crudMessage = null;
    this.userDialogVisible = false;
  }
}
