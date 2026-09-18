import { Routes } from '@angular/router';
import { MarketsComponent } from './pages/markets/markets.component';
import { ItemsComponent } from './pages/items/items.component';

export const routes: Routes = [
  { path: '', component: MarketsComponent },
  { path: 'mercados/:id', component: ItemsComponent },
  { path: '**', redirectTo: '' },
];
