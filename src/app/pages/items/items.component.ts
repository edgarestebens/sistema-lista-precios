import { Component, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { Item, Market, PrecioMasBarato, Producto } from '../../models/models';
import { toSpanishError } from '../../core/es-error';
import { ComparativoPrecioService } from '../../services/comparativo-precio.service';
import { ItemsService } from '../../services/items.service';
import { MarketsService } from '../../services/markets.service';
import { ProductosService } from '../../services/productos.service';

@Component({
  selector: 'app-items',
  standalone: true,
  imports: [DragDropModule, FormsModule, RouterLink],
  templateUrl: './items.component.html',
  styleUrl: './items.component.css',
})
export class ItemsComponent implements OnInit {
  market = signal<Market | null>(null);
  items = signal<Item[]>([]);
  productos = signal<Producto[]>([]);
  preciosBaratos = signal<Record<string, PrecioMasBarato>>({});
  loading = signal(true);
  error = signal<string | null>(null);
  selectedProductoId = '';
  deletingId = signal<string | null>(null);
  togglingAll = signal(false);
  showMenu = signal(false);
  adding = signal(false);
  private marketId = '';

  readonly allChecked = computed(
    () => this.items().length > 0 && this.items().every((i) => i.is_checked)
  );

  /** Productos de esta lista que aún no están agregados. */
  readonly productosDisponibles = computed(() => {
    const usados = new Set(this.items().map((i) => i.producto_id));
    return this.productos().filter(
      (p) => p.market_id === this.marketId && !usados.has(p.id)
    );
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private itemsService: ItemsService,
    private marketsService: MarketsService,
    private productosService: ProductosService,
    private comparativoService: ComparativoPrecioService
  ) {}

  async ngOnInit(): Promise<void> {
    this.marketId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.marketId) {
      void this.router.navigate(['/']);
      return;
    }
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const market = await this.marketsService.getById(this.marketId);
      if (!market) {
        void this.router.navigate(['/']);
        return;
      }
      this.market.set(market);
      const [items, productos, preciosBaratos] = await Promise.all([
        this.itemsService.listByMarket(this.marketId),
        this.productosService.list(),
        this.comparativoService.mapPrecioMasBarato(),
      ]);
      this.items.set(items);
      this.productos.set(productos);
      this.preciosBaratos.set(preciosBaratos);
    } catch (e) {
      this.error.set(toSpanishError(e, 'Error al cargar'));
    } finally {
      this.loading.set(false);
    }
  }

  precioBaratoTexto(item: Item): string {
    const best = this.preciosBaratos()[item.producto_id];
    if (!best || best.precio <= 0) return '';
    const precio = best.precio.toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    return best.mercado_nombre
      ? `${best.mercado_nombre} · ${precio}`
      : precio;
  }

  async addItem(): Promise<void> {
    const productoId = this.selectedProductoId;
    if (!productoId || this.adding()) return;
    this.adding.set(true);
    try {
      const item = await this.itemsService.create(this.marketId, productoId);
      this.items.update((list) => {
        const pending = list.filter((i) => !i.is_checked);
        const done = list.filter((i) => i.is_checked);
        return [...pending, item, ...done];
      });
      this.selectedProductoId = '';
      await this.itemsService.reorder(this.items());
    } catch (e) {
      this.error.set(toSpanishError(e, 'Error al agregar'));
    } finally {
      this.adding.set(false);
    }
  }

  async toggle(item: Item): Promise<void> {
    const next = !item.is_checked;
    const list = this.items()
      .filter((i) => i.id !== item.id)
      .map((i) => ({ ...i }));
    const updated = { ...item, is_checked: next };

    if (next) {
      list.push(updated);
    } else {
      const firstDone = list.findIndex((i) => i.is_checked);
      if (firstDone === -1) {
        list.push(updated);
      } else {
        list.splice(firstDone, 0, updated);
      }
    }

    this.items.set(list);

    try {
      await this.itemsService.toggleChecked(item.id, next);
      await this.itemsService.reorder(list);
    } catch (e) {
      this.error.set(toSpanishError(e, 'Error al tachar'));
      await this.load();
    }
  }

  async toggleAll(): Promise<void> {
    if (this.items().length === 0 || this.togglingAll()) return;

    const next = !this.allChecked();
    this.togglingAll.set(true);

    let list: Item[];
    if (next) {
      const pending = this.items()
        .filter((i) => !i.is_checked)
        .map((i) => ({ ...i, is_checked: true }));
      const alreadyDone = this.items()
        .filter((i) => i.is_checked)
        .map((i) => ({ ...i }));
      list = [...alreadyDone, ...pending];
    } else {
      list = this.items().map((i) => ({ ...i, is_checked: false }));
    }

    this.items.set(list);

    try {
      await Promise.all(
        list.map((item) => this.itemsService.toggleChecked(item.id, next))
      );
      await this.itemsService.reorder(list);
    } catch (e) {
      this.error.set(toSpanishError(e, 'Error al seleccionar todo'));
      await this.load();
    } finally {
      this.togglingAll.set(false);
    }
  }

  async deleteItem(event: Event, item: Item): Promise<void> {
    event.stopPropagation();
    this.deletingId.set(item.id);
    try {
      await this.itemsService.remove(item.id);
      this.items.update((list) => list.filter((i) => i.id !== item.id));
    } catch (e) {
      this.error.set(toSpanishError(e, 'Error al eliminar'));
    } finally {
      this.deletingId.set(null);
    }
  }

  async drop(event: CdkDragDrop<Item[]>): Promise<void> {
    if (event.previousIndex === event.currentIndex) return;
    const list = [...this.items()];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    this.items.set(list);
    try {
      await this.itemsService.reorder(list);
    } catch (e) {
      this.error.set(toSpanishError(e, 'Error al ordenar'));
      await this.load();
    }
  }

  toggleMenu(event?: Event): void {
    event?.stopPropagation();
    this.showMenu.update((open) => !open);
  }

  closeMenu(): void {
    this.showMenu.set(false);
  }

  async sortAlphabetically(direction: 'asc' | 'desc'): Promise<void> {
    this.closeMenu();
    if (this.items().length < 2) return;

    const factor = direction === 'asc' ? 1 : -1;
    const byName = (a: Item, b: Item) =>
      factor * a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });

    const pending = this.items()
      .filter((i) => !i.is_checked)
      .sort(byName);
    const done = this.items()
      .filter((i) => i.is_checked)
      .sort(byName);
    const list = [...pending, ...done];
    this.items.set(list);

    try {
      await this.itemsService.reorder(list);
    } catch (e) {
      this.error.set(toSpanishError(e, 'Error al ordenar'));
      await this.load();
    }
  }
}
