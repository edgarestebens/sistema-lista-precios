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
    auth = jasmine.createSpyObj<AuthService>('AuthService', [
      'signIn',
      'signUp',
      'signOut',
    ], {
      session: jasmine.createSpy().and.returnValue(null) as never,
    });
    // session is a signal in the real service — provide a callable signal-like
    (auth as unknown as { session: () => null }).session = () => null;

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

  it('submit login llama signIn y navega', async () => {
    auth.signIn.and.resolveTo();
    component.email = 'a@b.com';
    component.password = 'secret12';
    await component.submit();
    expect(auth.signIn).toHaveBeenCalledWith('a@b.com', 'secret12');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('submit registro llama signUp', async () => {
    auth.signUp.and.resolveTo();
    auth.signIn.and.resolveTo();
    component.switchMode('register');
    component.email = 'nuevo@test.com';
    component.password = 'secret12';
    component.fullName = 'Nuevo';
    await component.submit();
    expect(auth.signUp).toHaveBeenCalledWith(
      'nuevo@test.com',
      'secret12',
      'Nuevo'
    );
  });
});
