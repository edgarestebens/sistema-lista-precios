import { Inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../core/supabase.client';
import { Gasto } from '../models/models';

export interface GastoInput {
  fecha: string;
  valor: number;
  concepto: string;
}

@Injectable({ providedIn: 'root' })
export class GastosService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async list(): Promise<Gasto[]> {
    const { data, error } = await this.supabase
      .from('gastos')
      .select('*')
      .order('fecha', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async create(input: GastoInput): Promise<Gasto> {
    const { data, error } = await this.supabase
      .from('gastos')
      .insert({
        fecha: input.fecha,
        valor: input.valor,
        concepto: input.concepto.trim(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, input: GastoInput): Promise<void> {
    const { error } = await this.supabase
      .from('gastos')
      .update({
        fecha: input.fecha,
        valor: input.valor,
        concepto: input.concepto.trim(),
      })
      .eq('id', id);
    if (error) throw error;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.from('gastos').delete().eq('id', id);
    if (error) throw error;
  }
}
