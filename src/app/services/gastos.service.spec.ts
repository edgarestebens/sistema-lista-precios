import { TestBed } from '@angular/core/testing';
import { SUPABASE_CLIENT } from '../core/supabase.client';
import { Gasto } from '../models/models';
import { createQueryChain, createSupabaseMock } from '../testing/supabase.mock';
import { GastosService } from './gastos.service';

describe('GastosService', () => {
  let service: GastosService;
  let fromSpy: jasmine.Spy;

  const sample: Gasto[] = [
    {
      id: 'g1',
      fecha: '2026-03-01',
      valor: 15000,
      concepto: 'Transporte',
      created_at: '2026-03-01T00:00:00Z',
    },
    {
      id: 'g2',
      fecha: '2026-03-05',
      valor: 42000,
      concepto: 'Mercado',
      created_at: '2026-03-05T00:00:00Z',
    },
  ];

  beforeEach(() => {
    const supabase = createSupabaseMock(() =>
      createQueryChain({ data: sample, error: null })
    );
    fromSpy = supabase.from;

    TestBed.configureTestingModule({
      providers: [GastosService, { provide: SUPABASE_CLIENT, useValue: supabase }],
    });
    service = TestBed.inject(GastosService);
  });

  it('list() consulta gastos ordenado por fecha desc', async () => {
    const chain = createQueryChain({ data: sample, error: null });
    fromSpy.and.returnValue(chain);
    const result = await service.list();
    expect(fromSpy).toHaveBeenCalledWith('gastos');
    expect(chain.order).toHaveBeenCalledWith('fecha', { ascending: false });
    expect(result.length).toBe(2);
  });

  it('create() inserta con trim en concepto', async () => {
    let insertPayload: unknown;
    const created: Gasto = {
      id: 'g3',
      fecha: '2026-03-10',
      valor: 8000,
      concepto: 'Café',
      created_at: '2026-03-10T00:00:00Z',
    };
    fromSpy.and.callFake(() => {
      const chain = createQueryChain({ data: created, error: null });
      chain.insert.and.callFake((payload: unknown) => {
        insertPayload = payload;
        return chain;
      });
      return chain;
    });

    const gasto = await service.create({
      fecha: '2026-03-10',
      valor: 8000,
      concepto: '  Café  ',
    });
    expect(insertPayload).toEqual({
      fecha: '2026-03-10',
      valor: 8000,
      concepto: 'Café',
    });
    expect(gasto.concepto).toBe('Café');
  });

  it('update() actualiza campos', async () => {
    const chain = createQueryChain({ data: null, error: null });
    fromSpy.and.returnValue(chain);
    await service.update('g1', {
      fecha: '2026-03-02',
      valor: 16000,
      concepto: '  Taxi  ',
    });
    expect(chain.update).toHaveBeenCalledWith({
      fecha: '2026-03-02',
      valor: 16000,
      concepto: 'Taxi',
    });
    expect(chain.eq).toHaveBeenCalledWith('id', 'g1');
  });

  it('remove() elimina por id', async () => {
    const chain = createQueryChain({ data: null, error: null });
    fromSpy.and.returnValue(chain);
    await service.remove('g2');
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith('id', 'g2');
  });

  it('list() lanza si hay error', async () => {
    fromSpy.and.returnValue(
      createQueryChain({ data: null, error: { message: 'db' } })
    );
    await expectAsync(service.list()).toBeRejected();
  });
});
