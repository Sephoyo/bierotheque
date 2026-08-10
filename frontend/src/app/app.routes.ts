import { Routes } from '@angular/router';
import { AdminPageComponent } from './admin-page/admin-page.component';
import { MapPageComponent } from './map-page/map-page.component';

export const routes: Routes = [
  { path: '', component: MapPageComponent },
  { path: 'admin', component: AdminPageComponent },
];
