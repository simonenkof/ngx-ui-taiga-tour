import { LocationStrategy, PathLocationStrategy, ViewportScroller } from '@angular/common';
import type { EnvironmentProviders, Provider } from '@angular/core';
import { inject, InjectionToken, provideEnvironmentInitializer, provideZoneChangeDetection } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { PreloadAllModules, provideRouter, withInMemoryScrolling, withPreloading } from '@angular/router';
import { TUI_DOC_DEFAULT_TABS, TUI_DOC_LOGO, TUI_DOC_PAGES, TUI_DOC_TITLE } from '@taiga-ui/addon-doc';
import { TUI_ANIMATIONS_SPEED } from '@taiga-ui/core';
import { NG_EVENT_PLUGINS } from '@taiga-ui/event-plugins';
import type { HighlightOptions } from 'ngx-highlightjs';
import { HIGHLIGHT_OPTIONS } from 'ngx-highlightjs';
import { ROUTES } from './app.routes';
import { pages } from './pages';
import { LOGO_CONTENT } from './shared/logo/logo.component';

export const DEFAULT_TABS = [`Description`, `Setup`, `API`, `FAQ`, 'Misc'];
const TITLE_PREFIX = 'Ngx UI Tour: ';

export const HIGHLIGHT_OPTIONS_VALUE: HighlightOptions = {
  coreLibraryLoader: () => import('highlight.js/lib/core'),
  lineNumbersLoader: () => import('ngx-highlightjs/line-numbers'),
  languages: {
    typescript: () => import('highlight.js/lib/languages/typescript'),
    xml: () => import('highlight.js/lib/languages/xml'),
    css: () => import('highlight.js/lib/languages/css'),
  },
};

export const DELAY_AFTER_NAVIGATION = new InjectionToken<number>('DelayAfterNavigation', {
  factory: () => 0,
});

export const APP_PROVIDERS: (Provider | EnvironmentProviders)[] = [
  Title,
  {
    provide: HIGHLIGHT_OPTIONS,
    useValue: HIGHLIGHT_OPTIONS_VALUE,
  },
  {
    provide: LocationStrategy,
    useClass: PathLocationStrategy,
  },
  {
    provide: TUI_DOC_TITLE,
    useValue: TITLE_PREFIX,
  },
  {
    provide: TUI_DOC_PAGES,
    useValue: pages,
  },
  {
    provide: TUI_DOC_DEFAULT_TABS,
    useValue: DEFAULT_TABS,
  },
  {
    provide: TUI_DOC_LOGO,
    useValue: LOGO_CONTENT,
  },
  {
    provide: TUI_ANIMATIONS_SPEED,
    useValue: 1,
  },
  {
    provide: DELAY_AFTER_NAVIGATION,
    useValue: 150,
  },
  provideZoneChangeDetection({
    eventCoalescing: true,
  }),
  provideAnimations(),
  provideRouter(
    ROUTES,
    withPreloading(PreloadAllModules),
    withInMemoryScrolling({
      scrollPositionRestoration: 'enabled',
      anchorScrolling: 'enabled',
    }),
  ),
  provideEnvironmentInitializer(() => {
    const viewportScroller = inject(ViewportScroller);

    viewportScroller.setOffset([0, 80]);
  }),
  NG_EVENT_PLUGINS,
];
