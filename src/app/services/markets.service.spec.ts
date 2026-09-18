import { TestBed } from '@angular/core/testing';
import { SUPABASE_CLIENT } from '../core/supabase.client';
import { Market } from '../models/models';
import { createQueryChain, createSupabaseMock } from '../testing/supabase.mock';
import { MarketsService } from './markets.service';

describe('MarketsService', () => {
  let service: MarketsService;
  let fromSpy: jasmine.Spy;

  const sampleMarkets: Market[] = [
    {
      id: 'm1',
      name: 'Carnes',
      position: 0,
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'm2',
      name: 'Mercado',
      position: 1,
      created_at: '2026-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    const supabase = createSupabaseMock(() =>
      createQueryChain({ data: sampleMarkets, error: null })
    );
    fromSpy = supabase.from;

    TestBed.configureTestingModule({
      providers: [
        MarketsService,
        { provide: SUPABASE_CLIENT, useValue: supabase },
      ],
    });
    service = TestBed.inject(MarketsService);
  });

  it('list() retorna mercados ordenados', async () => {
    const result = await service.list();
    expect(fromSpy).toHaveBeenCalledWith('markets');
    expect(result).toEqual(sampleMarkets);
  });

  it('list() retorna [] si data es null', async () => {
    fromSpy.and.returnValue(createQueryChain({ data: null, error: null }));
    expect(await service.list()).toEqual([]);
  });

  it('list() lanza si hay error', async () => {
    fromSpy.and.returnValue(
      createQueryChain({ data: null, error: { message: 'fail' } })
    );
    await expectAsync(service.list()).toBeRejected();
  });

  it('getById() retorna un mercado', async () => {
    fromSpy.and.returnValue(
      createQueryChain({ data: sampleMarkets[0], error: null })
    );
    const market = await service.getById('m1');
    expect(market?.name).toBe('Carnes');
  });

  it('create() hace trim del nombre y usa position = length', async () => {
    let insertPayload: unknown;
    fromSpy.and.callFake(() => {
      const chain = createQueryChain({
        data: {
          id: 'm3',
          name: 'Frutas',
          position: 2,
          created_at: '2026-01-02T00:00:00Z',
        },
        error: null,
      });
      chain.insert.and.callFake((payload: unknown) => {
        insertPayload = payload;
        return chain;
      });
      // First call is list() → order resolves to sampleMarkets
      chain.order.and.returnValue(
        Promise.resolve({ data: sampleMarkets, error: null })
      );
      return chain;
    });

    const created = await service.create('  Frutas  ');
    expect(insertPayload).toEqual({ name: 'Frutas', position: 2 });
    expect(created.name).toBe('Frutas');
  });

  it('remove() elimina por id', async () => {
    const chain = createQueryChain({ data: null, error: null });
    fromSpy.and.returnValue(chain);
    await service.remove('m1');
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith('id', 'm1');
  });

  it('reorder() actualiza position de cada mercado', async () => {
    const chain = createQueryChain({ data: null, error: null });
    fromSpy.and.returnValue(chain);
    await service.reorder(sampleMarkets);
    expect(fromSpy).toHaveBeenCalledTimes(2);
    expect(chain.update).toHaveBeenCalledWith({ position: 0 });
    expect(chain.update).toHaveBeenCalledWith({ position: 1 });
  });
});
