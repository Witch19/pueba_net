import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JsonPipe } from '@angular/common'; 
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, JsonPipe], 
  templateUrl: './app.html'
})
export class App {
  email = '';
  password = '';
  result: any;

  constructor(private auth: AuthService) {}

  login() {
    this.auth.login(this.email, this.password).subscribe({
      next: (res) => {
        localStorage.setItem('token', res.token);
        this.result = 'Login OK';
      },
      error: () => this.result = 'Error login'
    });
  }

  admin() {
    this.auth.getAdmin().subscribe({
      next: (res) => this.result = res,
      error: () => this.result = '401 Unauthorized'
    });
  }
}