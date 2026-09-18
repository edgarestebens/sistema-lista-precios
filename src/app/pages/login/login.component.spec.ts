import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let auth: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['signIn', 'signOut']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
  });

  it('submit llama signIn y navega', async () => {
    auth.signIn.and.resolveTo();
    component.email = 'a@b.com';
    component.password = 'secret12';
    await component.submit();
    expect(auth.signIn).toHaveBeenCalledWith('a@b.com', 'secret12');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('muestra error en español si falla el login', async () => {
    auth.signIn.and.rejectWith(new Error('Invalid login credentials'));
    component.email = 'a@b.com';
    component.password = 'mala';
    await component.submit();
    expect(component.error()).toBe('Email o contraseña incorrectos');
  });
});
