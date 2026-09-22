import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  ComparativoProducto,
  Mercado,
  Producto,
} from '../../models/models';
import { AlertService } from '../../services/alert.service';
import { ComparativoPrecioService } from '../../services/comparativo-precio.service';
import { MercadosService } from '../../services/mercados.service';
import { ProductosService } from '../../services/productos.service';
import { ComparativoPrecioComponent } from './comparativo-precio.component';

describe('ComparativoPrecioComponent', () => {
  let fixture: ComponentFixture<ComparativoPrecioComponent>;
  let component: ComparativoPrecioComponent;
  let comparativoService: jasmine.SpyObj<ComparativoPrecioService>;
  let productosService: jasmine.SpyObj<ProductosService>;
  let mercadosService: jasmine.SpyObj<MercadosService>;
  let alertService: jasmine.SpyObj<AlertService>;

  const productos: Producto[] = [
    { id: 'p1', nombre: 'Leche', created_at: '2026-01-01T00:00:00Z' },
    { id: 'p2', nombre: 'Arroz', created_at: '2026-01-01T00:00:00Z' },
  ];

  const mercados: Mercado[] = [
    { id: 'me1', nombre: 'Éxito', created_at: '2026-01-01T00:00:00Z' },
    { id: 'me2', nombre: 'D1', created_at: '2026-01-01T00:00:00Z' },
  ];

  const filas: ComparativoProducto[] = [
    {
      producto_id: 'p1',
      producto_nombre: 'Leche',
      precios: { me1: 3000, me2: 2800 },
    },
  ];

  beforeEach(async () => {
    comparativoService = jasmine.createSpyObj<ComparativoPrecioService>(
      'ComparativoPrecioService',
      ['listGrouped', 'saveForProducto', 'removeByProducto']
    );
    productosService = jasmine.createSpyObj<ProductosService>('ProductosService', [
      'list',
    ]);
    mercadosService = jasmine.createSpyObj<MercadosService>('MercadosService', [
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

    comparativoService.listGrouped.and.resolveTo(filas);
    productosService.list.and.resolveTo(productos);
    mercadosService.list.and.resolveTo(mercados);

    await TestBed.configureTestingModule({
      imports: [ComparativoPrecioComponent],
      providers: [
        provideRouter([]),
        { provide: ComparativoPrecioService, useValue: comparativoService },
        { provide: ProductosService, useValue: productosService },
        { provide: MercadosService, useValue: mercadosService },
        { provide: AlertService, useValue: alertService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ComparativoPrecioComponent);
    component = fixture.componentInstance;
  });

  it('carga filas, productos y mercados', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(comparativoService.listGrouped).toHaveBeenCalled();
    expect(component.filas().length).toBe(1);
    expect(component.productos().length).toBe(2);
    expect(component.mercados().length).toBe(2);
  });

  it('muestra producto y precios en la tabla', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Leche');
    expect(text).toContain('Éxito');
    expect(text).toContain('D1');
  });

  it('productosDisponibles() excluye los que ya tienen comparativo', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.productosDisponibles().map((p) => p.id)).toEqual(['p2']);
  });

  it('clasePrecio() marca barato y caro', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.clasePrecio(filas[0], 'me1')).toBe('caro');
    expect(component.clasePrecio(filas[0], 'me2')).toBe('barato');
  });

  it('clasePrecio() marca en verde el único precio mayor a cero', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    const fila: ComparativoProducto = {
      producto_id: 'p9',
      producto_nombre: 'Pan',
      precios: { me1: 0, me2: 1500 },
    };
    expect(component.clasePrecio(fila, 'me1')).toBeNull();
    expect(component.clasePrecio(fila, 'me2')).toBe('barato');
  });

  it('save() exige elegir un producto', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    await component.openAdd();
    component.selectedProductoId = '';
    await component.save();
    expect(comparativoService.saveForProducto).not.toHaveBeenCalled();
    expect(alertService.warning).toHaveBeenCalledWith(
      'Debes elegir un producto.'
    );
  });

  it('save() guarda precios por mercado', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    comparativoService.saveForProducto.and.resolveTo();
    comparativoService.listGrouped.and.resolveTo(filas);
    await component.openAdd();
    component.selectedProductoId = 'p2';
    component.preciosForm = { me1: 1500, me2: 0 };
    await component.save();
    expect(comparativoService.saveForProducto).toHaveBeenCalledWith('p2', [
      { mercado_id: 'me1', precio: 1500 },
      { mercado_id: 'me2', precio: 0 },
    ]);
    expect(component.showForm()).toBeFalse();
  });

  it('deleteFila() elimina tras confirmar', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    alertService.confirmDelete.and.resolveTo(true);
    comparativoService.removeByProducto.and.resolveTo();
    await component.deleteFila(new Event('click'), filas[0]);
    expect(comparativoService.removeByProducto).toHaveBeenCalledWith('p1');
    expect(component.filas().length).toBe(0);
  });

  it('filasPagina() hace slice según pageSize', async () => {
    const muchas: ComparativoProducto[] = Array.from({ length: 12 }, (_, i) => ({
      producto_id: `p${i}`,
      producto_nombre: `Producto ${i}`,
      precios: { me1: 1000 + i, me2: 900 + i },
    }));
    comparativoService.listGrouped.and.resolveTo(muchas);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.filasPagina().length).toBe(10);
    component.setPageSize(5);
    expect(component.pageSize()).toBe(5);
    expect(component.filasPagina().length).toBe(5);
    expect(component.totalPages()).toBe(3);
  });

  it('onSearchChange() filtra por nombre de producto', async () => {
    const varias: ComparativoProducto[] = [
      {
        producto_id: 'p1',
        producto_nombre: 'Leche',
        precios: { me1: 3000, me2: 2800 },
      },
      {
        producto_id: 'p2',
        producto_nombre: 'Arroz',
        precios: { me1: 2000, me2: 1900 },
      },
    ];
    comparativoService.listGrouped.and.resolveTo(varias);
    fixture.detectChanges();
    await fixture.whenStable();
    component.onSearchChange('arroz');
    expect(component.filasFiltradas().map((f) => f.producto_id)).toEqual([
      'p2',
    ]);
    expect(component.page()).toBe(1);
  });

  it('filtro por mercado solo muestra productos baratos en ese mercado', async () => {
    const varias: ComparativoProducto[] = [
      {
        producto_id: 'p1',
        producto_nombre: 'Leche',
        precios: { me1: 3000, me2: 2800 },
      },
      {
        producto_id: 'p2',
        producto_nombre: 'Arroz',
        precios: { me1: 1500, me2: 2000 },
      },
      {
        producto_id: 'p3',
        producto_nombre: 'Pan',
        precios: { me1: 0, me2: 1200 },
      },
    ];
    comparativoService.listGrouped.and.resolveTo(varias);
    fixture.detectChanges();
    await fixture.whenStable();
    component.onFilterMercadoChange('me1');
    expect(component.filasFiltradas().map((f) => f.producto_id)).toEqual([
      'p2',
    ]);
    component.onFilterMercadoChange('me2');
    expect(component.filasFiltradas().map((f) => f.producto_id)).toEqual([
      'p1',
      'p3',
    ]);
  });

  it('filtro por mercado sin baratos deja la lista vacía', async () => {
    const varias: ComparativoProducto[] = [
      {
        producto_id: 'p1',
        producto_nombre: 'Leche',
        precios: { me1: 3000, me2: 2800 },
      },
    ];
    comparativoService.listGrouped.and.resolveTo(varias);
    fixture.detectChanges();
    await fixture.whenStable();
    component.onFilterMercadoChange('me1');
    expect(component.filasFiltradas().length).toBe(0);
  });
});
