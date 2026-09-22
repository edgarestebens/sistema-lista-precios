import { Injectable } from '@angular/core';
import { ComparativoPrecio, ComparativoProducto, PrecioMasBarato } from '../models/models';
import { AuthService } from './auth.service';
import { OfflineDbService } from '../offline/offline-db.service';
import { SyncService } from '../offline/sync.service';
import { newId, nowIso } from '../offline/offline-db';

@Injectable({ providedIn: 'root' })
export class ComparativoPrecioService {
  constructor(
    private readonly offline: OfflineDbService,
    private readonly sync: SyncService,
    private readonly auth: AuthService
  ) {}

  async list(): Promise<ComparativoPrecio[]> {
    await this.sync.ensureHydrated();
    const rows = await this.offline.listComparativo();
    const productos = await this.offline.listProductos();
    const mercados = await this.offline.listMercados();
    const pName = new Map(productos.map((p) => [p.id, p.nombre]));
    const mName = new Map(mercados.map((m) => [m.id, m.nombre]));
    return rows.map((row) => ({
      ...row,
      producto: { nombre: pName.get(row.producto_id) ?? row.producto?.nombre ?? '' },
      mercado: { nombre: mName.get(row.mercado_id) ?? row.mercado?.nombre ?? '' },
    }));
  }

  async listGrouped(): Promise<ComparativoProducto[]> {
    const rows = await this.list();
    const byProducto = new Map<string, ComparativoProducto>();

    for (const row of rows) {
      let group = byProducto.get(row.producto_id);
      if (!group) {
        group = {
          producto_id: row.producto_id,
          producto_nombre: row.producto?.nombre ?? '',
          precios: {},
        };
        byProducto.set(row.producto_id, group);
      }
      group.precios[row.mercado_id] = Number(row.precio) || 0;
    }

    return [...byProducto.values()].sort((a, b) =>
      a.producto_nombre.localeCompare(b.producto_nombre, 'es', {
        sensitivity: 'base',
      })
    );
  }

  async mapPrecioMasBarato(): Promise<Record<string, PrecioMasBarato>> {
    const rows = await this.list();
    const best = new Map<string, PrecioMasBarato>();

    for (const row of rows) {
      const precio = Number(row.precio) || 0;
      if (precio <= 0) continue;

      const actual = best.get(row.producto_id);
      if (!actual || precio < actual.precio) {
        best.set(row.producto_id, {
          producto_id: row.producto_id,
          precio,
          mercado_nombre: row.mercado?.nombre ?? '',
        });
      }
    }

    return Object.fromEntries(best.entries());
  }

  async saveForProducto(
    productoId: string,
    preciosPorMercado: { mercado_id: string; precio: number }[]
  ): Promise<void> {
    await this.sync.ensureHydrated();
    const existing = await this.offline.db.comparativo_precio
      .where('producto_id')
      .equals(productoId)
      .toArray();
    const byMercado = new Map(existing.map((r) => [r.mercado_id, r]));
    const ts = nowIso();
    const productos = await this.offline.listProductos();
    const mercados = await this.offline.listMercados();
    const pName = productos.find((p) => p.id === productoId)?.nombre ?? '';

    for (const p of preciosPorMercado) {
      const prev = byMercado.get(p.mercado_id);
      const row: ComparativoPrecio = {
        id: prev?.id ?? newId(),
        producto_id: productoId,
        mercado_id: p.mercado_id,
        precio: Number.isFinite(p.precio) && p.precio >= 0 ? p.precio : 0,
        created_at: prev?.created_at ?? ts,
        updated_at: ts,
        user_id: this.auth.user()?.id,
        producto: { nombre: pName },
        mercado: {
          nombre: mercados.find((m) => m.id === p.mercado_id)?.nombre ?? '',
        },
      };
      await this.offline.putComparativo(row);
      await this.sync.queueAndSync(
        'comparativo_precio',
        'upsert',
        row.id,
        {
          id: row.id,
          producto_id: row.producto_id,
          mercado_id: row.mercado_id,
          precio: row.precio,
          created_at: row.created_at,
          updated_at: row.updated_at,
        },
        ts
      );
    }
  }

  async removeByProducto(productoId: string): Promise<void> {
    const ids = await this.offline.deleteComparativoByProducto(productoId);
    for (const id of ids) {
      await this.sync.queueAndSync('comparativo_precio', 'delete', id, null);
    }
  }
}
