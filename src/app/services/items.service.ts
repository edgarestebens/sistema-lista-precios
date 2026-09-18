import { Inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../core/supabase.client';
import { Item } from '../models/models';

type ItemRow = {
  id: string;
  market_id: string;
  producto_id: string;
  is_checked: boolean;
  position: number;
  created_at: string;
  user_id?: string;
  producto?: { nombre: string } | null;
};

@Injectable({ providedIn: 'root' })
export class ItemsService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async listByMarket(marketId: string): Promise<Item[]> {
    const { data, error } = await this.supabase
      .from('items')
      .select('*, producto:producto_id(nombre)')
      .eq('market_id', marketId)
      .order('position', { ascending: true });

    if (error) throw error;
    return (data as ItemRow[] | null)?.map((row) => this.mapRow(row)) ?? [];
  }

  async create(marketId: string, productoId: string): Promise<Item> {
    const items = await this.listByMarket(marketId);
    const position = items.length;

    const { data, error } = await this.supabase
      .from('items')
      .insert({
        market_id: marketId,
        producto_id: productoId,
        position,
        is_checked: false,
      })
      .select('*, producto:producto_id(nombre)')
      .single();

    if (error) throw error;
    return this.mapRow(data as ItemRow);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.from('items').delete().eq('id', id);
    if (error) throw error;
  }

  async toggleChecked(id: string, isChecked: boolean): Promise<void> {
    const { error } = await this.supabase
      .from('items')
      .update({ is_checked: isChecked })
      .eq('id', id);
    if (error) throw error;
  }

  async reorder(items: Item[]): Promise<void> {
    const updates = items.map((item, index) =>
      this.supabase.from('items').update({ position: index }).eq('id', item.id)
    );
    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);
    if (failed?.error) throw failed.error;
  }

  private mapRow(row: ItemRow): Item {
    const item: Item = {
      id: row.id,
      market_id: row.market_id,
      producto_id: row.producto_id,
      nombre: row.producto?.nombre ?? '',
      is_checked: row.is_checked,
      position: row.position,
      created_at: row.created_at,
    };
    if (row.user_id) {
      item.user_id = row.user_id;
    }
    return item;
  }
}
