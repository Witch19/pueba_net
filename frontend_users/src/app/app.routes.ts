import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'inicio',
    loadComponent: () =>
      import('./pages/inicio/inicio.component').then((m) => m.InicioComponent)
  },
  { path: 'login', redirectTo: 'inicio', pathMatch: 'full' },
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  { path: '**', redirectTo: '' }
];
