import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Gasto, Parametro } from '../../models/models';
import { ConnectivityService } from '../../offline/connectivity.service';
import { AlertService } from '../../services/alert.service';
import { GastosService } from '../../services/gastos.service';
import { ParametrosService } from '../../services/parametros.service';
import { GraficosGastosComponent } from './graficos-gastos.component';

describe('GraficosGastosComponent', () => {
  let fixture: ComponentFixture<GraficosGastosComponent>;
  let component: GraficosGastosComponent;
  let gastosService: jasmine.SpyObj<GastosService>;
  let parametrosService: jasmine.SpyObj<ParametrosService>;
  let alertService: jasmine.SpyObj<AlertService>;

  const gastos: Gasto[] = [
    {
      id: 'g1',
      fecha: '2026-09-16',
      valor: 15000,
      concepto: 'Transporte',
      created_at: '2026-09-16T00:00:00Z',
    },
    {
      id: 'g2',
      fecha: '2026-09-16',
      valor: 5000,
      concepto: 'Café',
      created_at: '2026-09-16T01:00:00Z',
    },
    {
      id: 'g3',
      fecha: '2026-09-20',
      valor: 42000,
      concepto: 'Mercado',
      created_at: '2026-09-20T00:00:00Z',
    },
    {
      id: 'g4',
      fecha: '2026-08-01',
      valor: 10000,
      concepto: 'Fuera de rango',
      created_at: '2026-08-01T00:00:00Z',
    },
  ];

  const parametro: Parametro = {
    id: 'par1',
    saldo_gasto: 600000,
    created_at: '2026-09-01T00:00:00Z',
   updated_at: '2026-09-01T00:00:00Z',
  };

  beforeEach(async () => {
    gastosService = jasmine.createSpyObj<GastosService>('GastosService', [
      'list',
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
      'success',
    ]);
    alertService.error.and.resolveTo();

    await TestBed.configureTestingModule({
      imports: [GraficosGastosComponent],
      providers: [
        provideRouter([]),
        { provide: GastosService, useValue: gastosService },
        { provide: ParametrosService, useValue: parametrosService },
        { provide: AlertService, useValue: alertService },
        {
          provide: ConnectivityService,
          useValue: { isOnline: () => true, online: () => true },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GraficosGastosComponent);
    component = fixture.componentInstance;
  });

  it('carga gastos y saldo al iniciar', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(gastosService.list).toHaveBeenCalled();
    expect(parametrosService.get).toHaveBeenCalled();
    expect(component.gastos().length).toBe(4);
    expect(component.saldoGasto()).toBe(600000);
    expect(component.loading()).toBeFalse();
  });

  it('aplica rango del 15 del mes al 15 del mes siguiente', () => {
    component.aplicarRangoPorDefecto(new Date(2026, 8, 22));
    expect(component.fechaDesde()).toBe('2026-09-15');
    expect(component.fechaHasta()).toBe('2026-10-15');
  });

  it('agrega por día en el rango filtrado', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.fechaDesde.set('2026-09-15');
    component.fechaHasta.set('2026-10-15');
    expect(component.porDia()).toEqual([
      { fecha: '2026-09-16', total: 20000 },
      { fecha: '2026-09-20', total: 42000 },
    ]);
    expect(component.totalValor()).toBe(62000);
  });

  it('agrega por concepto ordenado por valor', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.fechaDesde.set('2026-09-15');
    component.fechaHasta.set('2026-10-15');
    expect(component.porConcepto().map((c) => c.concepto)).toEqual([
      'Mercado',
      'Transporte',
      'Café',
    ]);
  });

  it('saldoData muestra gastado y disponible', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.fechaDesde.set('2026-09-15');
    component.fechaHasta.set('2026-10-15');
    const data = component.saldoData();
    expect(data.labels).toEqual(['Gastado', 'Disponible']);
    expect(data.datasets[0].data).toEqual([62000, 538000]);
  });

  it('clearFechaFilter limpia el rango', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.clearFechaFilter();
    expect(component.fechaDesde()).toBe('');
    expect(component.fechaHasta()).toBe('');
    expect(component.gastosFiltrados().length).toBe(4);
  });
});
