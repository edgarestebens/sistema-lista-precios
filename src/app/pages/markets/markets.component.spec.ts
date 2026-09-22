import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Market } from '../../models/models';
import { AlertService } from '../../services/alert.service';
import { AuthService } from '../../services/auth.service';
import { MarketsService } from '../../services/markets.service';
import { MarketsComponent } from './markets.component';

describe('MarketsComponent', () => {
  let fixture: ComponentFixture<MarketsComponent>;
  let component: MarketsComponent;
  let marketsService: jasmine.SpyObj<MarketsService>;
  let authService: jasmine.SpyObj<AuthService>;
  let alertService: jasmine.SpyObj<AlertService>;
  let router: Router;

  const markets: Market[] = [
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

  beforeEach(async () => {
    marketsService = jasmine.createSpyObj<MarketsService>('MarketsService', [
      'list',
      'create',
      'rename',
      'remove',
      'reorder',
    ]);
    marketsService.list.and.resolveTo(markets);
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['signOut']);
    alertService = jasmine.createSpyObj<AlertService>('AlertService', [
      'error',
      'warning',
      'confirmDelete',
    ]);
    alertService.error.and.resolveTo();
    alertService.warning.and.resolveTo();
    alertService.confirmDelete.and.resolveTo(true);

    await TestBed.configureTestingModule({
      imports: [MarketsComponent],
      providers: [
        provideRouter([]),
        { provide: MarketsService, useValue: marketsService },
        { provide: AuthService, useValue: authService },
        { provide: AlertService, useValue: alertService },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);

    fixture = TestBed.createComponent(MarketsComponent);
    component = fixture.componentInstance;
  });

  it('carga mercados al iniciar', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(marketsService.list).toHaveBeenCalled();
    expect(component.markets().length).toBe(2);
    expect(component.loading()).toBeFalse();
  });

  it('muestra nombres en el template', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Carnes');
    expect(text).toContain('Mercado');
  });

  it('saveMarket() ignora nombre vacío', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.openAdd();
    component.formName = '   ';
    await component.saveMarket();
    expect(marketsService.create).not.toHaveBeenCalled();
  });

  it('saveMarket() agrega y cierra el modal', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    const created: Market = {
      id: 'm3',
      name: 'Frutas',
      position: 2,
      created_at: '2026-01-02T00:00:00Z',
    };
    marketsService.create.and.resolveTo(created);
    component.openAdd();
    component.formName = 'Frutas';
    await component.saveMarket();
    expect(marketsService.create).toHaveBeenCalledWith('Frutas');
    expect(component.markets().some((m) => m.id === 'm3')).toBeTrue();
    expect(component.showForm()).toBeFalse();
  });

  it('saveMarket() edita el nombre', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    marketsService.rename.and.resolveTo();
    component.openEdit(new Event('click'), markets[0]);
    component.formName = 'Carnes frescas';
    await component.saveMarket();
    expect(marketsService.rename).toHaveBeenCalledWith('m1', 'Carnes frescas');
    expect(component.markets().find((m) => m.id === 'm1')?.name).toBe(
      'Carnes frescas'
    );
  });

  it('deleteMarket() elimina tras confirmar', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    alertService.confirmDelete.and.resolveTo(true);
    marketsService.remove.and.resolveTo();
    const event = new Event('click');
    await component.deleteMarket(event, markets[0]);
    expect(marketsService.remove).toHaveBeenCalledWith('m1');
    expect(component.markets().find((m) => m.id === 'm1')).toBeUndefined();
  });

  it('deleteMarket() no elimina si se cancela', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    alertService.confirmDelete.and.resolveTo(false);
    await component.deleteMarket(new Event('click'), markets[0]);
    expect(marketsService.remove).not.toHaveBeenCalled();
  });

  it('openMarket() navega al detalle', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.openMarket(markets[0]);
    expect(router.navigate).toHaveBeenCalledWith(['/mercados', 'm1']);
  });

  it('drop() reordena y persiste', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    marketsService.reorder.and.resolveTo();
    await component.drop({
      previousIndex: 0,
      currentIndex: 1,
    } as never);
    expect(component.markets()[0].id).toBe('m2');
    expect(component.markets()[1].id).toBe('m1');
    expect(marketsService.reorder).toHaveBeenCalled();
  });

  it('goProductos() navega a /productos', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.goProductos();
    expect(router.navigate).toHaveBeenCalledWith(['/productos']);
    expect(component.showMenu()).toBeFalse();
  });

  it('goMercados() navega a /mercados', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.goMercados();
    expect(router.navigate).toHaveBeenCalledWith(['/mercados']);
    expect(component.showMenu()).toBeFalse();
  });

  it('goComparativo() navega a /comparativo-precio', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.goComparativo();
    expect(router.navigate).toHaveBeenCalledWith(['/comparativo-precio']);
    expect(component.showMenu()).toBeFalse();
  });

  it('goParametros() navega a /parametros', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.goParametros();
    expect(router.navigate).toHaveBeenCalledWith(['/parametros']);
    expect(component.showMenu()).toBeFalse();
  });

  it('muestra error si list falla', async () => {
    marketsService.list.and.rejectWith(new Error('sin red'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(alertService.error).toHaveBeenCalled();
  });
});
