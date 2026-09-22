import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Market, Producto } from '../../models/models';
import { AlertService } from '../../services/alert.service';
import { MarketsService } from '../../services/markets.service';
import { ProductosService } from '../../services/productos.service';
import { ProductosComponent } from './productos.component';

describe('ProductosComponent', () => {
  let fixture: ComponentFixture<ProductosComponent>;
  let component: ProductosComponent;
  let productosService: jasmine.SpyObj<ProductosService>;
  let marketsService: jasmine.SpyObj<MarketsService>;
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
      name: 'Verduras',
      position: 1,
      created_at: '2026-01-01T00:00:00Z',
    },
  ];

  const productos: Producto[] = [
    {
      id: 'p1',
      nombre: 'Leche',
      market_id: 'm1',
      lista_nombre: 'Carnes',
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'p2',
      nombre: 'Arroz',
      market_id: 'm1',
      lista_nombre: 'Carnes',
      created_at: '2026-01-01T00:00:00Z',
    },
  ];

  function manyProductos(count: number): Producto[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `p${i + 1}`,
      nombre: `Producto ${String(i + 1).padStart(2, '0')}`,
      market_id: 'm1',
      lista_nombre: 'Carnes',
      created_at: '2026-01-01T00:00:00Z',
    }));
  }

  beforeEach(async () => {
    productosService = jasmine.createSpyObj<ProductosService>('ProductosService', [
      'list',
      'create',
      'update',
      'remove',
    ]);
    marketsService = jasmine.createSpyObj<MarketsService>('MarketsService', [
      'list',
    ]);
    alertService = jasmine.createSpyObj<AlertService>('AlertService', [
      'error',
      'warning',
      'confirmDelete',
    ]);
    alertService.error.and.resolveTo();
    alertService.warning.and.resolveTo();
    alertService.confirmDelete.and.resolveTo(true);
    productosService.list.and.resolveTo(productos);
    marketsService.list.and.resolveTo(markets);

    await TestBed.configureTestingModule({
      imports: [ProductosComponent],
      providers: [
        provideRouter([]),
        { provide: ProductosService, useValue: productosService },
        { provide: MarketsService, useValue: marketsService },
        { provide: AlertService, useValue: alertService },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);

    fixture = TestBed.createComponent(ProductosComponent);
    component = fixture.componentInstance;
  });

  it('carga productos y listas al iniciar', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(productosService.list).toHaveBeenCalled();
    expect(marketsService.list).toHaveBeenCalled();
    expect(component.productos().length).toBe(2);
    expect(component.markets().length).toBe(2);
    expect(component.loading()).toBeFalse();
  });

  it('muestra nombres en el template', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Leche');
    expect(text).toContain('Arroz');
    expect(text).toContain('Carnes');
  });

  it('productosPagina() hace slice según pageSize', async () => {
    productosService.list.and.resolveTo(manyProductos(12));
    fixture.detectChanges();
    await fixture.whenStable();
    component.setPageSize(5);
    expect(component.productosPagina().length).toBe(5);
    expect(component.from()).toBe(1);
    expect(component.to()).toBe(5);
    expect(component.totalPages()).toBe(3);
    component.nextPage();
    expect(component.page()).toBe(2);
    expect(component.productosPagina()[0].nombre).toBe('Producto 06');
  });

  it('setPageSize() vuelve a la página 1', async () => {
    productosService.list.and.resolveTo(manyProductos(20));
    fixture.detectChanges();
    await fixture.whenStable();
    component.goToPage(2);
    component.setPageSize(25);
    expect(component.page()).toBe(1);
    expect(component.pageSize()).toBe(25);
  });

  it('onSearchChange() filtra por nombre y reinicia página', async () => {
    productosService.list.and.resolveTo([
      ...productos,
      {
        id: 'p3',
        nombre: 'Pan',
        market_id: 'm2',
        lista_nombre: 'Verduras',
        created_at: '2026-01-01T00:00:00Z',
      },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();
    component.onSearchChange('pan');
    expect(component.page()).toBe(1);
    expect(component.productosFiltrados().map((p) => p.nombre)).toEqual(['Pan']);
  });

  it('onFilterListaChange() filtra por lista', async () => {
    productosService.list.and.resolveTo([
      ...productos,
      {
        id: 'p3',
        nombre: 'Pan',
        market_id: 'm2',
        lista_nombre: 'Verduras',
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'p4',
        nombre: 'Sin lista',
        market_id: null,
        lista_nombre: '',
        created_at: '2026-01-01T00:00:00Z',
      },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();
    component.onFilterListaChange('m2');
    expect(component.productosFiltrados().map((p) => p.id)).toEqual(['p3']);
    component.onFilterListaChange('__none__');
    expect(component.productosFiltrados().map((p) => p.id)).toEqual(['p4']);
  });

  it('saveProducto() exige lista', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.openAdd();
    component.formName = 'Pan';
    component.formMarketId = '';
    await component.saveProducto();
    expect(productosService.create).not.toHaveBeenCalled();
    expect(alertService.warning).toHaveBeenCalledWith('Debes elegir una lista.');
  });

  it('saveProducto() agrega con lista y cierra el modal', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    const created: Producto = {
      id: 'p3',
      nombre: 'Pan',
      market_id: 'm1',
      lista_nombre: 'Carnes',
      created_at: '2026-01-02T00:00:00Z',
    };
    productosService.create.and.resolveTo(created);
    component.openAdd();
    component.formName = 'Pan';
    component.formMarketId = 'm1';
    await component.saveProducto();
    expect(productosService.create).toHaveBeenCalledWith('Pan', 'm1');
    expect(component.productos().some((p) => p.id === 'p3')).toBeTrue();
    expect(component.showForm()).toBeFalse();
  });

  it('saveProducto() no crea si el nombre ya existe', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.openAdd();
    component.formName = ' leche ';
    component.formMarketId = 'm1';
    await component.saveProducto();
    expect(productosService.create).not.toHaveBeenCalled();
    expect(alertService.warning).toHaveBeenCalledWith(
      'Ese producto ya existe en la lista.'
    );
  });

  it('saveProducto() edita nombre y lista', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    productosService.update.and.resolveTo();
    component.openEdit(new Event('click'), productos[0]);
    component.formName = 'Leche entera';
    component.formMarketId = 'm2';
    await component.saveProducto();
    expect(productosService.update).toHaveBeenCalledWith(
      'p1',
      'Leche entera',
      'm2'
    );
    expect(component.productos().find((p) => p.id === 'p1')?.lista_nombre).toBe(
      'Verduras'
    );
  });

  it('deleteProducto() elimina tras confirmar', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    alertService.confirmDelete.and.resolveTo(true);
    productosService.remove.and.resolveTo();
    await component.deleteProducto(new Event('click'), productos[0]);
    expect(productosService.remove).toHaveBeenCalledWith('p1');
    expect(component.productos().find((p) => p.id === 'p1')).toBeUndefined();
  });

  it('deleteProducto() no elimina si se cancela', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    alertService.confirmDelete.and.resolveTo(false);
    await component.deleteProducto(new Event('click'), productos[0]);
    expect(productosService.remove).not.toHaveBeenCalled();
  });

  it('goComparativo() navega a /comparativo-precio', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.showMenu.set(true);
    component.goComparativo();
    expect(router.navigate).toHaveBeenCalledWith(['/comparativo-precio']);
    expect(component.showMenu()).toBeFalse();
  });
});
