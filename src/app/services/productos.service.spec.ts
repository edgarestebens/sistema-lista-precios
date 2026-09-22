import { TestBed } from '@angular/core/testing';
import { SUPABASE_CLIENT } from '../core/supabase.client';
import { createQueryChain, createSupabaseMock } from '../testing/supabase.mock';
import { ItemsService } from './items.service';
import { ProductosService } from './productos.service';

describe('ProductosService', () => {
  let service: ProductosService;
  let fromSpy: jasmine.Spy;
  let itemsService: jasmine.SpyObj<ItemsService>;

  const sampleRows = [
    {
      id: 'p1',
      nombre: 'Leche',
      market_id: 'm1',
      created_at: '2026-01-01T00:00:00Z',
      markets: { name: 'Carnes' },
    },
    {
      id: 'p2',
      nombre: 'Arroz',
      market_id: 'm1',
      created_at: '2026-01-01T00:00:00Z',
      markets: { name: 'Carnes' },
    },
  ];

  beforeEach(() => {
    const supabase = createSupabaseMock(() =>
      createQueryChain({ data: sampleRows, error: null })
    );
    fromSpy = supabase.from;
    itemsService = jasmine.createSpyObj<ItemsService>('ItemsService', ['create']);
    itemsService.create.and.resolveTo({
      id: 'i1',
      market_id: 'm1',
      producto_id: 'p3',
      nombre: 'Pan',
      is_checked: false,
      position: 0,
      created_at: '2026-01-02T00:00:00Z',
    });

    TestBed.configureTestingModule({
      providers: [
        ProductosService,
        { provide: SUPABASE_CLIENT, useValue: supabase },
        { provide: ItemsService, useValue: itemsService },
      ],
    });
    service = TestBed.inject(ProductosService);
  });

  it('list() consulta producto con join de lista', async () => {
    const chain = createQueryChain({ data: sampleRows, error: null });
    fromSpy.and.returnValue(chain);
    const result = await service.list();
    expect(fromSpy).toHaveBeenCalledWith('producto');
    expect(chain.select).toHaveBeenCalledWith('*, markets:market_id(name)');
    expect(chain.order).toHaveBeenCalledWith('nombre', { ascending: true });
    expect(result[0].lista_nombre).toBe('Carnes');
    expect(result[0].market_id).toBe('m1');
  });

  it('create() inserta nombre, market_id y lo agrega a la lista', async () => {
    let insertPayload: unknown;
    const created = {
      id: 'p3',
      nombre: 'Pan',
      market_id: 'm1',
      created_at: '2026-01-02T00:00:00Z',
      markets: { name: 'Carnes' },
    };
    fromSpy.and.callFake(() => {
      const chain = createQueryChain({ data: created, error: null });
      chain.insert.and.callFake((payload: unknown) => {
        insertPayload = payload;
        return chain;
      });
      return chain;
    });

    const producto = await service.create('  Pan  ', 'm1');
    expect(insertPayload).toEqual({ nombre: 'Pan', market_id: 'm1' });
    expect(producto.nombre).toBe('Pan');
    expect(producto.market_id).toBe('m1');
    expect(itemsService.create).toHaveBeenCalledWith('m1', 'p3');
  });

  it('update() actualiza nombre y market_id', async () => {
    const chain = createQueryChain({ data: null, error: null });
    fromSpy.and.returnValue(chain);
    await service.update('p1', '  Leche entera  ', 'm2');
    expect(chain.update).toHaveBeenCalledWith({
      nombre: 'Leche entera',
      market_id: 'm2',
    });
    expect(chain.eq).toHaveBeenCalledWith('id', 'p1');
  });

  it('remove() elimina por id', async () => {
    const chain = createQueryChain({ data: null, error: null });
    fromSpy.and.returnValue(chain);
    await service.remove('p2');
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith('id', 'p2');
  });

  it('list() lanza si hay error', async () => {
    fromSpy.and.returnValue(
      createQueryChain({ data: null, error: { message: 'db' } })
    );
    await expectAsync(service.list()).toBeRejected();
  });
});
