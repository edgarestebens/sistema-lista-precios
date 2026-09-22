import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { toSpanishError } from '../../core/es-error';
import { ConnectivityService } from '../../offline/connectivity.service';
import { AlertService } from '../../services/alert.service';
import { ParametrosService } from '../../services/parametros.service';

@Component({
  selector: 'app-parametros',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './parametros.component.html',
  styleUrl: './parametros.component.css',
})
export class ParametrosComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  formSaldoGasto: number | null = null;

  constructor(
    private parametrosService: ParametrosService,
    private alert: AlertService,
    private connectivity: ConnectivityService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private requireOnline(): boolean {
    if (this.connectivity.isOnline()) return true;
    void this.alert.error(
      'Parámetros requiere internet. Conectate para cargar o guardar.'
    );
    return false;
  }

  async load(): Promise<void> {
    if (!this.requireOnline()) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    try {
      const parametro = await this.parametrosService.get();
      this.formSaldoGasto = Number(parametro.saldo_gasto);
    } catch (e) {
      await this.alert.error(toSpanishError(e, 'Error al cargar'));
    } finally {
      this.loading.set(false);
    }
  }

  get formValid(): boolean {
    const valor = this.formSaldoGasto;
    return (
      valor !== null &&
      valor !== undefined &&
      !Number.isNaN(Number(valor)) &&
      Number(valor) >= 0
    );
  }

  async save(): Promise<void> {
    if (!this.formValid || this.saving()) return;
    if (!this.requireOnline()) return;
    this.saving.set(true);
    try {
      await this.parametrosService.updateSaldoGasto(Number(this.formSaldoGasto));
      await this.alert.success('Documento modificado exitosamente');
    } catch (e) {
      await this.alert.error(toSpanishError(e, 'Error al guardar'));
    } finally {
      this.saving.set(false);
    }
  }
}
