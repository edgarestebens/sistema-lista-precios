import { Injectable } from '@angular/core';
import {
  LocalComparativo,
  LocalItem,
  LocalProducto,
  MetaEntry,
  OfflineDatabase,
  OutboxEntry,
  OutboxOp,
  SyncTable,
  nowIso,
} from './offline-db';
import { Market, Mercado } from '../models/models';

@Injectable({ providedIn: 'root' })
export class OfflineDbService {
  readonly db = new OfflineDatabase();

  async getMeta(key: string): Promise<string | null> {
    const row = await this.db.meta.get(key);
    return row?.value ?? null;
  }

  async setMeta(key: string, value: string): Promise<void> {
    const entry: MetaEntry = { key, value };
    await this.db.meta.put(entry);
  }

  async clearAll(): Promise<void> {
    await Promise.all([
      this.db.markets.clear(),
      this.db.items.clear(),
      this.db.producto.clear(),
      this.db.mercado.clear(),
      this.db.comparativo_precio.clear(),
      this.db.outbox.clear(),
      this.db.meta.clear(),
    ]);
  }

  async enqueue(
    table: SyncTable,
    op: OutboxOp,
    rowId: string,
    payload: Record<string, unknown> | null,
    clientUpdatedAt = nowIso()
  ): Promise<void> {
    const pending = await this.db.outbox
      .where('[table+rowId]')
      .equals([table, rowId])
      .toArray();
    const ids = pending.map((e) => e.id!).filter((id) => id != null);
    if (ids.length) {
      await this.db.outbox.bulkDelete(ids);
    }

    const entry: OutboxEntry = {
      table,
      op,
      rowId,
      payload,
      clientUpdatedAt,
      createdAt: nowIso(),
    };
    await this.db.outbox.add(entry);
  }

  async pendingCount(): Promise<number> {
    return this.db.outbox.count();
  }

  async listOutbox(): Promise<OutboxEntry[]> {
    return this.db.outbox.orderBy('id').toArray();
  }

  async removeOutbox(id: number): Promise<void> {
    await this.db.outbox.delete(id);
  }

  // --- helpers de lectura ---

  async listMarkets(): Promise<Market[]> {
    return this.db.markets.orderBy('position').toArray();
  }

  async getMarket(id: string): Promise<Market | undefined> {
    return this.db.markets.get(id);
  }

  async putMarket(row: Market): Promise<void> {
    await this.db.markets.put(row);
  }

  async deleteMarket(id: string): Promise<void> {
    await this.db.markets.delete(id);
  }

  async listItemsByMarket(marketId: string): Promise<LocalItem[]> {
    const rows = await this.db.items.where('market_id').equals(marketId).toArray();
    return rows.sort((a, b) => {
      if (a.is_checked !== b.is_checked) return a.is_checked ? 1 : -1;
      return a.position - b.position;
    });
  }

  async putItem(row: LocalItem): Promise<void> {
    await this.db.items.put(row);
  }

  async deleteItem(id: string): Promise<void> {
    await this.db.items.delete(id);
  }

  async listProductos(): Promise<LocalProducto[]> {
    const rows = await this.db.producto.toArray();
    return rows.sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
    );
  }

  async putProducto(row: LocalProducto): Promise<void> {
    await this.db.producto.put(row);
  }

  async deleteProducto(id: string): Promise<void> {
    await this.db.producto.delete(id);
  }

  async listMercados(): Promise<Mercado[]> {
    const rows = await this.db.mercado.toArray();
    return rows.sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
    );
  }

  async putMercado(row: Mercado): Promise<void> {
    await this.db.mercado.put(row);
  }

  async deleteMercado(id: string): Promise<void> {
    await this.db.mercado.delete(id);
  }

  async listComparativo(): Promise<LocalComparativo[]> {
    const rows = await this.db.comparativo_precio.toArray();
    return rows.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  async putComparativo(row: LocalComparativo): Promise<void> {
    await this.db.comparativo_precio.put(row);
  }

  async deleteComparativo(id: string): Promise<void> {
    await this.db.comparativo_precio.delete(id);
  }

  async deleteComparativoByProducto(productoId: string): Promise<string[]> {
    const rows = await this.db.comparativo_precio
      .where('producto_id')
      .equals(productoId)
      .toArray();
    const ids = rows.map((r) => r.id);
    await this.db.comparativo_precio.bulkDelete(ids);
    return ids;
  }
}
