import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Producto } from '../../models/models';
import { ProductosService } from '../../services/productos.service';
import { ProductosComponent } from './productos.component';

describe('ProductosComponent', () => {
  let fixture: ComponentFixture<ProductosComponent>;
  let component: ProductosComponent;
  let productosService: jasmine.SpyObj<ProductosService>;
  let router: Router;

  const productos: Producto[] = [
    {
      id: 'p1',
      nombre: 'Leche',
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'p2',
      nombre: 'Arroz',
      created_at: '2026-01-01T00:00:00Z',
    },
  ];

  function manyProductos(count: number): Producto[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `p${i + 1}`,
      nombre: `Producto ${String(i + 1).padStart(2, '0')}`,
      created_at: '2026-01-01T00:00:00Z',
    }));
  }

  beforeEach(async () => {
    productosService = jasmine.createSpyObj<ProductosService>('ProductosService', [
      'list',
      'create',
      'rename',
      'remove',
    ]);
    productosService.list.and.resolveTo(productos);

    await TestBed.configureTestingModule({
      imports: [ProductosComponent],
      providers: [
        provideRouter([]),
        { provide: ProductosService, useValue: productosService },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);

    fixture = TestBed.createComponent(ProductosComponent);
    component = fixture.componentInstance;
  });

  it('carga productos al iniciar', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(productosService.list).toHaveBeenCalled();
    expect(component.productos().length).toBe(2);
    expect(component.loading()).toBeFalse();
  });

  it('muestra nombres en el template', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Leche');
    expect(text).toContain('Arroz');
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
    expect(component.from()).toBe(6);
    expect(component.to()).toBe(10);
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
      { id: 'p3', nombre: 'Pan', created_at: '2026-01-01T00:00:00Z' },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();
    component.goToPage(1);
    component.onSearchChange('pan');
    expect(component.page()).toBe(1);
    expect(component.productosFiltrados().map((p) => p.nombre)).toEqual(['Pan']);
    expect(component.productosPagina().length).toBe(1);
  });

  it('al borrar el último de una página retrocede', async () => {
    const list = manyProductos(6);
    productosService.list.and.resolveTo(list);
    fixture.detectChanges();
    await fixture.whenStable();
    component.setPageSize(5);
    component.goToPage(2);
    expect(component.productosPagina().length).toBe(1);
    spyOn(window, 'confirm').and.returnValue(true);
    productosService.remove.and.resolveTo();
    await component.deleteProducto(new Event('click'), list[5]);
    expect(component.productos().length).toBe(5);
    expect(component.page()).toBe(1);
    expect(component.totalPages()).toBe(1);
  });

  it('saveProducto() agrega y cierra el modal', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    const created: Producto = {
      id: 'p3',
      nombre: 'Pan',
      created_at: '2026-01-02T00:00:00Z',
    };
    productosService.create.and.resolveTo(created);
    component.openAdd();
    component.formName = 'Pan';
    await component.saveProducto();
    expect(productosService.create).toHaveBeenCalledWith('Pan');
    expect(component.productos().some((p) => p.id === 'p3')).toBeTrue();
    expect(component.showForm()).toBeFalse();
  });

  it('saveProducto() no crea si el nombre ya existe', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.openAdd();
    component.formName = ' leche ';
    await component.saveProducto();
    expect(productosService.create).not.toHaveBeenCalled();
    expect(component.error()).toBe('Ese producto ya existe en la lista.');
    expect(component.showForm()).toBeTrue();
  });

  it('saveProducto() no renombra a un nombre ya usado', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.openEdit(new Event('click'), productos[0]);
    component.formName = 'Arroz';
    await component.saveProducto();
    expect(productosService.rename).not.toHaveBeenCalled();
    expect(component.error()).toBe('Ese producto ya existe en la lista.');
  });

  it('saveProducto() edita el nombre', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    productosService.rename.and.resolveTo();
    component.openEdit(new Event('click'), productos[0]);
    component.formName = 'Leche entera';
    await component.saveProducto();
    expect(productosService.rename).toHaveBeenCalledWith('p1', 'Leche entera');
    expect(component.productos().find((p) => p.id === 'p1')?.nombre).toBe(
      'Leche entera'
    );
  });

  it('deleteProducto() elimina tras confirmar', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    spyOn(window, 'confirm').and.returnValue(true);
    productosService.remove.and.resolveTo();
    await component.deleteProducto(new Event('click'), productos[0]);
    expect(productosService.remove).toHaveBeenCalledWith('p1');
    expect(component.productos().find((p) => p.id === 'p1')).toBeUndefined();
  });

  it('deleteProducto() no elimina si se cancela', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    spyOn(window, 'confirm').and.returnValue(false);
    await component.deleteProducto(new Event('click'), productos[0]);
    expect(productosService.remove).not.toHaveBeenCalled();
  });
});
