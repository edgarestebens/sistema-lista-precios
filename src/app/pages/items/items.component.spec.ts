import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { Item, Market, PrecioMasBarato, Producto } from '../../models/models';
import { AlertService } from '../../services/alert.service';
import { ComparativoPrecioService } from '../../services/comparativo-precio.service';
import { ItemsService } from '../../services/items.service';
import { MarketsService } from '../../services/markets.service';
import { ProductosService } from '../../services/productos.service';
import { ItemsComponent } from './items.component';

describe('ItemsComponent', () => {
  let fixture: ComponentFixture<ItemsComponent>;
  let component: ItemsComponent;
  let itemsService: jasmine.SpyObj<ItemsService>;
  let marketsService: jasmine.SpyObj<MarketsService>;
  let productosService: jasmine.SpyObj<ProductosService>;
  let comparativoService: jasmine.SpyObj<ComparativoPrecioService>;
  let alertService: jasmine.SpyObj<AlertService>;
  let router: Router;

  const market: Market = {
    id: 'm1',
    name: 'Mercado',
    position: 0,
    created_at: '2026-01-01T00:00:00Z',
  };

  const productos: Producto[] = [
    {
      id: 'p1',
      nombre: 'Leche',
      market_id: 'm1',
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'p2',
      nombre: 'Arroz',
      market_id: 'm1',
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'p3',
      nombre: 'Pan',
      market_id: 'm1',
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'p4',
      nombre: 'Tomate',
      market_id: 'm2',
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'p5',
      nombre: 'Sin lista',
      market_id: null,
      created_at: '2026-01-01T00:00:00Z',
    },
  ];

  const preciosBaratos: Record<string, PrecioMasBarato> = {
    p1: { producto_id: 'p1', precio: 2800, mercado_nombre: 'D1' },
  };

  const items: Item[] = [
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

  beforeEach(async () => {
    itemsService = jasmine.createSpyObj<ItemsService>('ItemsService', [
      'listByMarket',
      'create',
      'remove',
      'toggleChecked',
      'reorder',
    ]);
    marketsService = jasmine.createSpyObj<MarketsService>('MarketsService', [
      'getById',
    ]);
    productosService = jasmine.createSpyObj<ProductosService>('ProductosService', [
      'list',
      'update',
    ]);
    comparativoService = jasmine.createSpyObj<ComparativoPrecioService>(
      'ComparativoPrecioService',
      ['mapPrecioMasBarato']
    );
    alertService = jasmine.createSpyObj<AlertService>('AlertService', [
      'error',
      'warning',
      'confirmDelete',
    ]);
    alertService.error.and.resolveTo();
    alertService.warning.and.resolveTo();
    alertService.confirmDelete.and.resolveTo(true);

    marketsService.getById.and.resolveTo(market);
    itemsService.listByMarket.and.resolveTo(items);
    productosService.list.and.resolveTo(productos);
    comparativoService.mapPrecioMasBarato.and.resolveTo(preciosBaratos);

    await TestBed.configureTestingModule({
      imports: [ItemsComponent],
      providers: [
        provideRouter([]),
        { provide: ItemsService, useValue: itemsService },
        { provide: MarketsService, useValue: marketsService },
        { provide: ProductosService, useValue: productosService },
        { provide: ComparativoPrecioService, useValue: comparativoService },
        { provide: AlertService, useValue: alertService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ id: 'm1' }) },
          },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);

    fixture = TestBed.createComponent(ItemsComponent);
    component = fixture.componentInstance;
  });

  it('carga mercado, ítems y productos al iniciar', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(marketsService.getById).toHaveBeenCalledWith('m1');
    expect(itemsService.listByMarket).toHaveBeenCalledWith('m1');
    expect(productosService.list).toHaveBeenCalled();
    expect(component.market()?.name).toBe('Mercado');
    expect(component.items().length).toBe(2);
    expect(component.productos().length).toBe(5);
  });

  it('renderiza ítems y título', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Mercado');
    expect(text).toContain('Leche');
    expect(text).toContain('Arroz');
    expect(text).toContain('D1');
    expect(text).toContain('2.800');
  });

  it('precioBaratoTexto() queda vacío sin comparativo', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.precioBaratoTexto(items[1])).toBe('');
    expect(component.precioBaratoTexto(items[0])).toContain('D1');
  });

  it('addItem() agrega con producto_id y limpia el select', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    const created: Item = {
      id: 'i3',
      market_id: 'm1',
      producto_id: 'p3',
      nombre: 'Pan',
      is_checked: false,
      position: 2,
      created_at: '2026-01-02T00:00:00Z',
    };
    itemsService.create.and.resolveTo(created);
    itemsService.reorder.and.resolveTo();
    component.selectedProductoId = 'p3';
    await component.addItem();
    expect(itemsService.create).toHaveBeenCalledWith('m1', 'p3');
    expect(component.items().some((i) => i.id === 'i3')).toBeTrue();
    expect(component.selectedProductoId).toBe('');
    expect(itemsService.reorder).toHaveBeenCalled();
  });

  it('toggle() tacha el ítem y lo manda al final', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    itemsService.toggleChecked.and.resolveTo();
    itemsService.reorder.and.resolveTo();
    await component.toggle(items[0]);
    expect(itemsService.toggleChecked).toHaveBeenCalledWith('i1', true);
    const list = component.items();
    expect(list[list.length - 1].id).toBe('i1');
    expect(list[list.length - 1].is_checked).toBeTrue();
    expect(itemsService.reorder).toHaveBeenCalled();
  });

  it('toggle() destacha y lo deja antes de los tachados', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    itemsService.toggleChecked.and.resolveTo();
    itemsService.reorder.and.resolveTo();
    await component.toggle(items[1]);
    const list = component.items();
    expect(list.find((i) => i.id === 'i2')?.is_checked).toBeFalse();
    expect(list[list.length - 1].is_checked).toBeFalse();
  });

  it('deleteItem() quita el ítem de la lista', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    alertService.confirmDelete.and.resolveTo(true);
    itemsService.remove.and.resolveTo();
    await component.deleteItem(new Event('click'), items[0]);
    expect(alertService.confirmDelete).toHaveBeenCalled();
    expect(itemsService.remove).toHaveBeenCalledWith('i1');
    expect(component.items().find((i) => i.id === 'i1')).toBeUndefined();
  });

  it('deleteItem() no elimina si se cancela', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    alertService.confirmDelete.and.resolveTo(false);
    await component.deleteItem(new Event('click'), items[0]);
    expect(itemsService.remove).not.toHaveBeenCalled();
  });

  it('saveProductoNombre() edita el nombre del producto', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    productosService.update.and.resolveTo();
    component.openEdit(new Event('click'), items[0]);
    component.formName = 'Leche entera';
    await component.saveProductoNombre();
    expect(productosService.update).toHaveBeenCalledWith('p1', 'Leche entera', 'm1');
    expect(component.items().find((i) => i.id === 'i1')?.nombre).toBe(
      'Leche entera'
    );
    expect(component.productos().find((p) => p.id === 'p1')?.nombre).toBe(
      'Leche entera'
    );
    expect(component.showForm()).toBeFalse();
  });

  it('saveProductoNombre() no renombra a un nombre ya usado', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.openEdit(new Event('click'), items[0]);
    component.formName = 'Arroz';
    await component.saveProductoNombre();
    expect(productosService.update).not.toHaveBeenCalled();
    expect(alertService.warning).toHaveBeenCalledWith(
      'Ese producto ya existe en la lista.'
    );
  });

  it('drop() reordena ítems', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    itemsService.reorder.and.resolveTo();
    await component.drop({
      previousIndex: 0,
      currentIndex: 1,
    } as never);
    expect(component.items()[0].id).toBe('i2');
    expect(component.items()[1].id).toBe('i1');
    expect(itemsService.reorder).toHaveBeenCalled();
  });

  it('toggleAll() marca todos y manda pendientes al final', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    itemsService.toggleChecked.and.resolveTo();
    itemsService.reorder.and.resolveTo();
    expect(component.allChecked()).toBeFalse();
    await component.toggleAll();
    expect(component.allChecked()).toBeTrue();
    expect(component.items().every((i) => i.is_checked)).toBeTrue();
    expect(itemsService.reorder).toHaveBeenCalled();
  });

  it('toggleAll() destacha todos si ya estaban marcados', async () => {
    itemsService.listByMarket.and.resolveTo(
      items.map((i) => ({ ...i, is_checked: true }))
    );
    fixture.detectChanges();
    await fixture.whenStable();
    itemsService.toggleChecked.and.resolveTo();
    itemsService.reorder.and.resolveTo();
    expect(component.allChecked()).toBeTrue();
    await component.toggleAll();
    expect(component.allChecked()).toBeFalse();
    expect(component.items().every((i) => !i.is_checked)).toBeTrue();
  });

  it('redirige a / si el mercado no existe', async () => {
    marketsService.getById.and.resolveTo(null);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('goProductos() navega a /productos', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.showMenu.set(true);
    component.goProductos();
    expect(router.navigate).toHaveBeenCalledWith(['/productos']);
    expect(component.showMenu()).toBeFalse();
  });

  it('productosDisponibles() filtra por lista y oculta ya agregados', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.productosDisponibles().map((p) => p.id)).toEqual(['p3']);
  });

  it('muestra Seleccionar todo en el template', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Seleccionar todo');
  });

  it('sortAlphabetically() ordena pendientes A-Z y tachados al final', async () => {
    itemsService.listByMarket.and.resolveTo([
      {
        id: 'i1',
        market_id: 'm1',
        producto_id: 'p1',
        nombre: 'Zapallo',
        is_checked: false,
        position: 0,
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'i2',
        market_id: 'm1',
        producto_id: 'p2',
        nombre: 'Arroz',
        is_checked: false,
        position: 1,
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'i3',
        market_id: 'm1',
        producto_id: 'p3',
        nombre: 'Leche',
        is_checked: true,
        position: 2,
        created_at: '2026-01-01T00:00:00Z',
      },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();
    itemsService.reorder.and.resolveTo();
    await component.sortAlphabetically('asc');
    expect(component.items().map((i) => i.nombre)).toEqual([
      'Arroz',
      'Zapallo',
      'Leche',
    ]);
    expect(itemsService.reorder).toHaveBeenCalled();
  });
});
