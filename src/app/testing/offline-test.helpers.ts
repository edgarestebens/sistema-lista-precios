import { Provider } from '@angular/core';
import { OfflineDatabase } from '../offline/offline-db';
import { OfflineDbService } from '../offline/offline-db.service';
import { SyncService } from '../offline/sync.service';
import { AuthService } from '../services/auth.service';

/** SyncService mock: no habla con Supabase. */
export function mockSyncService(): jasmine.SpyObj<SyncService> {
  const sync = jasmine.createSpyObj<SyncService>('SyncService', [
    'ensureHydrated',
    'queueAndSync',
    'syncNow',
    'scheduleSync',
    'refreshPending',
    'clearLocalOnLogout',
  ]);
  sync.ensureHydrated.and.resolveTo();
  sync.queueAndSync.and.resolveTo();
  sync.syncNow.and.resolveTo();
  sync.scheduleSync.and.stub();
  sync.refreshPending.and.resolveTo();
  sync.clearLocalOnLogout.and.resolveTo();
  return sync;
}

export function mockAuthService(userId = 'user-1'): jasmine.SpyObj<AuthService> {
  const auth = jasmine.createSpyObj<AuthService>('AuthService', ['user']);
  auth.user.and.returnValue({ id: userId } as ReturnType<AuthService['user']>);
  return auth;
}

/**
 * OfflineDbService con base IndexedDB aislada por test.
 * Llamar `await offline.clearAll()` / `offline.db.delete()` en afterEach.
 */
export function createIsolatedOfflineDb(): OfflineDbService {
  const service = new OfflineDbService();
  // Reemplazar la DB por una con nombre único
  (service as unknown as { db: OfflineDatabase }).db = new OfflineDatabase(
    `test-offline-${crypto.randomUUID()}`
  );
  return service;
}

export function offlineProviders(
  offline: OfflineDbService,
  sync = mockSyncService(),
  auth = mockAuthService()
): Provider[] {
  return [
    { provide: OfflineDbService, useValue: offline },
    { provide: SyncService, useValue: sync },
    { provide: AuthService, useValue: auth },
  ];
}
