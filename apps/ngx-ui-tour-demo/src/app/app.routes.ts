import type { Routes } from '@angular/router';
import { tuiProvideRoutePageTab as route } from '@taiga-ui/addon-doc';

export const ROUTES: Routes = [
  route({
    path: 'tui-hint',
    title: 'Taiga UI Hint',
    loadComponent: async () => import('./tui-hint/tui-hint.component'),
  }),
  {
    redirectTo: 'md-menu',
    path: '**',
  },
];
