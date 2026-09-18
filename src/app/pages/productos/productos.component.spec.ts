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
