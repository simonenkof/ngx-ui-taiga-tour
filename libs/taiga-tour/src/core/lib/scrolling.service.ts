import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import type { Observable } from 'rxjs';
import { debounceTime, firstValueFrom, fromEvent, map, of, timeout } from 'rxjs';
import type { ScrollSettings } from './tour.service';
import { ElementSides, isCovered, isInViewport, OverflowUtils, ScrollUtils } from './utils';

@Injectable({
  providedIn: 'root',
})
export class ScrollingService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly document = inject(DOCUMENT);
  private readonly window = this.document.defaultView;
  private scrollOptions: ScrollSettings;
  private anchorEl: HTMLElement;

  ensureVisible(anchorElement: HTMLElement, options: ScrollSettings): Promise<void> {
    this.scrollOptions = options;
    this.anchorEl = anchorElement;

    const behavior: ScrollBehavior = options.smoothScroll && this.isBrowser ? 'smooth' : 'auto';

    const userScrollContainer = this.scrollOptions.scrollContainer,
      scrollContainer = ScrollUtils.getScrollContainer(anchorElement, userScrollContainer) ?? document.documentElement;

    if ((options.coordinates?.x !== 0 || options.coordinates?.y !== 0) && scrollContainer) {
      scrollContainer.scroll({ left: options.coordinates.x, top: options.coordinates.y });
      return Promise.resolve();
    }

    if (OverflowUtils.isHeightOverflowing(anchorElement, scrollContainer)) {
      anchorElement.scrollIntoView({
        block: 'start',
        inline: 'start',
        behavior,
      });
    } else if (options.centerAnchorOnScroll && !('safari' in this.window)) {
      anchorElement.scrollIntoView({
        block: 'center',
        inline: 'center',
        behavior,
      });
    } else if (!isInViewport(anchorElement, ElementSides.Bottom) || isCovered(anchorElement, ElementSides.Bottom)) {
      anchorElement.scrollIntoView({
        block: 'end',
        inline: 'nearest',
        behavior,
      });
    } else if (!isInViewport(anchorElement, ElementSides.Top) || isCovered(anchorElement, ElementSides.Top)) {
      anchorElement.scrollIntoView({
        block: 'start',
        inline: 'nearest',
        behavior,
      });
    } else {
      return Promise.resolve();
    }

    return behavior === 'smooth' ? firstValueFrom(this.waitForScrollFinish$) : Promise.resolve();
  }

  private get waitForScrollFinish$(): Observable<void> {
    const userScrollContainer = this.scrollOptions.scrollContainer,
      // Default here is "document" instead of "document.documentElement" on purpose
      scrollContainer = ScrollUtils.getScrollContainer(this.anchorEl, userScrollContainer) ?? document;

    return fromEvent(scrollContainer, 'scroll').pipe(
      timeout({
        each: 75,
        with: () => of(undefined),
      }),
      debounceTime(50),
      map((): void => undefined),
    );
  }
}
