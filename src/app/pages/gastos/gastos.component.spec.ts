import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Gasto, Parametro } from '../../models/models';
import { AlertService } from '../../services/alert.service';
import { GastosService } from '../../services/gastos.service';
import { ParametrosService } from '../../services/parametros.service';
import { GastosComponent } from './gastos.component';

describe('GastosComponent', () => {
  let fixture: ComponentFixture<GastosComponent>;
  let component: GastosComponent;
  let gastosService: jasmine.SpyObj<GastosService>;
  let parametrosService: jasmine.SpyObj<ParametrosService>;
  let alertService: jasmine.SpyObj<AlertService>;

  const parametro: Parametro = {
    id: 'par1',
    saldo_gasto: 600000,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  };

  const gastos: Gasto[] = [
    {
      id: 'g1',
      fecha: '2026-03-01',
      valor: 15000,
      concepto: 'Transporte',
      created_at: '2026-03-01T00:00:00Z',
    },
    {
      id: 'g2',
      fecha: '2026-03-10',
      valor: 42000,
      concepto: 'Mercado',
      created_at: '2026-03-10T00:00:00Z',
    },
  ];

  function manyGastos(count: number): Gasto[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `g${i + 1}`,
      fecha: `2026-03-${String((i % 28) + 1).padStart(2, '0')}`,
      valor: (i + 1) * 1000,
      concepto: `Gasto ${String(i + 1).padStart(2, '0')}`,
      created_at: `2026-03-${String((i % 28) + 1).padStart(2, '0')}T00:00:00Z`,
    }));
  }

  beforeEach(async () => {
    gastosService = jasmine.createSpyObj<GastosService>('GastosService', [
      'list',
      'create',
      'update',
      'remove',
    ]);
    gastosService.list.and.resolveTo(gastos);
    parametrosService = jasmine.createSpyObj<ParametrosService>(
      'ParametrosService',
      ['get']
    );
    parametrosService.get.and.resolveTo(parametro);
    alertService = jasmine.createSpyObj<AlertService>('AlertService', [
      'error',
      'warning',
      'confirmDelete',
    ]);
    alertService.error.and.resolveTo();
    alertService.warning.and.resolveTo();
    alertService.confirmDelete.and.resolveTo(true);

    await TestBed.configureTestingModule({
      imports: [GastosComponent],
      providers: [
        provideRouter([]),
        { provide: GastosService, useValue: gastosService },
        { provide: ParametrosService, useValue: parametrosService },
        { provide: AlertService, useValue: alertService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GastosComponent);
    component = fixture.componentInstance;
  });

  it('carga gastos al iniciar', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(gastosService.list).toHaveBeenCalled();
    expect(component.gastos().length).toBe(2);
    expect(component.loading()).toBeFalse();
  });

  it('aplica rango del 15 del mes al 15 del mes siguiente', () => {
    component.aplicarRangoPorDefecto(new Date(2026, 8, 10));
    expect(component.fechaDesde()).toBe('2026-09-15');
    expect(component.fechaHasta()).toBe('2026-10-15');
  });

  it('cruza de año cuando el mes es diciembre', () => {
    component.aplicarRangoPorDefecto(new Date(2026, 11, 22));
    expect(component.fechaDesde()).toBe('2026-12-15');
    expect(component.fechaHasta()).toBe('2027-01-15');
  });

  it('muestra conceptos en el template', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.clearFechaFilter();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Transporte');
    expect(text).toContain('Mercado');
  });

  it('gastosPagina() hace slice según pageSize', async () => {
    gastosService.list.and.resolveTo(manyGastos(12));
    fixture.detectChanges();
    await fixture.whenStable();
    component.clearFechaFilter();
    component.setPageSize(5);
    expect(component.gastosPagina().length).toBe(5);
    expect(component.from()).toBe(1);
    expect(component.to()).toBe(5);
    expect(component.totalPages()).toBe(3);
    component.goToPage(2);
    expect(component.page()).toBe(2);
    expect(component.gastosPagina()[0].concepto).toBe('Gasto 06');
  });

  it('filtra por rango de fechas y resetea página', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.goToPage(1);
    component.onFechaDesdeChange('2026-03-05');
    component.onFechaHastaChange('2026-03-15');
    expect(component.page()).toBe(1);
    expect(component.gastosFiltrados().map((g) => g.id)).toEqual(['g2']);
  });

  it('totalValor suma los gastos filtrados', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.clearFechaFilter();
    expect(component.totalValor()).toBe(57000);
    component.onFechaDesdeChange('2026-03-05');
    expect(component.totalValor()).toBe(42000);
  });

  it('saldoAFavor usa saldo_gasto de parámetros menos el total', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.clearFechaFilter();
    expect(parametrosService.get).toHaveBeenCalled();
    expect(component.saldoGasto()).toBe(600_000);
    expect(component.saldoAFavor()).toBe(600_000 - 57000);
  });

  it('clearFechaFilter() limpia el rango', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.onFechaDesdeChange('2026-03-05');
    component.clearFechaFilter();
    expect(component.fechaDesde()).toBe('');
    expect(component.fechaHasta()).toBe('');
    expect(component.gastosFiltrados().length).toBe(2);
  });

  it('saveGasto() agrega y cierra el modal', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    const created: Gasto = {
      id: 'g3',
      fecha: '2026-03-12',
      valor: 8000,
      concepto: 'Café',
      created_at: '2026-03-12T00:00:00Z',
    };
    gastosService.create.and.resolveTo(created);
    component.openAdd();
    component.formFecha = '2026-03-12';
    component.formValor = 8000;
    component.formConcepto = 'Café';
    await component.saveGasto();
    expect(gastosService.create).toHaveBeenCalledWith({
      fecha: '2026-03-12',
      valor: 8000,
      concepto: 'Café',
    });
    expect(component.gastos().some((g) => g.id === 'g3')).toBeTrue();
    expect(component.showForm()).toBeFalse();
  });

  it('saveGasto() edita campos', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    gastosService.update.and.resolveTo();
    component.openEdit(new Event('click'), gastos[0]);
    component.formConcepto = 'Taxi';
    component.formValor = 18000;
    await component.saveGasto();
    expect(gastosService.update).toHaveBeenCalledWith('g1', {
      fecha: '2026-03-01',
      valor: 18000,
      concepto: 'Taxi',
    });
    expect(component.gastos().find((g) => g.id === 'g1')?.concepto).toBe('Taxi');
  });

  it('deleteGasto() elimina tras confirmar', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    alertService.confirmDelete.and.resolveTo(true);
    gastosService.remove.and.resolveTo();
    await component.deleteGasto(new Event('click'), gastos[0]);
    expect(gastosService.remove).toHaveBeenCalledWith('g1');
    expect(component.gastos().find((g) => g.id === 'g1')).toBeUndefined();
  });

  it('deleteGasto() no elimina si se cancela', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    alertService.confirmDelete.and.resolveTo(false);
    await component.deleteGasto(new Event('click'), gastos[0]);
    expect(gastosService.remove).not.toHaveBeenCalled();
  });
});
