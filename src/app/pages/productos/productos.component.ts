import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Market, Producto } from '../../models/models';
import { toSpanishError } from '../../core/es-error';
import { MarketsService } from '../../services/markets.service';
import { ProductosService } from '../../services/productos.service';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './productos.component.html',
  styleUrl: './productos.component.css',
})
export class ProductosComponent implements OnInit {
  productos = signal<Producto[]>([]);
  markets = signal<Market[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  showForm = signal(false);
  formName = '';
  formMarketId = '';
  editingId = signal<string | null>(null);
  deletingId = signal<string | null>(null);
  saving = signal(false);

  page = signal(1);
  pageSize = signal(10);
  searchQuery = signal('');
  filterMarketId = signal('');
  readonly pageSizeOptions = [5, 10, 25];

  readonly productosFiltrados = computed(() => {
    const q = this.searchQuery().trim().toLocaleLowerCase('es');
    const listaId = this.filterMarketId();
    return this.productos().filter((p) => {
      if (listaId === '__none__') {
        if (p.market_id) return false;
      } else if (listaId && p.market_id !== listaId) {
        return false;
      }
      if (!q) return true;
      return (
        p.nombre.toLocaleLowerCase('es').includes(q) ||
        (p.lista_nombre ?? '').toLocaleLowerCase('es').includes(q)
      );
    });
  });

  readonly totalPages = computed(() => {
    const total = this.productosFiltrados().length;
    const size = this.pageSize();
    return Math.max(1, Math.ceil(total / size) || 1);
  });

  readonly from = computed(() => {
    const total = this.productosFiltrados().length;
    if (total === 0) return 0;
    return (this.page() - 1) * this.pageSize() + 1;
  });

  readonly to = computed(() => {
    const total = this.productosFiltrados().length;
    if (total === 0) return 0;
    return Math.min(this.page() * this.pageSize(), total);
  });

  readonly productosPagina = computed(() => {
    const size = this.pageSize();
    const start = (this.page() - 1) * size;
    return this.productosFiltrados().slice(start, start + size);
  });

  readonly pages = computed(() => {
    const total = this.totalPages();
    const current = this.page();
    const windowSize = 5;
    let start = Math.max(1, current - Math.floor(windowSize / 2));
    let end = start + windowSize - 1;
    if (end > total) {
      end = total;
      start = Math.max(1, end - windowSize + 1);
    }
    const list: number[] = [];
    for (let i = start; i <= end; i++) list.push(i);
    return list;
  });

  constructor(
    private productosService: ProductosService,
    private marketsService: MarketsService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [productos, markets] = await Promise.all([
        this.productosService.list(),
        this.marketsService.list(),
      ]);
      this.productos.set(productos);
      this.markets.set(markets);
      this.clampPage();
    } catch (e) {
      this.error.set(toSpanishError(e, 'Error al cargar'));
    } finally {
      this.loading.set(false);
    }
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
    this.page.set(1);
  }

  onFilterListaChange(value: string): void {
    this.filterMarketId.set(value);
    this.page.set(1);
  }

  setPageSize(size: number | string): void {
    const n = Number(size);
    if (!this.pageSizeOptions.includes(n)) return;
    this.pageSize.set(n);
    this.page.set(1);
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages()) return;
    this.page.set(p);
  }

  prevPage(): void {
    this.goToPage(this.page() - 1);
  }

  nextPage(): void {
    this.goToPage(this.page() + 1);
  }

  private clampPage(): void {
    const max = this.totalPages();
    if (this.page() > max) this.page.set(max);
    if (this.page() < 1) this.page.set(1);
  }

  openAdd(): void {
    this.editingId.set(null);
    this.formName = '';
    this.formMarketId = '';
    this.error.set(null);
    this.showForm.set(true);
  }

  openEdit(event: Event, producto: Producto): void {
    event.stopPropagation();
    event.preventDefault();
    this.editingId.set(producto.id);
    this.formName = producto.nombre;
    this.formMarketId = producto.market_id ?? '';
    this.error.set(null);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.formName = '';
    this.formMarketId = '';
    this.editingId.set(null);
  }

  private nombreYaExiste(nombre: string, excludeId: string | null): boolean {
    const normalized = nombre.trim().toLocaleLowerCase('es');
    return this.productos().some(
      (p) =>
        p.id !== excludeId &&
        p.nombre.trim().toLocaleLowerCase('es') === normalized
    );
  }

  private listaNombre(marketId: string): string {
    return this.markets().find((m) => m.id === marketId)?.name ?? '';
  }

  async saveProducto(): Promise<void> {
    const nombre = this.formName.trim();
    const marketId = this.formMarketId.trim();
    if (!nombre || this.saving()) return;
    if (!marketId) {
      this.error.set('Debes elegir una lista.');
      return;
    }
    const editId = this.editingId();
    if (this.nombreYaExiste(nombre, editId)) {
      this.error.set('Ese producto ya existe en la lista.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    try {
      if (editId) {
        await this.productosService.update(editId, nombre, marketId);
        const lista_nombre = this.listaNombre(marketId);
        this.productos.update((list) =>
          list
            .map((p) =>
              p.id === editId
                ? { ...p, nombre, market_id: marketId, lista_nombre }
                : p
            )
            .sort((a, b) =>
              a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
            )
        );
      } else {
        const producto = await this.productosService.create(nombre, marketId);
        this.productos.update((list) =>
          [...list, producto].sort((a, b) =>
            a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
          )
        );
      }
      this.clampPage();
      this.closeForm();
    } catch (e) {
      this.error.set(toSpanishError(e, 'Error al guardar'));
    } finally {
      this.saving.set(false);
    }
  }

  async deleteProducto(event: Event, producto: Producto): Promise<void> {
    event.stopPropagation();
    event.preventDefault();
    if (!confirm(`¿Eliminar el producto "${producto.nombre}"?`)) return;
    this.deletingId.set(producto.id);
    try {
      await this.productosService.remove(producto.id);
      this.productos.update((list) => list.filter((p) => p.id !== producto.id));
      this.clampPage();
    } catch (e) {
      this.error.set(toSpanishError(e, 'Error al eliminar'));
    } finally {
      this.deletingId.set(null);
    }
  }
}
