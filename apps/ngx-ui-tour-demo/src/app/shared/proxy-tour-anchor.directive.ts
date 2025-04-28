import {
  Directive,
  inject,
  Inject,
  InjectionToken,
  Input,
  type OnDestroy,
  type OnInit,
  signal,
  type Type,
} from '@angular/core';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TourAnchorConsoleDirective } from 'ngx-ui-tour-console';
import type { TourAnchorDirective } from 'ngx-ui-tour-core';
import { TourAnchorTuiHintDirective } from 'ngx-ui-tour-tui-hint';

export const TOUR_ANCHOR_DIRECTIVE = new InjectionToken<TourAnchorDirective>('TourAnchorDirective');
export const TOUR_ANCHOR_DIRECTIVE_TYPE = new InjectionToken<Type<TourAnchorDirective>>('TourAnchorDirectiveType');

interface CustomTourAnchorDirective extends TourAnchorDirective, OnInit, OnDestroy {
  tourAnchor: string;
}

@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: '[tourAnchor]',
  // All directive providers should be declared here because their instances should not be shared
  providers: [
    NgbPopover,
    TourAnchorConsoleDirective,
    TourAnchorTuiHintDirective,
    {
      provide: TOUR_ANCHOR_DIRECTIVE,
      useFactory: () => {
        const type = inject(TOUR_ANCHOR_DIRECTIVE_TYPE);

        return inject(type);
      },
    },
  ],
  host: {
    '[class.touranchor--is-active]': 'isActive()',
  },
})
export class ProxyTourAnchorDirective implements OnInit, OnDestroy {
  @Input()
  public tourAnchor: string;

  public isActive = signal(false);

  constructor(
    @Inject(TOUR_ANCHOR_DIRECTIVE)
    private readonly tourAnchorDirective: TourAnchorDirective,
  ) {
    this.overrideShowHideMethods();
  }

  ngOnInit() {
    const tourAnchorDirective = this.tourAnchorDirective as CustomTourAnchorDirective;

    tourAnchorDirective.tourAnchor = this.tourAnchor;
    tourAnchorDirective.ngOnInit();
  }

  ngOnDestroy() {
    (this.tourAnchorDirective as CustomTourAnchorDirective).ngOnDestroy();
  }

  private overrideShowHideMethods() {
    const origShowFn = this.tourAnchorDirective.showTourStep.bind(this.tourAnchorDirective),
      origHideFn = this.tourAnchorDirective.hideTourStep.bind(this.tourAnchorDirective);

    this.tourAnchorDirective.showTourStep = (step) => {
      this.isActive.set(true);
      origShowFn(step);
    };
    this.tourAnchorDirective.hideTourStep = () => {
      this.isActive.set(false);
      origHideFn();
    };
  }
}
