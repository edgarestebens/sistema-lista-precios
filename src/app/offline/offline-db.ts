import Dexie, { Table } from 'dexie';
import {
  ComparativoPrecio,
  Item,
  Market,
  Mercado,
  Producto,
} from '../models/models';

export type SyncTable =
  | 'markets'
  | 'items'
  | 'producto'
  | 'mercado'
  | 'comparativo_precio';

export type OutboxOp = 'upsert' | 'delete';

export interface OutboxEntry {
  id?: number;
  table: SyncTable;
  op: OutboxOp;
  rowId: string;
  payload: Record<string, unknown> | null;
  clientUpdatedAt: string;
  createdAt: string;
}

export interface MetaEntry {
  key: string;
  value: string;
}

/** Filas locales de items (nombre denormalizado). */
export type LocalItem = Item;

/** Filas locales de producto (lista_nombre denormalizado). */
export type LocalProducto = Producto;

/** Filas locales de comparativo (nombres denormalizados opcionales). */
export type LocalComparativo = ComparativoPrecio;

export class OfflineDatabase extends Dexie {
  markets!: Table<Market, string>;
  items!: Table<LocalItem, string>;
  producto!: Table<LocalProducto, string>;
  mercado!: Table<Mercado, string>;
  comparativo_precio!: Table<LocalComparativo, string>;
  outbox!: Table<OutboxEntry, number>;
  meta!: Table<MetaEntry, string>;

  constructor(dbName = 'lista-mercado-offline') {
    super(dbName);
    this.version(1).stores({
      markets: 'id, position, updated_at, user_id',
      items: 'id, market_id, producto_id, position, updated_at, user_id',
      producto: 'id, market_id, nombre, updated_at, user_id',
      mercado: 'id, nombre, updated_at, user_id',
      comparativo_precio: 'id, producto_id, mercado_id, [producto_id+mercado_id], updated_at, user_id',
      outbox: '++id, [table+rowId], table, rowId, createdAt',
      meta: 'key',
    });
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(): string {
  return crypto.randomUUID();
}
