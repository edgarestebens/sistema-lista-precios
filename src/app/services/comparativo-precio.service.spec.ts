import { TestBed } from '@angular/core/testing';
import { ComparativoPrecio, Mercado, Producto } from '../models/models';
import {
  createIsolatedOfflineDb,
  offlineProviders,
} from '../testing/offline-test.helpers';
import { OfflineDbService } from '../offline/offline-db.service';
import { ComparativoPrecioService } from './comparativo-precio.service';

describe('ComparativoPrecioService', () => {
  let service: ComparativoPrecioService;
  let offline: OfflineDbService;

  const productos: Producto[] = [
    {
      id: 'p1',
      nombre: 'Leche',
      created_at: '2026-01-01T00:00:00Z',
     updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'p2',
      nombre: 'Arroz',
      created_at: '2026-01-01T00:00:00Z',
     updated_at: '2026-01-01T00:00:00Z',
    },
  ];

  const mercados: Mercado[] = [
    {
      id: 'me1',
      nombre: 'Éxito',
      created_at: '2026-01-01T00:00:00Z',
     updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'me2',
      nombre: 'D1',
      created_at: '2026-01-01T00:00:00Z',
     updated_at: '2026-01-01T00:00:00Z',
    },
  ];

  const sampleRows: ComparativoPrecio[] = [
    {
      id: 'c1',
      producto_id: 'p1',
      mercado_id: 'me1',
      precio: 3000,
      created_at: '2026-01-01T00:00:00Z',
     updated_at: '2026-01-01T00:00:00Z',
      producto: { nombre: 'Leche' },
      mercado: { nombre: 'Éxito' },
    },
    {
      id: 'c2',
      producto_id: 'p1',
      mercado_id: 'me2',
      precio: 2800,
      created_at: '2026-01-01T00:00:00Z',
     updated_at: '2026-01-01T00:00:00Z',
      producto: { nombre: 'Leche' },
      mercado: { nombre: 'D1' },
    },
    {
      id: 'c3',
      producto_id: 'p2',
      mercado_id: 'me1',
      precio: 0,
      created_at: '2026-01-01T00:00:00Z',
     updated_at: '2026-01-01T00:00:00Z',
      producto: { nombre: 'Arroz' },
      mercado: { nombre: 'Éxito' },
    },
  ];

  beforeEach(async () => {
    offline = createIsolatedOfflineDb();
    await offline.db.producto.bulkPut(productos);
    await offline.db.mercado.bulkPut(mercados);
    await offline.db.comparativo_precio.bulkPut(sampleRows);

    TestBed.configureTestingModule({
      providers: [ComparativoPrecioService, ...offlineProviders(offline)],
    });
    service = TestBed.inject(ComparativoPrecioService);
  });

  afterEach(async () => {
    await offline.db.delete();
  });

  it('list() retorna filas locales', async () => {
    const result = await service.list();
    expect(result.length).toBe(3);
  });

  it('listGrouped() agrupa por producto', async () => {
    const groups = await service.listGrouped();
    expect(groups.length).toBe(2);
    const leche = groups.find((g) => g.producto_id === 'p1');
    expect(leche?.producto_nombre).toBe('Leche');
    expect(leche?.precios['me1']).toBe(3000);
    expect(leche?.precios['me2']).toBe(2800);
  });

  it('mapPrecioMasBarato() toma el menor > 0', async () => {
    const map = await service.mapPrecioMasBarato();
    expect(map['p1']).toEqual({
      producto_id: 'p1',
      precio: 2800,
      mercado_nombre: 'D1',
    });
    expect(map['p2']).toBeUndefined();
  });

  it('saveForProducto() guarda precios por mercado', async () => {
    await service.saveForProducto('p1', [
      { mercado_id: 'me1', precio: 3100 },
      { mercado_id: 'me2', precio: 0 },
    ]);
    const rows = await service.list();
    const p1 = rows.filter((r) => r.producto_id === 'p1');
    expect(p1.find((r) => r.mercado_id === 'me1')?.precio).toBe(3100);
    expect(p1.find((r) => r.mercado_id === 'me2')?.precio).toBe(0);
  });

  it('removeByProducto() elimina por producto_id', async () => {
    await service.removeByProducto('p1');
    const rows = await service.list();
    expect(rows.some((r) => r.producto_id === 'p1')).toBeFalse();
  });
});
