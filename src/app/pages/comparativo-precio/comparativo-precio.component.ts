import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  ComparativoProducto,
  Mercado,
  Producto,
} from '../../models/models';
import { toSpanishError } from '../../core/es-error';
import { ComparativoPrecioService } from '../../services/comparativo-precio.service';
import { MercadosService } from '../../services/mercados.service';
import { ProductosService } from '../../services/productos.service';

@Component({
  selector: 'app-comparativo-precio',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './comparativo-precio.component.html',
  styleUrl: './comparativo-precio.component.css',
})
export class ComparativoPrecioComponent implements OnInit {
  filas = signal<ComparativoProducto[]>([]);
  productos = signal<Producto[]>([]);
  mercados = signal<Mercado[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  showForm = signal(false);
  saving = signal(false);
  deletingId = signal<string | null>(null);
  editingProductoId = signal<string | null>(null);
  selectedProductoId = '';
  /** preciosPorMercado[mercadoId] = precio */
  preciosForm: Record<string, number> = {};

  page = signal(1);
  pageSize = signal(10);
  searchQuery = signal('');
  readonly pageSizeOptions = [5, 10, 25];

  readonly productosDisponibles = computed(() => {
    const usados = new Set(this.filas().map((f) => f.producto_id));
    return this.productos().filter((p) => !usados.has(p.id));
  });

  readonly canCreate = computed(
    () => this.productos().length > 0 && this.mercados().length > 0
  );

  readonly filasFiltradas = computed(() => {
    const q = this.searchQuery().trim().toLocaleLowerCase('es');
    if (!q) return this.filas();
    return this.filas().filter((f) =>
      f.producto_nombre.toLocaleLowerCase('es').includes(q)
    );
  });

  readonly totalPages = computed(() => {
    const total = this.filasFiltradas().length;
    const size = this.pageSize();
    return Math.max(1, Math.ceil(total / size) || 1);
  });

  readonly from = computed(() => {
    const total = this.filasFiltradas().length;
    if (total === 0) return 0;
    return (this.page() - 1) * this.pageSize() + 1;
  });

  readonly to = computed(() => {
    const total = this.filasFiltradas().length;
    if (total === 0) return 0;
    return Math.min(this.page() * this.pageSize(), total);
  });

  readonly filasPagina = computed(() => {
    const size = this.pageSize();
    const start = (this.page() - 1) * size;
    return this.filasFiltradas().slice(start, start + size);
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
    private comparativoService: ComparativoPrecioService,
    private productosService: ProductosService,
    private mercadosService: MercadosService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [filas, productos, mercados] = await Promise.all([
        this.comparativoService.listGrouped(),
        this.productosService.list(),
        this.mercadosService.list(),
      ]);
      this.filas.set(filas);
      this.productos.set(productos);
      this.mercados.set(mercados);
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

  precioDe(fila: ComparativoProducto, mercadoId: string): number {
    return fila.precios[mercadoId] ?? 0;
  }

  /** 'barato' | 'caro' | null — ignora ceros; un solo precio > 0 cuenta como barato. */
  clasePrecio(fila: ComparativoProducto, mercadoId: string): string | null {
    const precio = this.precioDe(fila, mercadoId);
    if (precio <= 0) return null;

    const precios = this.mercados()
      .map((m) => this.precioDe(fila, m.id))
      .filter((p) => p > 0);

    if (precios.length === 1) return 'barato';

    const min = Math.min(...precios);
    const max = Math.max(...precios);
    if (min === max) return null;

    if (precio === min) return 'barato';
    if (precio === max) return 'caro';
    return null;
  }

  nombreProductoEditando(): string {
    const id = this.editingProductoId();
    if (!id) return '';
    return this.productos().find((p) => p.id === id)?.nombre ?? '';
  }

  formatPrecio(value: number): string {
    return value.toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  openAdd(): void {
    if (!this.canCreate()) {
      this.error.set(
        'Necesitas al menos un producto y un mercado en el catálogo.'
      );
      return;
    }
    if (this.productosDisponibles().length === 0) {
      this.error.set('Todos los productos ya tienen comparativo.');
      return;
    }
    this.editingProductoId.set(null);
    this.selectedProductoId = '';
    this.preciosForm = {};
    for (const m of this.mercados()) {
      this.preciosForm[m.id] = 0;
    }
    this.error.set(null);
    this.showForm.set(true);
  }

  openEdit(event: Event, fila: ComparativoProducto): void {
    event.stopPropagation();
    this.editingProductoId.set(fila.producto_id);
    this.selectedProductoId = fila.producto_id;
    this.preciosForm = {};
    for (const m of this.mercados()) {
      this.preciosForm[m.id] = this.precioDe(fila, m.id);
    }
    this.error.set(null);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingProductoId.set(null);
    this.selectedProductoId = '';
    this.preciosForm = {};
  }

  async save(): Promise<void> {
    if (this.saving()) return;
    const productoId = this.editingProductoId() ?? this.selectedProductoId.trim();
    if (!productoId) {
      this.error.set('Debes elegir un producto.');
      return;
    }
    if (this.mercados().length === 0) {
      this.error.set('No hay mercados registrados.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    try {
      const precios = this.mercados().map((m) => ({
        mercado_id: m.id,
        precio: Number(this.preciosForm[m.id]) || 0,
      }));
      await this.comparativoService.saveForProducto(productoId, precios);
      await this.load();
      this.closeForm();
    } catch (e) {
      this.error.set(toSpanishError(e, 'Error al guardar'));
    } finally {
      this.saving.set(false);
    }
  }

  async deleteFila(event: Event, fila: ComparativoProducto): Promise<void> {
    event.stopPropagation();
    if (!confirm(`¿Eliminar el comparativo de "${fila.producto_nombre}"?`)) {
      return;
    }
    this.deletingId.set(fila.producto_id);
    try {
      await this.comparativoService.removeByProducto(fila.producto_id);
      this.filas.update((list) =>
        list.filter((f) => f.producto_id !== fila.producto_id)
      );
      this.clampPage();
    } catch (e) {
      this.error.set(toSpanishError(e, 'Error al eliminar'));
    } finally {
      this.deletingId.set(null);
    }
  }
}
