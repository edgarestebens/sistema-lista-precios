import { Inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../core/supabase.client';
import { Parametro } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ParametrosService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async get(): Promise<Parametro> {
    const { data, error } = await this.supabase
      .from('parametros')
      .select('*')
      .limit(1)
      .single();

    if (error) throw error;
    return data;
  }

  async updateSaldoGasto(saldoGasto: number): Promise<Parametro> {
    const current = await this.get();
    const { data, error } = await this.supabase
      .from('parametros')
      .update({ saldo_gasto: saldoGasto })
      .eq('id', current.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
