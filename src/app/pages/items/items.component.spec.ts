import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { Item, Market } from '../../models/models';
import { ItemsService } from '../../services/items.service';
import { MarketsService } from '../../services/markets.service';
import { ItemsComponent } from './items.component';

describe('ItemsComponent', () => {
  let fixture: ComponentFixture<ItemsComponent>;
  let component: ItemsComponent;
  let itemsService: jasmine.SpyObj<ItemsService>;
  let marketsService: jasmine.SpyObj<MarketsService>;
  let router: Router;

  const market: Market = {
    id: 'm1',
    name: 'Mercado',
    position: 0,
    created_at: '2026-01-01T00:00:00Z',
  };

  const items: Item[] = [
    {
      id: 'i1',
      market_id: 'm1',
      name: 'Leche',
      is_checked: false,
      position: 0,
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'i2',
      market_id: 'm1',
      name: 'Arroz',
      is_checked: true,
      position: 1,
      created_at: '2026-01-01T00:00:00Z',
    },
  ];

  beforeEach(async () => {
    itemsService = jasmine.createSpyObj<ItemsService>('ItemsService', [
      'listByMarket',
      'create',
      'rename',
      'remove',
      'toggleChecked',
      'reorder',
    ]);
    marketsService = jasmine.createSpyObj<MarketsService>('MarketsService', [
      'getById',
    ]);

    marketsService.getById.and.resolveTo(market);
    itemsService.listByMarket.and.resolveTo(items);

    await TestBed.configureTestingModule({
      imports: [ItemsComponent],
      providers: [
        provideRouter([]),
        { provide: ItemsService, useValue: itemsService },
        { provide: MarketsService, useValue: marketsService },
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

  it('carga mercado e ítems al iniciar', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(marketsService.getById).toHaveBeenCalledWith('m1');
    expect(itemsService.listByMarket).toHaveBeenCalledWith('m1');
    expect(component.market()?.name).toBe('Mercado');
    expect(component.items().length).toBe(2);
  });

  it('renderiza ítems y título', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Mercado');
    expect(text).toContain('Leche');
    expect(text).toContain('Arroz');
  });

  it('addItem() agrega y limpia el input', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    const created: Item = {
      id: 'i3',
      market_id: 'm1',
      name: 'Pan',
      is_checked: false,
      position: 2,
      created_at: '2026-01-02T00:00:00Z',
    };
    itemsService.create.and.resolveTo(created);
    itemsService.reorder.and.resolveTo();
    component.newName = 'Pan';
    await component.addItem();
    expect(itemsService.create).toHaveBeenCalledWith('m1', 'Pan');
    expect(component.items().some((i) => i.id === 'i3')).toBeTrue();
    expect(component.newName).toBe('');
    expect(itemsService.reorder).toHaveBeenCalled();
  });

  it('toggle() tacha el ítem y lo manda al final', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    itemsService.toggleChecked.and.resolveTo();
    itemsService.reorder.and.resolveTo();
    // Lista inicial: Leche (pending), Arroz (ya checked)
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
    await component.toggle(items[1]); // Arroz estaba checked
    const list = component.items();
    expect(list.find((i) => i.id === 'i2')?.is_checked).toBeFalse();
    expect(list[list.length - 1].is_checked).toBeFalse();
  });

  it('deleteItem() quita el ítem de la lista', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    itemsService.remove.and.resolveTo();
    await component.deleteItem(new Event('click'), items[0]);
    expect(itemsService.remove).toHaveBeenCalledWith('i1');
    expect(component.items().find((i) => i.id === 'i1')).toBeUndefined();
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

  it('saveEdit() renombra el ítem', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    itemsService.rename.and.resolveTo();
    component.openEdit(new Event('click'), items[0]);
    component.editName = 'Leche entera';
    await component.saveEdit();
    expect(itemsService.rename).toHaveBeenCalledWith('i1', 'Leche entera');
    expect(component.items().find((i) => i.id === 'i1')?.name).toBe(
      'Leche entera'
    );
    expect(component.showEdit()).toBeFalse();
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
        name: 'Zapallo',
        is_checked: false,
        position: 0,
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'i2',
        market_id: 'm1',
        name: 'Arroz',
        is_checked: false,
        position: 1,
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'i3',
        market_id: 'm1',
        name: 'Leche',
        is_checked: true,
        position: 2,
        created_at: '2026-01-01T00:00:00Z',
      },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();
    itemsService.reorder.and.resolveTo();
    await component.sortAlphabetically('asc');
    expect(component.items().map((i) => i.name)).toEqual([
      'Arroz',
      'Zapallo',
      'Leche',
    ]);
    expect(itemsService.reorder).toHaveBeenCalled();
  });
});
