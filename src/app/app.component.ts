import { Component, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';
import { SyncStatusComponent } from './components/sync-status/sync-status.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SyncStatusComponent],
  template: `
    <app-sync-status />
    <router-outlet />
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100%;
      }
    `,
  ],
})
export class AppComponent {
  constructor() {
    inject(Title).setTitle('Lista de Mercado M y E');
  }
}
