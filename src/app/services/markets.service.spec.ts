import { TestBed } from '@angular/core/testing';
import { Market } from '../models/models';
import {
  createIsolatedOfflineDb,
  offlineProviders,
} from '../testing/offline-test.helpers';
import { OfflineDbService } from '../offline/offline-db.service';
import { MarketsService } from './markets.service';

describe('MarketsService', () => {
  let service: MarketsService;
  let offline: OfflineDbService;

  const sampleMarkets: Market[] = [
    {
      id: 'm1',
      name: 'Carnes',
      position: 0,
      created_at: '2026-01-01T00:00:00Z',
     updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'm2',
      name: 'Mercado',
      position: 1,
      created_at: '2026-01-01T00:00:00Z',
     updated_at: '2026-01-01T00:00:00Z',
    },
  ];

  beforeEach(async () => {
    offline = createIsolatedOfflineDb();
    await offline.db.markets.bulkPut(sampleMarkets);

    TestBed.configureTestingModule({
      providers: [MarketsService, ...offlineProviders(offline)],
    });
    service = TestBed.inject(MarketsService);
  });

  afterEach(async () => {
    await offline.db.delete();
  });

  it('list() retorna mercados ordenados', async () => {
    const result = await service.list();
    expect(result.map((m) => m.id)).toEqual(['m1', 'm2']);
  });

  it('list() retorna [] si no hay datos', async () => {
    await offline.db.markets.clear();
    expect(await service.list()).toEqual([]);
  });

  it('getById() retorna un mercado', async () => {
    const market = await service.getById('m1');
    expect(market?.name).toBe('Carnes');
  });

  it('create() hace trim del nombre y usa position = length', async () => {
    const created = await service.create('  Frutas  ');
    expect(created.name).toBe('Frutas');
    expect(created.position).toBe(2);
    const all = await service.list();
    expect(all.some((m) => m.name === 'Frutas')).toBeTrue();
  });

  it('remove() elimina por id', async () => {
    await service.remove('m1');
    expect(await service.getById('m1')).toBeNull();
  });

  it('reorder() actualiza position de cada mercado', async () => {
    await service.reorder([sampleMarkets[1], sampleMarkets[0]]);
    const list = await service.list();
    expect(list[0].id).toBe('m2');
    expect(list[0].position).toBe(0);
    expect(list[1].id).toBe('m1');
    expect(list[1].position).toBe(1);
  });
});
