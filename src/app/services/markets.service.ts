import { Injectable } from '@angular/core';
import { Market } from '../models/models';
import { AuthService } from './auth.service';
import { OfflineDbService } from '../offline/offline-db.service';
import { SyncService } from '../offline/sync.service';
import { newId, nowIso } from '../offline/offline-db';

@Injectable({ providedIn: 'root' })
export class MarketsService {
  constructor(
    private readonly offline: OfflineDbService,
    private readonly sync: SyncService,
    private readonly auth: AuthService
  ) {}

  async list(): Promise<Market[]> {
    await this.sync.ensureHydrated();
    return this.offline.listMarkets();
  }

  async getById(id: string): Promise<Market | null> {
    await this.sync.ensureHydrated();
    return (await this.offline.getMarket(id)) ?? null;
  }

  async create(name: string): Promise<Market> {
    await this.sync.ensureHydrated();
    const markets = await this.offline.listMarkets();
    const ts = nowIso();
    const row: Market = {
      id: newId(),
      name: name.trim(),
      position: markets.length,
      created_at: ts,
      updated_at: ts,
      user_id: this.auth.user()?.id,
    };
    await this.offline.putMarket(row);
    await this.sync.queueAndSync('markets', 'upsert', row.id, {
      id: row.id,
      name: row.name,
      position: row.position,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }, ts);
    return row;
  }

  async rename(id: string, name: string): Promise<void> {
    const existing = await this.offline.getMarket(id);
    if (!existing) throw new Error('Lista no encontrada');
    const ts = nowIso();
    const row: Market = { ...existing, name: name.trim(), updated_at: ts };
    await this.offline.putMarket(row);
    await this.sync.queueAndSync('markets', 'upsert', row.id, {
      id: row.id,
      name: row.name,
      position: row.position,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }, ts);
  }

  async remove(id: string): Promise<void> {
    await this.offline.deleteMarket(id);
    // También quitar ítems locales de esa lista (cascade local)
    const items = await this.offline.listItemsByMarket(id);
    for (const item of items) {
      await this.offline.deleteItem(item.id);
      await this.sync.queueAndSync('items', 'delete', item.id, null);
    }
    await this.sync.queueAndSync('markets', 'delete', id, null);
  }

  async reorder(markets: Market[]): Promise<void> {
    const ts = nowIso();
    for (let index = 0; index < markets.length; index++) {
      const m = markets[index];
      const row: Market = { ...m, position: index, updated_at: ts };
      await this.offline.putMarket(row);
      await this.sync.queueAndSync('markets', 'upsert', row.id, {
        id: row.id,
        name: row.name,
        position: row.position,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }, ts);
    }
  }
}
