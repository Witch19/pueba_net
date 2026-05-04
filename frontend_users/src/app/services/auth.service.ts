import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface AuthUserRow {
  id: number;
  email: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  private api = 'http://localhost:5235/api/auth';

  constructor(private http: HttpClient) {}

  login(email: string, password: string) {
    return this.http.post<any>(`${this.api}/login`, { email, password });
  }

  register(email: string, password: string) {
    return this.http.post<{ token: string; email: string; role: string }>(
      `${this.api}/register`,
      { email, password }
    );
  }

  getAdmin() {
    return this.http.get(`${this.api}/admin`, { responseType: 'text' as const });
  }

  getUsers() {
    return this.http.get<AuthUserRow[]>(`${this.api}/users`);
  }

  createUser(body: { email: string; password: string; role: string }) {
    return this.http.post<AuthUserRow>(`${this.api}/users`, body);
  }

  updateUser(id: number, body: { email?: string; password?: string; role?: string }) {
    return this.http.put<AuthUserRow>(`${this.api}/users/${id}`, body);
  }

  deleteUser(id: number) {
    return this.http.delete<void>(`${this.api}/users/${id}`);
  }
}
