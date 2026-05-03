import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private api = 'http://localhost:5235/api/auth';

  constructor(private http: HttpClient) {}

  login(email: string, password: string) {
    return this.http.post<any>(`${this.api}/login`, { email, password });
  }

  getAdmin() {
    const token = localStorage.getItem('token');

    return this.http.get(`${this.api}/admin`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }
}
