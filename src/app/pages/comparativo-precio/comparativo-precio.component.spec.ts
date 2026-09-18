import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  ComparativoProducto,
  Mercado,
  Producto,
} from '../../models/models';
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

  it('clasePrecio() ignora ceros', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    const fila: ComparativoProducto = {
      producto_id: 'p9',
      producto_nombre: 'Pan',
      precios: { me1: 0, me2: 1500 },
    };
    expect(component.clasePrecio(fila, 'me1')).toBeNull();
    expect(component.clasePrecio(fila, 'me2')).toBeNull();
  });

  it('save() exige elegir un producto', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.openAdd();
    component.selectedProductoId = '';
    await component.save();
    expect(comparativoService.saveForProducto).not.toHaveBeenCalled();
    expect(component.error()).toBe('Debes elegir un producto.');
  });

  it('save() guarda precios por mercado', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    comparativoService.saveForProducto.and.resolveTo();
    comparativoService.listGrouped.and.resolveTo(filas);
    component.openAdd();
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
    spyOn(window, 'confirm').and.returnValue(true);
    comparativoService.removeByProducto.and.resolveTo();
    await component.deleteFila(new Event('click'), filas[0]);
    expect(comparativoService.removeByProducto).toHaveBeenCalledWith('p1');
    expect(component.filas().length).toBe(0);
  });
});
