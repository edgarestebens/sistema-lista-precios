import { TestBed } from '@angular/core/testing';
import { Market, Producto } from '../models/models';
import {
  createIsolatedOfflineDb,
  offlineProviders,
} from '../testing/offline-test.helpers';
import { OfflineDbService } from '../offline/offline-db.service';
import { ItemsService } from './items.service';
import { ProductosService } from './productos.service';

describe('ProductosService', () => {
  let service: ProductosService;
  let offline: OfflineDbService;
  let itemsService: jasmine.SpyObj<ItemsService>;

  const markets: Market[] = [
    {
      id: 'm1',
      name: 'Carnes',
      position: 0,
      created_at: '2026-01-01T00:00:00Z',
     updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'm2',
      name: 'Frutas',
      position: 1,
      created_at: '2026-01-01T00:00:00Z',
     updated_at: '2026-01-01T00:00:00Z',
    },
  ];

  const sampleProductos: Producto[] = [
    {
      id: 'p1',
      nombre: 'Leche',
      market_id: 'm1',
      lista_nombre: 'Carnes',
      created_at: '2026-01-01T00:00:00Z',
     updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'p2',
      nombre: 'Arroz',
      market_id: 'm1',
      lista_nombre: 'Carnes',
      created_at: '2026-01-01T00:00:00Z',
     updated_at: '2026-01-01T00:00:00Z',
    },
  ];

  beforeEach(async () => {
    offline = createIsolatedOfflineDb();
    await offline.db.markets.bulkPut(markets);
    await offline.db.producto.bulkPut(sampleProductos);

    itemsService = jasmine.createSpyObj<ItemsService>('ItemsService', ['create']);
    itemsService.create.and.resolveTo({
      id: 'i1',
      market_id: 'm1',
      producto_id: 'p3',
      nombre: 'Pan',
      is_checked: false,
      position: 0,
      created_at: '2026-01-02T00:00:00Z',
     updated_at: '2026-01-02T00:00:00Z',
    });

    TestBed.configureTestingModule({
      providers: [
        ProductosService,
        ...offlineProviders(offline),
        { provide: ItemsService, useValue: itemsService },
      ],
    });
    service = TestBed.inject(ProductosService);
  });

  afterEach(async () => {
    await offline.db.delete();
  });

  it('list() consulta producto con nombre de lista', async () => {
    const result = await service.list();
    expect(result[0].lista_nombre).toBe('Carnes');
    expect(result[0].market_id).toBe('m1');
  });

  it('create() inserta nombre, market_id y lo agrega a la lista', async () => {
    const producto = await service.create('  Pan  ', 'm1');
    expect(producto.nombre).toBe('Pan');
    expect(producto.market_id).toBe('m1');
    expect(itemsService.create).toHaveBeenCalledWith('m1', producto.id);
  });

  it('update() actualiza nombre y market_id', async () => {
    await service.update('p1', '  Leche entera  ', 'm2');
    const list = await service.list();
    const p = list.find((x) => x.id === 'p1');
    expect(p?.nombre).toBe('Leche entera');
    expect(p?.market_id).toBe('m2');
    expect(p?.lista_nombre).toBe('Frutas');
  });

  it('remove() elimina por id', async () => {
    await service.remove('p2');
    const list = await service.list();
    expect(list.some((p) => p.id === 'p2')).toBeFalse();
  });
});
