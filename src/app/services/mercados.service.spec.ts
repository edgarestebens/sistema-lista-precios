import { TestBed } from '@angular/core/testing';
import { Mercado } from '../models/models';
import {
  createIsolatedOfflineDb,
  offlineProviders,
} from '../testing/offline-test.helpers';
import { OfflineDbService } from '../offline/offline-db.service';
import { MercadosService } from './mercados.service';

describe('MercadosService', () => {
  let service: MercadosService;
  let offline: OfflineDbService;

  const sample: Mercado[] = [
    {
      id: 'm1',
      nombre: 'Éxito',
      created_at: '2026-01-01T00:00:00Z',
     updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'm2',
      nombre: 'D1',
      created_at: '2026-01-01T00:00:00Z',
     updated_at: '2026-01-01T00:00:00Z',
    },
  ];

  beforeEach(async () => {
    offline = createIsolatedOfflineDb();
    await offline.db.mercado.bulkPut(sample);

    TestBed.configureTestingModule({
      providers: [MercadosService, ...offlineProviders(offline)],
    });
    service = TestBed.inject(MercadosService);
  });

  afterEach(async () => {
    await offline.db.delete();
  });

  it('list() consulta mercado ordenado por nombre', async () => {
    const result = await service.list();
    expect(result.map((m) => m.nombre)).toEqual(['D1', 'Éxito']);
  });

  it('create() inserta con trim', async () => {
    const mercado = await service.create('  Jumbo  ');
    expect(mercado.nombre).toBe('Jumbo');
    const list = await service.list();
    expect(list.some((m) => m.nombre === 'Jumbo')).toBeTrue();
  });

  it('rename() actualiza nombre', async () => {
    await service.rename('m1', '  Éxito Express  ');
    const list = await service.list();
    expect(list.find((m) => m.id === 'm1')?.nombre).toBe('Éxito Express');
  });

  it('remove() elimina por id', async () => {
    await service.remove('m2');
    const list = await service.list();
    expect(list.some((m) => m.id === 'm2')).toBeFalse();
  });
});
