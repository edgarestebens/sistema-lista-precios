import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

const base = {
  confirmButtonColor: '#6b1a1a',
  cancelButtonColor: '#444',
  background: '#1c1c1c',
  color: '#f5f5f5',
  heightAuto: false,
  allowOutsideClick: false,
  allowEscapeKey: false,
};

@Injectable({ providedIn: 'root' })
export class AlertService {
  error(message: string, title = 'Error'): Promise<void> {
    return Swal.fire({
      ...base,
      icon: 'error',
      title,
      text: message,
      confirmButtonText: 'Aceptar',
    }).then(() => undefined);
  }

  warning(message: string, title = 'Atención'): Promise<void> {
    return Swal.fire({
      ...base,
      icon: 'warning',
      title,
      text: message,
      confirmButtonText: 'Aceptar',
    }).then(() => undefined);
  }

  async confirmDelete(message: string, title = '¿Eliminar?'): Promise<boolean> {
    const result = await Swal.fire({
      ...base,
      icon: 'warning',
      title,
      text: message,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      focusCancel: true,
    });
    return result.isConfirmed;
  }
}
