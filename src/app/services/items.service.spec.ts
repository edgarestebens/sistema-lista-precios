import { TestBed } from '@angular/core/testing';
import { Item, Producto } from '../models/models';
import {
  createIsolatedOfflineDb,
  offlineProviders,
} from '../testing/offline-test.helpers';
import { OfflineDbService } from '../offline/offline-db.service';
import { ItemsService } from './items.service';

describe('ItemsService', () => {
  let service: ItemsService;
  let offline: OfflineDbService;

  const productos: Producto[] = [
    {
      id: 'p1',
      nombre: 'Leche',
      market_id: 'm1',
      created_at: '2026-01-01T00:00:00Z',
     updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'p2',
      nombre: 'Arroz',
      market_id: 'm1',
      created_at: '2026-01-01T00:00:00Z',
     updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'p3',
      nombre: 'Pan',
      market_id: 'm1',
      created_at: '2026-01-01T00:00:00Z',
     updated_at: '2026-01-01T00:00:00Z',
    },
  ];

  const sampleItems: Item[] = [
    {
      id: 'i1',
      market_id: 'm1',
      producto_id: 'p1',
      nombre: 'Leche',
      is_checked: false,
      position: 0,
      created_at: '2026-01-01T00:00:00Z',
     updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'i2',
      market_id: 'm1',
      producto_id: 'p2',
      nombre: 'Arroz',
      is_checked: true,
      position: 1,
      created_at: '2026-01-01T00:00:00Z',
     updated_at: '2026-01-01T00:00:00Z',
    },
  ];

  beforeEach(async () => {
    offline = createIsolatedOfflineDb();
    await offline.db.producto.bulkPut(productos);
    await offline.db.items.bulkPut(sampleItems);

    TestBed.configureTestingModule({
      providers: [ItemsService, ...offlineProviders(offline)],
    });
    service = TestBed.inject(ItemsService);
  });

  afterEach(async () => {
    await offline.db.delete();
  });

  it('listByMarket() filtra por market_id y mapea nombre', async () => {
    const result = await service.listByMarket('m1');
    expect(result.map((i) => i.id)).toEqual(['i1', 'i2']);
    expect(result[0].nombre).toBe('Leche');
  });

  it('create() inserta al inicio de los no chuleados', async () => {
    const item = await service.create('m1', 'p3');
    expect(item.nombre).toBe('Pan');
    expect(item.producto_id).toBe('p3');
    expect(item.position).toBe(0);
    const list = await service.listByMarket('m1');
    expect(list[0].producto_id).toBe('p3');
  });

  it('toggleChecked() actualiza is_checked', async () => {
    await service.toggleChecked('i1', true);
    const list = await service.listByMarket('m1');
    expect(list.find((i) => i.id === 'i1')?.is_checked).toBeTrue();
  });

  it('remove() elimina por id', async () => {
    await service.remove('i2');
    const list = await service.listByMarket('m1');
    expect(list.some((i) => i.id === 'i2')).toBeFalse();
  });

  it('reorder() actualiza positions', async () => {
    await service.reorder([sampleItems[1], sampleItems[0]]);
    const list = await service.listByMarket('m1');
    // checked items go after unchecked in listByMarket sort
    const byId = new Map(list.map((i) => [i.id, i]));
    expect(byId.get('i2')?.position).toBe(0);
    expect(byId.get('i1')?.position).toBe(1);
  });
});
