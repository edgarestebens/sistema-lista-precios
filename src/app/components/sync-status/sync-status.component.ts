import { Component, computed, inject } from '@angular/core';
import { ConnectivityService } from '../../offline/connectivity.service';
import { SyncService } from '../../offline/sync.service';

@Component({
  selector: 'app-sync-status',
  standalone: true,
  template: `
    @if (visible()) {
      <div class="sync-bar" [attr.data-state]="state()" role="status">
        <span>{{ label() }}</span>
        @if (canRetry()) {
          <button type="button" class="sync-retry" (click)="retry()">Reintentar</button>
        }
      </div>
    }
  `,
  styles: [
    `
      .sync-bar {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        padding: 0.4rem 0.75rem;
        font-size: 0.8rem;
        background: #2a2a2a;
        color: #ddd;
        border-bottom: 1px solid #333;
      }
      .sync-bar[data-state='offline'] {
        background: #3a2a10;
        color: #f0d090;
      }
      .sync-bar[data-state='syncing'] {
        background: #1a2a3a;
        color: #9ec9f0;
      }
      .sync-bar[data-state='error'] {
        background: #3a1515;
        color: #f0a0a0;
      }
      .sync-retry {
        border: 1px solid currentColor;
        background: transparent;
        color: inherit;
        border-radius: 4px;
        padding: 0.15rem 0.5rem;
        cursor: pointer;
      }
    `,
  ],
})
export class SyncStatusComponent {
  private readonly sync = inject(SyncService);
  private readonly connectivity = inject(ConnectivityService);

  readonly state = computed(() => {
    if (!this.connectivity.online()) return 'offline';
    return this.sync.status();
  });

  readonly label = computed(() => {
    const pending = this.sync.pendingCount();
    const state = this.state();
    if (state === 'offline') {
      return pending > 0
        ? `Sin conexión · ${pending} cambio(s) pendiente(s)`
        : 'Sin conexión · trabajando en local';
    }
    if (state === 'syncing') return 'Sincronizando…';
    if (state === 'error') {
      return this.sync.lastError() ?? 'Error al sincronizar';
    }
    if (pending > 0) return `${pending} pendiente(s) de subir`;
    return '';
  });

  readonly visible = computed(() => {
    const state = this.state();
    if (state === 'offline' || state === 'syncing' || state === 'error') return true;
    return this.sync.pendingCount() > 0;
  });

  readonly canRetry = computed(() => this.state() === 'error' && this.connectivity.online());

  retry(): void {
    void this.sync.syncNow(true);
  }
}
