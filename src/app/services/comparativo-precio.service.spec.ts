import { TestBed } from '@angular/core/testing';
import { SUPABASE_CLIENT } from '../core/supabase.client';
import { ComparativoPrecio } from '../models/models';
import { createQueryChain, createSupabaseMock } from '../testing/supabase.mock';
import { ComparativoPrecioService } from './comparativo-precio.service';

describe('ComparativoPrecioService', () => {
  let service: ComparativoPrecioService;
  let fromSpy: jasmine.Spy;

  const sampleRows: ComparativoPrecio[] = [
    {
      id: 'c1',
      producto_id: 'p1',
      mercado_id: 'me1',
      precio: 3000,
      created_at: '2026-01-01T00:00:00Z',
      producto: { nombre: 'Leche' },
      mercado: { nombre: 'Éxito' },
    },
    {
      id: 'c2',
      producto_id: 'p1',
      mercado_id: 'me2',
      precio: 2800,
      created_at: '2026-01-01T00:00:00Z',
      producto: { nombre: 'Leche' },
      mercado: { nombre: 'D1' },
    },
    {
      id: 'c3',
      producto_id: 'p2',
      mercado_id: 'me1',
      precio: 0,
      created_at: '2026-01-01T00:00:00Z',
      producto: { nombre: 'Arroz' },
      mercado: { nombre: 'Éxito' },
    },
  ];

  beforeEach(() => {
    const supabase = createSupabaseMock(() =>
      createQueryChain({ data: sampleRows, error: null })
    );
    fromSpy = supabase.from;

    TestBed.configureTestingModule({
      providers: [
        ComparativoPrecioService,
        { provide: SUPABASE_CLIENT, useValue: supabase },
      ],
    });
    service = TestBed.inject(ComparativoPrecioService);
  });

  it('list() consulta comparativo_precio con joins', async () => {
    const chain = createQueryChain({ data: sampleRows, error: null });
    fromSpy.and.returnValue(chain);
    const result = await service.list();
    expect(fromSpy).toHaveBeenCalledWith('comparativo_precio');
    expect(chain.select).toHaveBeenCalledWith(
      '*, producto:producto_id(nombre), mercado:mercado_id(nombre)'
    );
    expect(result.length).toBe(3);
  });

  it('listGrouped() agrupa por producto', async () => {
    fromSpy.and.returnValue(
      createQueryChain({ data: sampleRows, error: null })
    );
    const groups = await service.listGrouped();
    expect(groups.length).toBe(2);
    const leche = groups.find((g) => g.producto_id === 'p1');
    expect(leche?.producto_nombre).toBe('Leche');
    expect(leche?.precios['me1']).toBe(3000);
    expect(leche?.precios['me2']).toBe(2800);
  });

  it('saveForProducto() hace upsert por mercado', async () => {
    let upsertPayload: unknown;
    let upsertOpts: unknown;
    fromSpy.and.callFake(() => {
      const chain = createQueryChain({ data: null, error: null });
      chain.upsert.and.callFake((payload: unknown, opts?: unknown) => {
        upsertPayload = payload;
        upsertOpts = opts;
        return chain;
      });
      return chain;
    });

    await service.saveForProducto('p1', [
      { mercado_id: 'me1', precio: 3100 },
      { mercado_id: 'me2', precio: 0 },
    ]);

    expect(upsertPayload).toEqual([
      { producto_id: 'p1', mercado_id: 'me1', precio: 3100 },
      { producto_id: 'p1', mercado_id: 'me2', precio: 0 },
    ]);
    expect(upsertOpts).toEqual({ onConflict: 'producto_id,mercado_id' });
  });

  it('removeByProducto() elimina por producto_id', async () => {
    const chain = createQueryChain({ data: null, error: null });
    fromSpy.and.returnValue(chain);
    await service.removeByProducto('p1');
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith('producto_id', 'p1');
  });

  it('list() lanza si hay error', async () => {
    fromSpy.and.returnValue(
      createQueryChain({ data: null, error: { message: 'db' } })
    );
    await expectAsync(service.list()).toBeRejected();
  });
});
