import { Inject, Injectable, signal } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../core/supabase.client';
import {
  ComparativoPrecio,
  Item,
  Market,
  Mercado,
  Producto,
} from '../models/models';
import { AuthService } from '../services/auth.service';
import { ConnectivityService } from './connectivity.service';
import { OfflineDbService } from './offline-db.service';
import { OutboxEntry, SyncTable, nowIso } from './offline-db';

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error';

@Injectable({ providedIn: 'root' })
export class SyncService {
  readonly status = signal<SyncStatus>('idle');
  readonly pendingCount = signal(0);
  readonly lastError = signal<string | null>(null);
  readonly lastSyncAt = signal<string | null>(null);

  private syncing = false;
  private scheduled: ReturnType<typeof setTimeout> | null = null;
  private hydratedUserId: string | null = null;

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly offline: OfflineDbService,
    private readonly connectivity: ConnectivityService,
    private readonly auth: AuthService
  ) {
    void this.refreshPending();
    void this.offline.getMeta('lastSyncAt').then((v) => {
      if (v) this.lastSyncAt.set(v);
    });

    // Sync when connectivity returns
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.scheduleSync(300));
    }
  }

  async refreshPending(): Promise<void> {
    this.pendingCount.set(await this.offline.pendingCount());
    if (!this.connectivity.isOnline()) {
      this.status.set('offline');
    } else if (!this.syncing && this.status() !== 'error') {
      this.status.set(this.pendingCount() > 0 ? 'idle' : 'idle');
    }
  }

  /** Encola cambio y programa sync si hay red. */
  async queueAndSync(
    table: SyncTable,
    op: 'upsert' | 'delete',
    rowId: string,
    payload: Record<string, unknown> | null,
    clientUpdatedAt = nowIso()
  ): Promise<void> {
    await this.offline.enqueue(table, op, rowId, payload, clientUpdatedAt);
    await this.refreshPending();
    this.scheduleSync(400);
  }

  scheduleSync(delayMs = 0): void {
    if (this.scheduled) clearTimeout(this.scheduled);
    this.scheduled = setTimeout(() => {
      this.scheduled = null;
      void this.syncNow();
    }, delayMs);
  }

  /**
   * Asegura datos locales para el usuario actual.
   * Si nunca sincronizó (o cambió de usuario), hace pull completo.
   */
  async ensureHydrated(): Promise<void> {
    const userId = this.auth.user()?.id;
    if (!userId) return;

    const storedUser = await this.offline.getMeta('userId');
    if (storedUser && storedUser !== userId) {
      await this.offline.clearAll();
      this.hydratedUserId = null;
      this.lastSyncAt.set(null);
      this.pendingCount.set(0);
    }

    if (storedUser === userId && this.hydratedUserId === userId) {
      return;
    }

    const lastSync = await this.offline.getMeta('lastSyncAt');
    if (storedUser === userId && lastSync) {
      this.hydratedUserId = userId;
      this.lastSyncAt.set(lastSync);
      // Aún así intentamos sync si hay red (trae cambios del otro dispositivo)
      if (this.connectivity.isOnline()) {
        this.scheduleSync(0);
      }
      return;
    }

    if (this.connectivity.isOnline()) {
      await this.syncNow(true);
    }
  }

  async syncNow(forcePull = false): Promise<void> {
    if (this.syncing) return;
    if (!this.connectivity.isOnline()) {
      this.status.set('offline');
      await this.refreshPending();
      return;
    }

    const userId = this.auth.user()?.id;
    if (!userId) return;

    this.syncing = true;
    this.status.set('syncing');
    this.lastError.set(null);

    try {
      // Refrescar sesión si es posible
      await this.supabase.auth.getSession();

      await this.pushOutbox();
      await this.pullAll(userId);

      const ts = nowIso();
      await this.offline.setMeta('lastSyncAt', ts);
      await this.offline.setMeta('userId', userId);
      this.lastSyncAt.set(ts);
      this.hydratedUserId = userId;
      await this.refreshPending();
      this.status.set('idle');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error de sincronización';
      this.lastError.set(msg);
      this.status.set('error');
      await this.refreshPending();
    } finally {
      this.syncing = false;
      // forcePull unused but kept for API clarity on callers
      void forcePull;
    }
  }

  async clearLocalOnLogout(): Promise<void> {
    await this.offline.clearAll();
    this.hydratedUserId = null;
    this.lastSyncAt.set(null);
    this.pendingCount.set(0);
    this.status.set('idle');
    this.lastError.set(null);
  }

  private async pushOutbox(): Promise<void> {
    const entries = await this.offline.listOutbox();
    for (const entry of entries) {
      await this.pushEntry(entry);
      if (entry.id != null) {
        await this.offline.removeOutbox(entry.id);
      }
    }
  }

  private async pushEntry(entry: OutboxEntry): Promise<void> {
    if (entry.op === 'delete') {
      const { error } = await this.supabase.from(entry.table).delete().eq('id', entry.rowId);
      if (error) throw error;
      return;
    }

    // LWW: si remoto es más nuevo, descartar cambio local
    const { data: remote, error: fetchErr } = await this.supabase
      .from(entry.table)
      .select('updated_at')
      .eq('id', entry.rowId)
      .maybeSingle();
    if (fetchErr) throw fetchErr;

    if (
      remote?.updated_at &&
      entry.clientUpdatedAt &&
      new Date(remote.updated_at).getTime() > new Date(entry.clientUpdatedAt).getTime()
    ) {
      return; // remoto gana; el pull traerá la versión
    }

    const payload = { ...(entry.payload ?? {}), id: entry.rowId };

    if (entry.table === 'comparativo_precio') {
      const { error } = await this.supabase.from(entry.table).upsert(payload, {
        onConflict: 'producto_id,mercado_id',
      });
      if (error) throw error;
      return;
    }

    const { error } = await this.supabase.from(entry.table).upsert(payload, {
      onConflict: 'id',
    });
    if (error) throw error;
  }

  private async pullAll(userId: string): Promise<void> {
    const [markets, items, productos, mercados, comparativos] = await Promise.all([
      this.fetchTable<Market>('markets'),
      this.fetchTable<ItemRow>('items'),
      this.fetchTable<ProductoRow>('producto'),
      this.fetchTable<Mercado>('mercado'),
      this.fetchTable<ComparativoRow>('comparativo_precio'),
    ]);

    const marketNameById = new Map(markets.map((m) => [m.id, m.name]));
    const productoNombre = new Map(productos.map((p) => [p.id, p.nombre]));
    const mercadoNombre = new Map(mercados.map((m) => [m.id, m.nombre]));

    // Solo reemplazamos tablas remotas si no hay outbox pendiente de esa fila
    // Enfoque simple: clear + put all, pero preservando filas con outbox pendiente
    const pending = await this.offline.listOutbox();
    const pendingKeys = new Set(pending.map((p) => `${p.table}:${p.rowId}`));

    await this.mergeTable(
      'markets',
      markets,
      pendingKeys,
      () => this.offline.db.markets.clear(),
      (rows) => this.offline.db.markets.bulkPut(rows).then(() => undefined)
    );

    const localProductos: Producto[] = productos.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      market_id: p.market_id ?? null,
      lista_nombre: p.market_id ? marketNameById.get(p.market_id) ?? '' : '',
      created_at: p.created_at,
      updated_at: p.updated_at,
      user_id: p.user_id,
    }));

    await this.mergeTable(
      'producto',
      localProductos,
      pendingKeys,
      () => this.offline.db.producto.clear(),
      (rows) => this.offline.db.producto.bulkPut(rows).then(() => undefined)
    );

    const localItems: Item[] = items.map((row) => ({
      id: row.id,
      market_id: row.market_id,
      producto_id: row.producto_id,
      nombre: productoNombre.get(row.producto_id) ?? '',
      is_checked: row.is_checked,
      position: row.position,
      created_at: row.created_at,
      updated_at: row.updated_at,
      user_id: row.user_id,
    }));

    await this.mergeTable(
      'items',
      localItems,
      pendingKeys,
      () => this.offline.db.items.clear(),
      (rows) => this.offline.db.items.bulkPut(rows).then(() => undefined)
    );

    await this.mergeTable(
      'mercado',
      mercados,
      pendingKeys,
      () => this.offline.db.mercado.clear(),
      (rows) => this.offline.db.mercado.bulkPut(rows).then(() => undefined)
    );

    const localComp: ComparativoPrecio[] = comparativos.map((row) => ({
      id: row.id,
      producto_id: row.producto_id,
      mercado_id: row.mercado_id,
      precio: Number(row.precio) || 0,
      created_at: row.created_at,
      updated_at: row.updated_at,
      user_id: row.user_id,
      producto: { nombre: productoNombre.get(row.producto_id) ?? '' },
      mercado: { nombre: mercadoNombre.get(row.mercado_id) ?? '' },
    }));

    await this.mergeTable(
      'comparativo_precio',
      localComp,
      pendingKeys,
      () => this.offline.db.comparativo_precio.clear(),
      (rows) => this.offline.db.comparativo_precio.bulkPut(rows).then(() => undefined)
    );

    void userId;
  }

  private async mergeTable<T extends { id: string }>(
    table: SyncTable,
    remoteRows: T[],
    pendingKeys: Set<string>,
    clearFn: () => Promise<unknown>,
    bulkPut: (rows: T[]) => Promise<void>
  ): Promise<void> {
    const keepIds = [...pendingKeys]
      .filter((k) => k.startsWith(`${table}:`))
      .map((k) => k.slice(table.length + 1));

    let kept: T[] = [];
    if (keepIds.length) {
      let raw: (T | undefined)[] = [];
      if (table === 'markets') {
        raw = (await this.offline.db.markets.bulkGet(keepIds)) as (T | undefined)[];
      } else if (table === 'items') {
        raw = (await this.offline.db.items.bulkGet(keepIds)) as (T | undefined)[];
      } else if (table === 'producto') {
        raw = (await this.offline.db.producto.bulkGet(keepIds)) as (T | undefined)[];
      } else if (table === 'mercado') {
        raw = (await this.offline.db.mercado.bulkGet(keepIds)) as (T | undefined)[];
      } else if (table === 'comparativo_precio') {
        raw = (await this.offline.db.comparativo_precio.bulkGet(keepIds)) as (
          | T
          | undefined
        )[];
      }
      kept = raw.filter((r): r is T => r != null);
    }

    const remoteFiltered = remoteRows.filter(
      (r) => !pendingKeys.has(`${table}:${r.id}`)
    );

    await clearFn();
    await bulkPut([...remoteFiltered, ...kept]);
  }

  private async fetchTable<T>(table: SyncTable): Promise<T[]> {
    const { data, error } = await this.supabase.from(table).select('*');
    if (error) throw error;
    return (data as T[]) ?? [];
  }
}

type ItemRow = {
  id: string;
  market_id: string;
  producto_id: string;
  is_checked: boolean;
  position: number;
  created_at: string;
  updated_at: string;
  user_id?: string;
};

type ProductoRow = {
  id: string;
  nombre: string;
  market_id?: string | null;
  created_at: string;
  updated_at: string;
  user_id?: string;
};

type ComparativoRow = {
  id: string;
  producto_id: string;
  mercado_id: string;
  precio: number;
  created_at: string;
  updated_at: string;
  user_id?: string;
};
