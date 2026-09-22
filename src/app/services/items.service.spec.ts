import { TestBed } from '@angular/core/testing';
import { SUPABASE_CLIENT } from '../core/supabase.client';
import { Item } from '../models/models';
import { createQueryChain, createSupabaseMock } from '../testing/supabase.mock';
import { ItemsService } from './items.service';

describe('ItemsService', () => {
  let service: ItemsService;
  let fromSpy: jasmine.Spy;

  const sampleRows = [
    {
      id: 'i1',
      market_id: 'm1',
      producto_id: 'p1',
      is_checked: false,
      position: 0,
      created_at: '2026-01-01T00:00:00Z',
      producto: { nombre: 'Leche' },
    },
    {
      id: 'i2',
      market_id: 'm1',
      producto_id: 'p2',
      is_checked: true,
      position: 1,
      created_at: '2026-01-01T00:00:00Z',
      producto: { nombre: 'Arroz' },
    },
  ];

  const sampleItems: Item[] = [
    {
      id: 'i1',
      market_id: 'm1',
      producto_id: 'p1',
      nombre: 'Leche',
      is_checked: false,
      position: 0,
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'i2',
      market_id: 'm1',
      producto_id: 'p2',
      nombre: 'Arroz',
      is_checked: true,
      position: 1,
      created_at: '2026-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    const supabase = createSupabaseMock(() =>
      createQueryChain({ data: sampleRows, error: null })
    );
    fromSpy = supabase.from;

    TestBed.configureTestingModule({
      providers: [ItemsService, { provide: SUPABASE_CLIENT, useValue: supabase }],
    });
    service = TestBed.inject(ItemsService);
  });

  it('listByMarket() filtra por market_id y mapea nombre', async () => {
    const chain = createQueryChain({ data: sampleRows, error: null });
    fromSpy.and.returnValue(chain);

    const result = await service.listByMarket('m1');
    expect(fromSpy).toHaveBeenCalledWith('items');
    expect(chain.select).toHaveBeenCalledWith('*, producto:producto_id(nombre)');
    expect(chain.eq).toHaveBeenCalledWith('market_id', 'm1');
    expect(chain.order).toHaveBeenCalledWith('is_checked', { ascending: true });
    expect(chain.order).toHaveBeenCalledWith('position', { ascending: true });
    expect(result).toEqual(sampleItems);
  });

  it('create() inserta al inicio de los no chuleados', async () => {
    let insertPayload: unknown;
    let call = 0;
    fromSpy.and.callFake(() => {
      call += 1;
      if (call === 1) {
        return createQueryChain({ data: sampleRows, error: null });
      }
      const chain = createQueryChain({
        data: {
          id: 'i3',
          market_id: 'm1',
          producto_id: 'p3',
          is_checked: false,
          position: 0,
          created_at: '2026-01-02T00:00:00Z',
          producto: { nombre: 'Pan' },
        },
        error: null,
      });
      chain.insert.and.callFake((payload: unknown) => {
        insertPayload = payload;
        return chain;
      });
      return chain;
    });

    const item = await service.create('m1', 'p3');
    expect(insertPayload).toEqual({
      market_id: 'm1',
      producto_id: 'p3',
      position: 0,
      is_checked: false,
    });
    expect(item.nombre).toBe('Pan');
    expect(item.producto_id).toBe('p3');
    expect(item.position).toBe(0);
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
