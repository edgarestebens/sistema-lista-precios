import { Inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../core/supabase.client';
import { ComparativoPrecio, ComparativoProducto, PrecioMasBarato } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ComparativoPrecioService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async list(): Promise<ComparativoPrecio[]> {
    const { data, error } = await this.supabase
      .from('comparativo_precio')
      .select('*, producto:producto_id(nombre), mercado:mercado_id(nombre)')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data as ComparativoPrecio[] | null) ?? [];
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

  /** Mapa producto_id → precio más barato (> 0) con nombre de mercado. */
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
    const rows = preciosPorMercado.map((p) => ({
      producto_id: productoId,
      mercado_id: p.mercado_id,
      precio: Number.isFinite(p.precio) && p.precio >= 0 ? p.precio : 0,
    }));

    const { error } = await this.supabase
      .from('comparativo_precio')
      .upsert(rows, { onConflict: 'producto_id,mercado_id' });

    if (error) throw error;
  }

  async removeByProducto(productoId: string): Promise<void> {
    const { error } = await this.supabase
      .from('comparativo_precio')
      .delete()
      .eq('producto_id', productoId);
    if (error) throw error;
  }
}
