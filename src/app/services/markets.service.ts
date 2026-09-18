import { Inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../core/supabase.client';
import { Market } from '../models/models';

@Injectable({ providedIn: 'root' })
export class MarketsService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async list(): Promise<Market[]> {
    const { data, error } = await this.supabase
      .from('markets')
      .select('*')
      .order('position', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  async getById(id: string): Promise<Market | null> {
    const { data, error } = await this.supabase
      .from('markets')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async create(name: string): Promise<Market> {
    const markets = await this.list();
    const position = markets.length;

    const { data, error } = await this.supabase
      .from('markets')
      .insert({ name: name.trim(), position })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async rename(id: string, name: string): Promise<void> {
    const { error } = await this.supabase
      .from('markets')
      .update({ name: name.trim() })
      .eq('id', id);
    if (error) throw error;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.from('markets').delete().eq('id', id);
    if (error) throw error;
  }

  async reorder(markets: Market[]): Promise<void> {
    const updates = markets.map((market, index) =>
      this.supabase.from('markets').update({ position: index }).eq('id', market.id)
    );
    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);
    if (failed?.error) throw failed.error;
  }
}
