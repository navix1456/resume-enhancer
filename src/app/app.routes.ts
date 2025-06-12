import { Routes } from '@angular/router';
import { HomeComponent } from './home/home';
import { UploadComponent } from './upload/upload';
import { ResultsComponent } from './results/results';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'upload', component: UploadComponent },
  { path: 'results', component: ResultsComponent },
];
