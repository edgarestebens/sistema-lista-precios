import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { AppComponent } from './app.component';
import { ConnectivityService } from './offline/connectivity.service';
import { SyncService } from './offline/sync.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        {
          provide: SyncService,
          useValue: {
            status: signal('idle'),
            pendingCount: signal(0),
            lastError: signal(null),
            lastSyncAt: signal(null),
            syncNow: () => Promise.resolve(),
          },
        },
        {
          provide: ConnectivityService,
          useValue: {
            online: signal(true),
            isOnline: () => true,
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
