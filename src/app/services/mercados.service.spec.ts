import { TestBed } from '@angular/core/testing';
import { SUPABASE_CLIENT } from '../core/supabase.client';
import { Mercado } from '../models/models';
import { createQueryChain, createSupabaseMock } from '../testing/supabase.mock';
import { MercadosService } from './mercados.service';

describe('MercadosService', () => {
  let service: MercadosService;
  let fromSpy: jasmine.Spy;

  const sample: Mercado[] = [
    {
      id: 'm1',
      nombre: 'Éxito',
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'm2',
      nombre: 'D1',
      created_at: '2026-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    const supabase = createSupabaseMock(() =>
      createQueryChain({ data: sample, error: null })
    );
    fromSpy = supabase.from;

    TestBed.configureTestingModule({
      providers: [MercadosService, { provide: SUPABASE_CLIENT, useValue: supabase }],
    });
    service = TestBed.inject(MercadosService);
  });

  it('list() consulta mercado ordenado por nombre', async () => {
    const chain = createQueryChain({ data: sample, error: null });
    fromSpy.and.returnValue(chain);
    const result = await service.list();
    expect(fromSpy).toHaveBeenCalledWith('mercado');
    expect(chain.order).toHaveBeenCalledWith('nombre', { ascending: true });
    expect(result.length).toBe(2);
  });

  it('create() inserta con trim', async () => {
    let insertPayload: unknown;
    const created = {
      id: 'm3',
      nombre: 'Jumbo',
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

    const mercado = await service.create('  Jumbo  ');
    expect(insertPayload).toEqual({ nombre: 'Jumbo' });
    expect(mercado.nombre).toBe('Jumbo');
  });

  it('rename() actualiza nombre', async () => {
    const chain = createQueryChain({ data: null, error: null });
    fromSpy.and.returnValue(chain);
    await service.rename('m1', '  Éxito Express  ');
    expect(chain.update).toHaveBeenCalledWith({ nombre: 'Éxito Express' });
    expect(chain.eq).toHaveBeenCalledWith('id', 'm1');
  });

  it('remove() elimina por id', async () => {
    const chain = createQueryChain({ data: null, error: null });
    fromSpy.and.returnValue(chain);
    await service.remove('m2');
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith('id', 'm2');
  });

  it('list() lanza si hay error', async () => {
    fromSpy.and.returnValue(
      createQueryChain({ data: null, error: { message: 'db' } })
    );
    await expectAsync(service.list()).toBeRejected();
  });
});
