import { TestBed } from '@angular/core/testing';
import { SUPABASE_CLIENT } from '../core/supabase.client';
import { Parametro } from '../models/models';
import { createQueryChain, createSupabaseMock } from '../testing/supabase.mock';
import { ParametrosService } from './parametros.service';

describe('ParametrosService', () => {
  let service: ParametrosService;
  let fromSpy: jasmine.Spy;

  const sample: Parametro = {
    id: 'par1',
    saldo_gasto: 600000,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  };

  beforeEach(() => {
    const supabase = createSupabaseMock(() =>
      createQueryChain({ data: sample, error: null })
    );
    fromSpy = supabase.from;

    TestBed.configureTestingModule({
      providers: [
        ParametrosService,
        { provide: SUPABASE_CLIENT, useValue: supabase },
      ],
    });
    service = TestBed.inject(ParametrosService);
  });

  it('get() consulta el parámetro', async () => {
    const chain = createQueryChain({ data: sample, error: null });
    fromSpy.and.returnValue(chain);
    const result = await service.get();
    expect(fromSpy).toHaveBeenCalledWith('parametros');
    expect(chain.limit).toHaveBeenCalledWith(1);
    expect(chain.single).toHaveBeenCalled();
    expect(result.saldo_gasto).toBe(600000);
  });

  it('updateSaldoGasto() actualiza el valor existente', async () => {
    const updated = { ...sample, saldo_gasto: 700000 };
    let call = 0;
    fromSpy.and.callFake(() => {
      call += 1;
      if (call === 1) {
        return createQueryChain({ data: sample, error: null });
      }
      return createQueryChain({ data: updated, error: null });
    });

    const result = await service.updateSaldoGasto(700000);
    expect(result.saldo_gasto).toBe(700000);
  });

  it('get() lanza si hay error', async () => {
    fromSpy.and.returnValue(
      createQueryChain({ data: null, error: { message: 'db' } })
    );
    await expectAsync(service.get()).toBeRejected();
  });
});
