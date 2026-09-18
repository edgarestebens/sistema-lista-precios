import { Inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../core/supabase.client';
import { Mercado } from '../models/models';

@Injectable({ providedIn: 'root' })
export class MercadosService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async list(): Promise<Mercado[]> {
    const { data, error } = await this.supabase
      .from('mercado')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  async create(nombre: string): Promise<Mercado> {
    const { data, error } = await this.supabase
      .from('mercado')
      .insert({ nombre: nombre.trim() })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async rename(id: string, nombre: string): Promise<void> {
    const { error } = await this.supabase
      .from('mercado')
      .update({ nombre: nombre.trim() })
      .eq('id', id);
    if (error) throw error;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.from('mercado').delete().eq('id', id);
    if (error) throw error;
  }
}
