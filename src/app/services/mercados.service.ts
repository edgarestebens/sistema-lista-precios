import { Injectable } from '@angular/core';
import { Mercado } from '../models/models';
import { AuthService } from './auth.service';
import { OfflineDbService } from '../offline/offline-db.service';
import { SyncService } from '../offline/sync.service';
import { newId, nowIso } from '../offline/offline-db';

@Injectable({ providedIn: 'root' })
export class MercadosService {
  constructor(
    private readonly offline: OfflineDbService,
    private readonly sync: SyncService,
    private readonly auth: AuthService
  ) {}

  async list(): Promise<Mercado[]> {
    await this.sync.ensureHydrated();
    return this.offline.listMercados();
  }

  async create(nombre: string): Promise<Mercado> {
    await this.sync.ensureHydrated();
    const ts = nowIso();
    const row: Mercado = {
      id: newId(),
      nombre: nombre.trim(),
      created_at: ts,
      updated_at: ts,
      user_id: this.auth.user()?.id,
    };
    await this.offline.putMercado(row);
    await this.sync.queueAndSync('mercado', 'upsert', row.id, {
      id: row.id,
      nombre: row.nombre,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }, ts);
    return row;
  }

  async rename(id: string, nombre: string): Promise<void> {
    const existing = await this.offline.db.mercado.get(id);
    if (!existing) throw new Error('Mercado no encontrado');
    const ts = nowIso();
    const row: Mercado = { ...existing, nombre: nombre.trim(), updated_at: ts };
    await this.offline.putMercado(row);
    await this.sync.queueAndSync('mercado', 'upsert', row.id, {
      id: row.id,
      nombre: row.nombre,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }, ts);
  }

  async remove(id: string): Promise<void> {
    await this.offline.deleteMercado(id);
    await this.sync.queueAndSync('mercado', 'delete', id, null);
  }
}
