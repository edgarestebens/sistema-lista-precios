import { Injectable } from '@angular/core';
import { Item } from '../models/models';
import { AuthService } from './auth.service';
import { OfflineDbService } from '../offline/offline-db.service';
import { SyncService } from '../offline/sync.service';
import { newId, nowIso } from '../offline/offline-db';

@Injectable({ providedIn: 'root' })
export class ItemsService {
  constructor(
    private readonly offline: OfflineDbService,
    private readonly sync: SyncService,
    private readonly auth: AuthService
  ) {}

  async listByMarket(marketId: string): Promise<Item[]> {
    await this.sync.ensureHydrated();
    const items = await this.offline.listItemsByMarket(marketId);
    // Refrescar nombres desde productos locales
    const productos = await this.offline.listProductos();
    const nombreById = new Map(productos.map((p) => [p.id, p.nombre]));
    return items.map((item) => ({
      ...item,
      nombre: nombreById.get(item.producto_id) ?? item.nombre,
    }));
  }

  async create(marketId: string, productoId: string): Promise<Item> {
    await this.sync.ensureHydrated();
    const items = await this.listByMarket(marketId);
    const pending = items.filter((i) => !i.is_checked);
    const done = items.filter((i) => i.is_checked);

    const productos = await this.offline.listProductos();
    const producto = productos.find((p) => p.id === productoId);
    const ts = nowIso();
    const created: Item = {
      id: newId(),
      market_id: marketId,
      producto_id: productoId,
      nombre: producto?.nombre ?? '',
      is_checked: false,
      position: 0,
      created_at: ts,
      updated_at: ts,
      user_id: this.auth.user()?.id,
    };

    await this.offline.putItem(created);
    await this.sync.queueAndSync('items', 'upsert', created.id, this.payload(created), ts);

    await this.reorder([created, ...pending, ...done]);
    return { ...created, position: 0 };
  }

  async remove(id: string): Promise<void> {
    await this.offline.deleteItem(id);
    await this.sync.queueAndSync('items', 'delete', id, null);
  }

  async toggleChecked(id: string, isChecked: boolean): Promise<void> {
    const items = await this.offline.db.items.get(id);
    if (!items) throw new Error('Ítem no encontrado');
    const ts = nowIso();
    const row: Item = { ...items, is_checked: isChecked, updated_at: ts };
    await this.offline.putItem(row);
    await this.sync.queueAndSync('items', 'upsert', row.id, this.payload(row), ts);
  }

  async reorder(items: Item[]): Promise<void> {
    const ts = nowIso();
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const row: Item = { ...item, position: index, updated_at: ts };
      await this.offline.putItem(row);
      await this.sync.queueAndSync('items', 'upsert', row.id, this.payload(row), ts);
    }
  }

  private payload(item: Item): Record<string, unknown> {
    return {
      id: item.id,
      market_id: item.market_id,
      producto_id: item.producto_id,
      is_checked: item.is_checked,
      position: item.position,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  }
}
