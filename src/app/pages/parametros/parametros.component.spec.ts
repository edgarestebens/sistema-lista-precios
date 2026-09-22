import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Parametro } from '../../models/models';
import { ConnectivityService } from '../../offline/connectivity.service';
import { AlertService } from '../../services/alert.service';
import { ParametrosService } from '../../services/parametros.service';
import { ParametrosComponent } from './parametros.component';

describe('ParametrosComponent', () => {
  let fixture: ComponentFixture<ParametrosComponent>;
  let component: ParametrosComponent;
  let parametrosService: jasmine.SpyObj<ParametrosService>;
  let alertService: jasmine.SpyObj<AlertService>;

  const parametro: Parametro = {
    id: 'par1',
    saldo_gasto: 600000,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  };

  beforeEach(async () => {
    parametrosService = jasmine.createSpyObj<ParametrosService>(
      'ParametrosService',
      ['get', 'updateSaldoGasto']
    );
    parametrosService.get.and.resolveTo(parametro);
    parametrosService.updateSaldoGasto.and.resolveTo(parametro);
    alertService = jasmine.createSpyObj<AlertService>('AlertService', [
      'error',
      'warning',
      'success',
    ]);
    alertService.error.and.resolveTo();
    alertService.warning.and.resolveTo();
    alertService.success.and.resolveTo();

    await TestBed.configureTestingModule({
      imports: [ParametrosComponent],
      providers: [
        provideRouter([]),
        { provide: ParametrosService, useValue: parametrosService },
        { provide: AlertService, useValue: alertService },
        {
          provide: ConnectivityService,
          useValue: { isOnline: () => true, online: () => true },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ParametrosComponent);
    component = fixture.componentInstance;
  });

  it('carga saldo_gasto al iniciar', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(parametrosService.get).toHaveBeenCalled();
    expect(component.formSaldoGasto).toBe(600000);
    expect(component.loading()).toBeFalse();
  });

  it('save() actualiza el saldo gasto', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.formSaldoGasto = 750000;
    await component.save();
    expect(parametrosService.updateSaldoGasto).toHaveBeenCalledWith(750000);
    expect(alertService.success).toHaveBeenCalledWith(
      'Documento modificado exitosamente'
    );
  });

  it('save() no guarda si el valor es inválido', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.formSaldoGasto = null;
    await component.save();
    expect(parametrosService.updateSaldoGasto).not.toHaveBeenCalled();
  });
});
