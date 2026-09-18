import { TestBed } from '@angular/core/testing';
import { SUPABASE_CLIENT } from '../core/supabase.client';
import { Producto } from '../models/models';
import { createQueryChain, createSupabaseMock } from '../testing/supabase.mock';
import { ProductosService } from './productos.service';

describe('ProductosService', () => {
  let service: ProductosService;
  let fromSpy: jasmine.Spy;

  const sample: Producto[] = [
    {
      id: 'p1',
      nombre: 'Leche',
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'p2',
      nombre: 'Arroz',
      created_at: '2026-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    const supabase = createSupabaseMock(() =>
      createQueryChain({ data: sample, error: null })
    );
    fromSpy = supabase.from;

    TestBed.configureTestingModule({
      providers: [ProductosService, { provide: SUPABASE_CLIENT, useValue: supabase }],
    });
    service = TestBed.inject(ProductosService);
  });

  it('list() consulta producto ordenado por nombre', async () => {
    const chain = createQueryChain({ data: sample, error: null });
    fromSpy.and.returnValue(chain);
    const result = await service.list();
    expect(fromSpy).toHaveBeenCalledWith('producto');
    expect(chain.order).toHaveBeenCalledWith('nombre', { ascending: true });
    expect(result.length).toBe(2);
  });

  it('create() inserta con trim', async () => {
    let insertPayload: unknown;
    const created = {
      id: 'p3',
      nombre: 'Pan',
      created_at: '2026-01-02T00:00:00Z',
    };
    fromSpy.and.callFake(() => {
      const chain = createQueryChain({ data: created, error: null });
      chain.insert.and.callFake((payload: unknown) => {
        insertPayload = payload;
        return chain;
      });
      return chain;
    });

    const producto = await service.create('  Pan  ');
    expect(insertPayload).toEqual({ nombre: 'Pan' });
    expect(producto.nombre).toBe('Pan');
  });

  it('rename() actualiza nombre', async () => {
    const chain = createQueryChain({ data: null, error: null });
    fromSpy.and.returnValue(chain);
    await service.rename('p1', '  Leche entera  ');
    expect(chain.update).toHaveBeenCalledWith({ nombre: 'Leche entera' });
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
