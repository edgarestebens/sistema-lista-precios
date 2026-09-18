import { TestBed } from '@angular/core/testing';
import { SUPABASE_CLIENT } from '../core/supabase.client';
import { Item } from '../models/models';
import { createQueryChain, createSupabaseMock } from '../testing/supabase.mock';
import { ItemsService } from './items.service';

describe('ItemsService', () => {
  let service: ItemsService;
  let fromSpy: jasmine.Spy;

  const sampleItems: Item[] = [
    {
      id: 'i1',
      market_id: 'm1',
      name: 'Leche',
      is_checked: false,
      position: 0,
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'i2',
      market_id: 'm1',
      name: 'Arroz',
      is_checked: true,
      position: 1,
      created_at: '2026-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    const supabase = createSupabaseMock(() =>
      createQueryChain({ data: sampleItems, error: null })
    );
    fromSpy = supabase.from;

    TestBed.configureTestingModule({
      providers: [ItemsService, { provide: SUPABASE_CLIENT, useValue: supabase }],
    });
    service = TestBed.inject(ItemsService);
  });

  it('listByMarket() filtra por market_id', async () => {
    const chain = createQueryChain({ data: sampleItems, error: null });
    fromSpy.and.returnValue(chain);

    const result = await service.listByMarket('m1');
    expect(fromSpy).toHaveBeenCalledWith('items');
    expect(chain.eq).toHaveBeenCalledWith('market_id', 'm1');
    expect(result.length).toBe(2);
  });

  it('create() inserta ítem sin tachar y con trim', async () => {
    let insertPayload: unknown;
    fromSpy.and.callFake(() => {
      const chain = createQueryChain({
        data: {
          id: 'i3',
          market_id: 'm1',
          name: 'Pan',
          is_checked: false,
          position: 2,
          created_at: '2026-01-02T00:00:00Z',
        },
        error: null,
      });
      chain.insert.and.callFake((payload: unknown) => {
        insertPayload = payload;
        return chain;
      });
      chain.order.and.returnValue(
        Promise.resolve({ data: sampleItems, error: null })
      );
      return chain;
    });

    const item = await service.create('m1', '  Pan  ');
    expect(insertPayload).toEqual({
      market_id: 'm1',
      name: 'Pan',
      position: 2,
      is_checked: false,
    });
    expect(item.name).toBe('Pan');
  });

  it('toggleChecked() actualiza is_checked', async () => {
    const chain = createQueryChain({ data: null, error: null });
    fromSpy.and.returnValue(chain);
    await service.toggleChecked('i1', true);
    expect(chain.update).toHaveBeenCalledWith({ is_checked: true });
    expect(chain.eq).toHaveBeenCalledWith('id', 'i1');
  });

  it('remove() elimina por id', async () => {
    const chain = createQueryChain({ data: null, error: null });
    fromSpy.and.returnValue(chain);
    await service.remove('i2');
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith('id', 'i2');
  });

  it('reorder() actualiza positions', async () => {
    const chain = createQueryChain({ data: null, error: null });
    fromSpy.and.returnValue(chain);
    await service.reorder(sampleItems);
    expect(fromSpy).toHaveBeenCalledTimes(2);
    expect(chain.update).toHaveBeenCalledWith({ position: 0 });
    expect(chain.update).toHaveBeenCalledWith({ position: 1 });
  });

  it('listByMarket() lanza si hay error', async () => {
    fromSpy.and.returnValue(
      createQueryChain({ data: null, error: { message: 'db' } })
    );
    await expectAsync(service.listByMarket('m1')).toBeRejected();
  });
});
