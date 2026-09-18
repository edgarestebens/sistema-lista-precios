import { Inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../core/supabase.client';
import { Producto } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ProductosService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async list(): Promise<Producto[]> {
    const { data, error } = await this.supabase
      .from('producto')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  async create(nombre: string): Promise<Producto> {
    const { data, error } = await this.supabase
      .from('producto')
      .insert({ nombre: nombre.trim() })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async rename(id: string, nombre: string): Promise<void> {
    const { error } = await this.supabase
      .from('producto')
      .update({ nombre: nombre.trim() })
      .eq('id', id);
    if (error) throw error;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.from('producto').delete().eq('id', id);
    if (error) throw error;
  }
}
