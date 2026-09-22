import { Inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../core/supabase.client';
import { Producto } from '../models/models';
import { ItemsService } from './items.service';

type ProductoRow = Producto & {
  markets?: { name: string } | null;
};

@Injectable({ providedIn: 'root' })
export class ProductosService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly itemsService: ItemsService
  ) {}

  async list(): Promise<Producto[]> {
    const { data, error } = await this.supabase
      .from('producto')
      .select('*, markets:market_id(name)')
      .order('nombre', { ascending: true });

    if (error) throw error;
    return ((data as ProductoRow[] | null) ?? []).map((row) => this.mapRow(row));
  }

  async create(nombre: string, marketId: string): Promise<Producto> {
    const { data, error } = await this.supabase
      .from('producto')
      .insert({ nombre: nombre.trim(), market_id: marketId })
      .select('*, markets:market_id(name)')
      .single();

    if (error) throw error;
    const producto = this.mapRow(data as ProductoRow);
    await this.itemsService.create(marketId, producto.id);
    return producto;
  }

  async update(id: string, nombre: string, marketId: string): Promise<void> {
    const { error } = await this.supabase
      .from('producto')
      .update({ nombre: nombre.trim(), market_id: marketId })
      .eq('id', id);
    if (error) throw error;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.from('producto').delete().eq('id', id);
    if (error) throw error;
  }

  private mapRow(row: ProductoRow): Producto {
    return {
      id: row.id,
      nombre: row.nombre,
      market_id: row.market_id ?? null,
      lista_nombre: row.markets?.name ?? '',
      created_at: row.created_at,
      user_id: row.user_id,
    };
  }
}
