import { Inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../core/supabase.client';
import { Item } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ItemsService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async listByMarket(marketId: string): Promise<Item[]> {
    const { data, error } = await this.supabase
      .from('items')
      .select('*')
      .eq('market_id', marketId)
      .order('position', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  async create(marketId: string, name: string): Promise<Item> {
    const items = await this.listByMarket(marketId);
    const position = items.length;

    const { data, error } = await this.supabase
      .from('items')
      .insert({
        market_id: marketId,
        name: name.trim(),
        position,
        is_checked: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async rename(id: string, name: string): Promise<void> {
    const { error } = await this.supabase
      .from('items')
      .update({ name: name.trim() })
      .eq('id', id);
    if (error) throw error;
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
}
