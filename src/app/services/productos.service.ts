import { Injectable } from '@angular/core';
import { Producto } from '../models/models';
import { AuthService } from './auth.service';
import { OfflineDbService } from '../offline/offline-db.service';
import { SyncService } from '../offline/sync.service';
import { ItemsService } from './items.service';
import { newId, nowIso } from '../offline/offline-db';

@Injectable({ providedIn: 'root' })
export class ProductosService {
  constructor(
    private readonly offline: OfflineDbService,
    private readonly sync: SyncService,
    private readonly auth: AuthService,
    private readonly itemsService: ItemsService
  ) {}

  async list(): Promise<Producto[]> {
    await this.sync.ensureHydrated();
    const productos = await this.offline.listProductos();
    const markets = await this.offline.listMarkets();
    const nameById = new Map(markets.map((m) => [m.id, m.name]));
    return productos.map((p) => ({
      ...p,
      lista_nombre: p.market_id ? nameById.get(p.market_id) ?? '' : '',
    }));
  }

  async create(nombre: string, marketId: string): Promise<Producto> {
    await this.sync.ensureHydrated();
    const markets = await this.offline.listMarkets();
    const lista = markets.find((m) => m.id === marketId);
    const ts = nowIso();
    const producto: Producto = {
      id: newId(),
      nombre: nombre.trim(),
      market_id: marketId,
      lista_nombre: lista?.name ?? '',
      created_at: ts,
      updated_at: ts,
      user_id: this.auth.user()?.id,
    };
    await this.offline.putProducto(producto);
    await this.sync.queueAndSync('producto', 'upsert', producto.id, {
      id: producto.id,
      nombre: producto.nombre,
      market_id: producto.market_id,
      created_at: producto.created_at,
      updated_at: producto.updated_at,
    }, ts);

    await this.itemsService.create(marketId, producto.id);
    return producto;
  }

  async update(id: string, nombre: string, marketId: string): Promise<void> {
    const existing = await this.offline.db.producto.get(id);
    if (!existing) throw new Error('Producto no encontrado');
    const markets = await this.offline.listMarkets();
    const lista = markets.find((m) => m.id === marketId);
    const ts = nowIso();
    const row: Producto = {
      ...existing,
      nombre: nombre.trim(),
      market_id: marketId,
      lista_nombre: lista?.name ?? '',
      updated_at: ts,
    };
    await this.offline.putProducto(row);
    await this.sync.queueAndSync('producto', 'upsert', row.id, {
      id: row.id,
      nombre: row.nombre,
      market_id: row.market_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }, ts);

    // Actualizar nombre denormalizado en ítems locales
    const allItems = await this.offline.db.items.where('producto_id').equals(id).toArray();
    for (const item of allItems) {
      const updated = { ...item, nombre: row.nombre, updated_at: ts };
      await this.offline.putItem(updated);
    }
  }

  async remove(id: string): Promise<void> {
    // Borrar ítems locales ligados
    const items = await this.offline.db.items.where('producto_id').equals(id).toArray();
    for (const item of items) {
      await this.offline.deleteItem(item.id);
      await this.sync.queueAndSync('items', 'delete', item.id, null);
    }
    await this.offline.deleteProducto(id);
    await this.sync.queueAndSync('producto', 'delete', id, null);
  }
}
