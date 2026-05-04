import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AuthService]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('login should POST credentials', () => {
    service.login('a@b.com', 'secret').subscribe((res) => {
      expect(res.token).toBe('t1');
    });
    const req = httpMock.expectOne((r) => r.url.endsWith('/login'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'a@b.com', password: 'secret' });
    req.flush({ token: 't1', email: 'a@b.com', role: 'User' });
  });

  it('register should POST credentials', () => {
    service.register('new@b.com', 'secret2').subscribe((res) => {
      expect(res.token).toBe('t2');
      expect(res.role).toBe('User');
    });
    const req = httpMock.expectOne((r) => r.url.endsWith('/register'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'new@b.com', password: 'secret2' });
    req.flush({ token: 't2', email: 'new@b.com', role: 'User' });
  });

  it('createUser should POST to /users', () => {
    service.createUser({ email: 'x@y.com', password: 'p', role: 'User' }).subscribe((row) => {
      expect(row.id).toBe(3);
    });
    const req = httpMock.expectOne((r) => r.url.endsWith('/users') && r.method === 'POST');
    expect(req.request.body).toEqual({ email: 'x@y.com', password: 'p', role: 'User' });
    req.flush({ id: 3, email: 'x@y.com', role: 'User' });
  });

  it('updateUser should PUT', () => {
    service.updateUser(2, { email: 'a@b.com' }).subscribe();
    const req = httpMock.expectOne((r) => r.url.endsWith('/users/2'));
    expect(req.request.method).toBe('PUT');
    req.flush({ id: 2, email: 'a@b.com', role: 'User' });
  });

  it('deleteUser should DELETE', () => {
    service.deleteUser(2).subscribe();
    const req = httpMock.expectOne((r) => r.url.endsWith('/users/2'));
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
});
