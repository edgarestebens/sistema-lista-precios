import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Gasto } from '../../models/models';
import { toSpanishError } from '../../core/es-error';
import { AlertService } from '../../services/alert.service';
import { GastosService } from '../../services/gastos.service';

@Component({
  selector: 'app-gastos',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './gastos.component.html',
  styleUrl: './gastos.component.css',
})
export class GastosComponent implements OnInit {
  gastos = signal<Gasto[]>([]);
  loading = signal(true);
  showForm = signal(false);
  formFecha = '';
  formValor: number | null = null;
  formConcepto = '';
  editingId = signal<string | null>(null);
  deletingId = signal<string | null>(null);
  saving = signal(false);

  page = signal(1);
  pageSize = signal(10);
  fechaDesde = signal('');
  fechaHasta = signal('');
  readonly pageSizeOptions = [5, 10, 25];
  /** Base de comparación para el saldo a favor. */
  readonly basePresupuesto = 600_000;

  readonly gastosFiltrados = computed(() => {
    const desde = this.fechaDesde().trim();
    const hasta = this.fechaHasta().trim();
    return this.gastos().filter((g) => {
      if (desde && g.fecha < desde) return false;
      if (hasta && g.fecha > hasta) return false;
      return true;
    });
  });

  readonly totalPages = computed(() => {
    const total = this.gastosFiltrados().length;
    const size = this.pageSize();
    return Math.max(1, Math.ceil(total / size) || 1);
  });

  readonly from = computed(() => {
    const total = this.gastosFiltrados().length;
    if (total === 0) return 0;
    return (this.page() - 1) * this.pageSize() + 1;
  });

  readonly to = computed(() => {
    const total = this.gastosFiltrados().length;
    if (total === 0) return 0;
    return Math.min(this.page() * this.pageSize(), total);
  });

  readonly gastosPagina = computed(() => {
    const size = this.pageSize();
    const start = (this.page() - 1) * size;
    return this.gastosFiltrados().slice(start, start + size);
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

  readonly rangoActivo = computed(
    () => !!(this.fechaDesde().trim() || this.fechaHasta().trim())
  );

  readonly totalValor = computed(() =>
    this.gastosFiltrados().reduce((sum, g) => sum + Number(g.valor || 0), 0)
  );

  readonly saldoAFavor = computed(
    () => this.basePresupuesto - this.totalValor()
  );

  constructor(
    private gastosService: GastosService,
    private alert: AlertService
  ) {}

  async ngOnInit(): Promise<void> {
    this.aplicarRangoPorDefecto();
    await this.load();
  }

  /** Antes del día 15: 1–15 del mes. Desde el 15: 15–último día del mes. */
  aplicarRangoPorDefecto(ref: Date = new Date()): void {
    const y = ref.getFullYear();
    const month = ref.getMonth();
    const day = ref.getDate();
    const iso = (d: number) =>
      `${y}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    if (day < 15) {
      this.fechaDesde.set(iso(1));
      this.fechaHasta.set(iso(15));
    } else {
      const lastDay = new Date(y, month + 1, 0).getDate();
      this.fechaDesde.set(iso(15));
      this.fechaHasta.set(iso(lastDay));
    }
    this.page.set(1);
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.gastos.set(await this.gastosService.list());
      this.clampPage();
    } catch (e) {
      await this.alert.error(toSpanishError(e, 'Error al cargar'));
    } finally {
      this.loading.set(false);
    }
  }

  onFechaDesdeChange(value: string): void {
    this.fechaDesde.set(value);
    this.page.set(1);
  }

  onFechaHastaChange(value: string): void {
    this.fechaHasta.set(value);
    this.page.set(1);
  }

  clearFechaFilter(): void {
    this.fechaDesde.set('');
    this.fechaHasta.set('');
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

  private todayIso(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  formatFecha(fecha: string): string {
    const [y, m, d] = fecha.split('-');
    if (!y || !m || !d) return fecha;
    return `${d}/${m}/${y}`;
  }

  formatValor(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(valor);
  }

  openAdd(): void {
    this.editingId.set(null);
    this.formFecha = this.todayIso();
    this.formValor = null;
    this.formConcepto = '';
    this.showForm.set(true);
  }

  openEdit(event: Event, gasto: Gasto): void {
    event.stopPropagation();
    event.preventDefault();
    this.editingId.set(gasto.id);
    this.formFecha = gasto.fecha;
    this.formValor = gasto.valor;
    this.formConcepto = gasto.concepto;
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.formFecha = '';
    this.formValor = null;
    this.formConcepto = '';
    this.editingId.set(null);
  }

  get formValid(): boolean {
    const concepto = this.formConcepto.trim();
    const valor = this.formValor;
    return (
      !!this.formFecha &&
      !!concepto &&
      valor !== null &&
      valor !== undefined &&
      !Number.isNaN(Number(valor)) &&
      Number(valor) >= 0
    );
  }

  private sortByFechaDesc(list: Gasto[]): Gasto[] {
    return [...list].sort((a, b) => {
      if (a.fecha === b.fecha) {
        return b.created_at.localeCompare(a.created_at);
      }
      return b.fecha.localeCompare(a.fecha);
    });
  }

  async saveGasto(): Promise<void> {
    if (!this.formValid || this.saving()) return;
    const input = {
      fecha: this.formFecha,
      valor: Number(this.formValor),
      concepto: this.formConcepto.trim(),
    };
    const editId = this.editingId();
    this.saving.set(true);
    try {
      if (editId) {
        await this.gastosService.update(editId, input);
        this.gastos.update((list) =>
          this.sortByFechaDesc(
            list.map((g) => (g.id === editId ? { ...g, ...input } : g))
          )
        );
      } else {
        const gasto = await this.gastosService.create(input);
        this.gastos.update((list) => this.sortByFechaDesc([...list, gasto]));
      }
      this.clampPage();
      this.closeForm();
    } catch (e) {
      await this.alert.error(toSpanishError(e, 'Error al guardar'));
    } finally {
      this.saving.set(false);
    }
  }

  async deleteGasto(event: Event, gasto: Gasto): Promise<void> {
    event.stopPropagation();
    event.preventDefault();
    const ok = await this.alert.confirmDelete(
      `¿Eliminar el gasto "${gasto.concepto}"?`
    );
    if (!ok) return;
    this.deletingId.set(gasto.id);
    try {
      await this.gastosService.remove(gasto.id);
      this.gastos.update((list) => list.filter((g) => g.id !== gasto.id));
      this.clampPage();
    } catch (e) {
      await this.alert.error(toSpanishError(e, 'Error al eliminar'));
    } finally {
      this.deletingId.set(null);
    }
  }
}
