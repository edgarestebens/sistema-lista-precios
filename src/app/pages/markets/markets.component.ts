import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { Market } from '../../models/models';
import { toSpanishError } from '../../core/es-error';
import { AlertService } from '../../services/alert.service';
import { AuthService } from '../../services/auth.service';
import { MarketsService } from '../../services/markets.service';

@Component({
  selector: 'app-markets',
  standalone: true,
  imports: [DragDropModule, FormsModule],
  templateUrl: './markets.component.html',
  styleUrl: './markets.component.css',
})
export class MarketsComponent implements OnInit {
  markets = signal<Market[]>([]);
  loading = signal(true);
  showForm = signal(false);
  formName = '';
  editingId = signal<string | null>(null);
  deletingId = signal<string | null>(null);
  saving = signal(false);
  showMenu = signal(false);

  constructor(
    private marketsService: MarketsService,
    private auth: AuthService,
    private router: Router,
    private alert: AlertService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  toggleMenu(event?: Event): void {
    event?.stopPropagation();
    this.showMenu.update((open) => !open);
  }

  closeMenu(): void {
    this.showMenu.set(false);
  }

  goProductos(): void {
    this.closeMenu();
    void this.router.navigate(['/productos']);
  }

  goMercados(): void {
    this.closeMenu();
    void this.router.navigate(['/mercados']);
  }

  goComparativo(): void {
    this.closeMenu();
    void this.router.navigate(['/comparativo-precio']);
  }

  async logout(): Promise<void> {
    try {
      await this.auth.signOut();
      await this.router.navigateByUrl('/login');
    } catch (e) {
      await this.alert.error(toSpanishError(e, 'Error al salir'));
    }
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.markets.set(await this.marketsService.list());
    } catch (e) {
      await this.alert.error(toSpanishError(e, 'Error al cargar'));
    } finally {
      this.loading.set(false);
    }
  }

  openAdd(): void {
    this.editingId.set(null);
    this.formName = '';
    this.showForm.set(true);
  }

  openEdit(event: Event, market: Market): void {
    event.stopPropagation();
    event.preventDefault();
    this.editingId.set(market.id);
    this.formName = market.name;
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.formName = '';
    this.editingId.set(null);
  }

  async saveMarket(): Promise<void> {
    const name = this.formName.trim();
    if (!name || this.saving()) return;
    this.saving.set(true);
    const editId = this.editingId();
    try {
      if (editId) {
        await this.marketsService.rename(editId, name);
        this.markets.update((list) =>
          list.map((m) => (m.id === editId ? { ...m, name } : m))
        );
      } else {
        const market = await this.marketsService.create(name);
        this.markets.update((list) => [...list, market]);
      }
      this.closeForm();
    } catch (e) {
      await this.alert.error(toSpanishError(e, 'Error al guardar'));
    } finally {
      this.saving.set(false);
    }
  }

  async deleteMarket(event: Event, market: Market): Promise<void> {
    event.stopPropagation();
    event.preventDefault();
    const ok = await this.alert.confirmDelete(
      `¿Eliminar "${market.name}" y todos sus ítems?`
    );
    if (!ok) return;
    this.deletingId.set(market.id);
    try {
      await this.marketsService.remove(market.id);
      this.markets.update((list) => list.filter((m) => m.id !== market.id));
    } catch (e) {
      await this.alert.error(toSpanishError(e, 'Error al eliminar'));
    } finally {
      this.deletingId.set(null);
    }
  }

  openMarket(market: Market): void {
    void this.router.navigate(['/mercados', market.id]);
  }

  async drop(event: CdkDragDrop<Market[]>): Promise<void> {
    if (event.previousIndex === event.currentIndex) return;
    const list = [...this.markets()];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    this.markets.set(list);
    try {
      await this.marketsService.reorder(list);
    } catch (e) {
      await this.alert.error(toSpanishError(e, 'Error al ordenar'));
      await this.load();
    }
  }
}
