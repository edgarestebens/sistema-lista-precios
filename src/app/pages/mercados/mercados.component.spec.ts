import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Mercado } from '../../models/models';
import { MercadosService } from '../../services/mercados.service';
import { MercadosComponent } from './mercados.component';

describe('MercadosComponent', () => {
  let fixture: ComponentFixture<MercadosComponent>;
  let component: MercadosComponent;
  let mercadosService: jasmine.SpyObj<MercadosService>;
  let router: Router;

  const mercados: Mercado[] = [
    {
      id: 'm1',
      nombre: 'Éxito',
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'm2',
      nombre: 'D1',
      created_at: '2026-01-01T00:00:00Z',
    },
  ];

  beforeEach(async () => {
    mercadosService = jasmine.createSpyObj<MercadosService>('MercadosService', [
      'list',
      'create',
      'rename',
      'remove',
    ]);
    mercadosService.list.and.resolveTo(mercados);

    await TestBed.configureTestingModule({
      imports: [MercadosComponent],
      providers: [
        provideRouter([]),
        { provide: MercadosService, useValue: mercadosService },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);

    fixture = TestBed.createComponent(MercadosComponent);
    component = fixture.componentInstance;
  });

  it('carga mercados al iniciar', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(mercadosService.list).toHaveBeenCalled();
    expect(component.mercados().length).toBe(2);
    expect(component.loading()).toBeFalse();
  });

  it('muestra nombres en el template', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Éxito');
    expect(text).toContain('D1');
  });

  it('saveMercado() agrega y cierra el modal', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    const created: Mercado = {
      id: 'm3',
      nombre: 'Jumbo',
      created_at: '2026-01-02T00:00:00Z',
    };
    mercadosService.create.and.resolveTo(created);
    component.openAdd();
    component.formName = 'Jumbo';
    await component.saveMercado();
    expect(mercadosService.create).toHaveBeenCalledWith('Jumbo');
    expect(component.mercados().some((m) => m.id === 'm3')).toBeTrue();
    expect(component.showForm()).toBeFalse();
  });

  it('saveMercado() no crea si el nombre ya existe', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.openAdd();
    component.formName = ' éxito ';
    await component.saveMercado();
    expect(mercadosService.create).not.toHaveBeenCalled();
    expect(component.error()).toBe('Ese mercado ya existe en la lista.');
    expect(component.showForm()).toBeTrue();
  });

  it('saveMercado() no renombra a un nombre ya usado', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.openEdit(new Event('click'), mercados[0]);
    component.formName = 'D1';
    await component.saveMercado();
    expect(mercadosService.rename).not.toHaveBeenCalled();
    expect(component.error()).toBe('Ese mercado ya existe en la lista.');
  });

  it('saveMercado() edita el nombre', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    mercadosService.rename.and.resolveTo();
    component.openEdit(new Event('click'), mercados[0]);
    component.formName = 'Éxito Express';
    await component.saveMercado();
    expect(mercadosService.rename).toHaveBeenCalledWith('m1', 'Éxito Express');
    expect(component.mercados().find((m) => m.id === 'm1')?.nombre).toBe(
      'Éxito Express'
    );
  });

  it('deleteMercado() elimina tras confirmar', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    spyOn(window, 'confirm').and.returnValue(true);
    mercadosService.remove.and.resolveTo();
    await component.deleteMercado(new Event('click'), mercados[0]);
    expect(mercadosService.remove).toHaveBeenCalledWith('m1');
    expect(component.mercados().find((m) => m.id === 'm1')).toBeUndefined();
  });

  it('deleteMercado() no elimina si se cancela', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    spyOn(window, 'confirm').and.returnValue(false);
    await component.deleteMercado(new Event('click'), mercados[0]);
    expect(mercadosService.remove).not.toHaveBeenCalled();
  });
});
