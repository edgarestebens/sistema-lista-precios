import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { SUPABASE_CLIENT } from '../core/supabase.client';
import { SyncService } from '../offline/sync.service';
import { mockSyncService } from '../testing/offline-test.helpers';

describe('AuthService', () => {
  let service: AuthService;
  let authApi: {
    getSession: jasmine.Spy;
    onAuthStateChange: jasmine.Spy;
    signInWithPassword: jasmine.Spy;
    signUp: jasmine.Spy;
    signOut: jasmine.Spy;
  };
  let sync: jasmine.SpyObj<SyncService>;

  beforeEach(() => {
    sync = mockSyncService();
    authApi = {
      getSession: jasmine
        .createSpy('getSession')
        .and.resolveTo({ data: { session: null } }),
      onAuthStateChange: jasmine
        .createSpy('onAuthStateChange')
        .and.returnValue({ data: { subscription: { unsubscribe() {} } } }),
      signInWithPassword: jasmine
        .createSpy('signInWithPassword')
        .and.resolveTo({ error: null }),
      signUp: jasmine.createSpy('signUp').and.resolveTo({ error: null }),
      signOut: jasmine.createSpy('signOut').and.resolveTo({ error: null }),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: SUPABASE_CLIENT, useValue: { auth: authApi } },
        { provide: SyncService, useValue: sync },
      ],
    });
    service = TestBed.inject(AuthService);
  });

  it('signIn() llama a signInWithPassword', async () => {
    await service.signIn('a@b.com', 'secret1');
    expect(authApi.signInWithPassword).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'secret1',
    });
  });

  it('signUp() envía full_name en metadata', async () => {
    await service.signUp('a@b.com', 'secret1', 'Ana');
    expect(authApi.signUp).toHaveBeenCalled();
    const arg = authApi.signUp.calls.mostRecent().args[0];
    expect(arg.email).toBe('a@b.com');
    expect(arg.options.data.full_name).toBe('Ana');
  });

  it('signOut() limpia caché local y cierra sesión', async () => {
    await service.signOut();
    expect(sync.clearLocalOnLogout).toHaveBeenCalled();
    expect(authApi.signOut).toHaveBeenCalled();
  });
});
