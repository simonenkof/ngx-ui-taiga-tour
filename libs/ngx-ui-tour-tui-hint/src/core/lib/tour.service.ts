import { inject, Injectable } from '@angular/core';
import type { IsActiveMatchOptions, UrlSegment } from '@angular/router';
import { NavigationStart, Router } from '@angular/router';

import type { Observable } from 'rxjs';
import { delay, filter, first, map, merge as mergeStatic, of, Subject, takeUntil, timeout } from 'rxjs';
import { AnchorClickService } from './anchor-click.service';
import { ScrollBlockingService } from './scroll-blocking.service';
import { ScrollingService } from './scrolling.service';
import type { TourAnchorDirective } from './tour-anchor.directive';
import type { BackdropConfig } from './tour-backdrop.service';
import { TourBackdropService } from './tour-backdrop.service';
import { deepMerge } from './utils';

export interface StepDimensions {
  width?: string;
  minWidth?: string;
  maxWidth?: string;
}

export interface ScrollSettings {
  disableScrollToAnchor?: boolean;
  centerAnchorOnScroll?: boolean;
  smoothScroll?: boolean;
  disablePageScrolling?: boolean;
  /**
   * CSS selector or html element reference. Only set this config if you have enabled "smoothScroll" and tour step
   * description pops-up before scrolling has finished or doesn't show up at all. This should only be the case when
   * scroll container is part of shadow DOM.
   */
  scrollContainer?: string | HTMLElement;
  coordinates?: { x: number; y: number };
}

export interface IStepOption {
  stepId?: string;
  anchorId?: string;
  title?: string;
  content?: string;
  route?: string | UrlSegment[];
  nextStep?: number | string;
  prevStep?: number | string;
  disablePrevStep?: boolean;
  scrollSettings?: ScrollSettings;
  prevBtnTitle?: string;
  nextBtnTitle?: string;
  endBtnTitle?: string;
  enableBackdrop?: boolean;
  backdropConfig?: BackdropConfig;
  isAsync?: boolean;
  asyncStepTimeout?: number;
  isOptional?: boolean;
  delayAfterNavigation?: number;
  delayBeforeStepShow?: number;
  nextOnAnchorClick?: boolean;
  duplicateAnchorHandling?: 'error' | 'registerFirst' | 'registerLast';
  allowUserInitiatedNavigation?: boolean;
  stepDimensions?: StepDimensions;
  popoverClass?: string;
  showProgress?: boolean;
}

export enum TourState {
  OFF,
  ON,
  PAUSED,
}

export enum Direction {
  Forwards,
  Backwards,
}

export interface StepChangeParams<T extends IStepOption = IStepOption> {
  step: T;
  direction: Direction;
}

const DEFAULT_STEP_OPTIONS: IStepOption = {
  scrollSettings: {
    disableScrollToAnchor: false,
    centerAnchorOnScroll: true,
    disablePageScrolling: true,
    smoothScroll: true,
    coordinates: { x: 0, y: 0 },
  },
  prevBtnTitle: 'Prev',
  nextBtnTitle: 'Next',
  endBtnTitle: 'End',
  disablePrevStep: false,
  enableBackdrop: false,
  isAsync: false,
  isOptional: false,
  delayAfterNavigation: 100,
  delayBeforeStepShow: 0,
  nextOnAnchorClick: false,
  duplicateAnchorHandling: 'error',
  allowUserInitiatedNavigation: false,
  stepDimensions: {
    minWidth: '250px',
    maxWidth: '280px',
    width: 'auto',
  },
  showProgress: true,
};

// noinspection JSUnusedGlobalSymbols
@Injectable({
  providedIn: 'root',
})
export class TourService<T extends IStepOption = IStepOption> {
  public stepShow$ = new Subject<StepChangeParams<T>>();
  public stepHide$ = new Subject<StepChangeParams<T>>();
  public initialize$ = new Subject<T[]>();
  public start$ = new Subject<void>();
  public end$ = new Subject<void>();
  public pause$ = new Subject<void>();
  public resume$ = new Subject<void>();
  public anchorRegister$ = new Subject<string>();
  public anchorUnregister$ = new Subject<string>();
  public events$: Observable<{ name: string; value: unknown }> = mergeStatic(
    this.stepShow$.pipe(map((value) => ({ name: 'stepShow', value }))),
    this.stepHide$.pipe(map((value) => ({ name: 'stepHide', value }))),
    this.initialize$.pipe(map((value) => ({ name: 'initialize', value }))),
    this.start$.pipe(map((value) => ({ name: 'start', value }))),
    this.end$.pipe(map((value) => ({ name: 'end', value }))),
    this.pause$.pipe(map((value) => ({ name: 'pause', value }))),
    this.resume$.pipe(map((value) => ({ name: 'resume', value }))),
    this.anchorRegister$.pipe(
      map((value) => ({
        name: 'anchorRegister',
        value,
      })),
    ),
    this.anchorUnregister$.pipe(
      map((value) => ({
        name: 'anchorUnregister',
        value,
      })),
    ),
  );

  public steps: T[] = [];
  public currentStep: T;

  public anchors: Record<string, TourAnchorDirective> = {};
  private status: TourState = TourState.OFF;
  private isHotKeysEnabled = true;
  private direction = Direction.Forwards;
  private waitingForScroll = false;
  private navigationStarted = false;
  private userDefaults: T;

  private readonly router = inject(Router);
  private readonly backdrop = inject(TourBackdropService);
  private readonly anchorClickService = inject(AnchorClickService);
  private readonly scrollBlockingService = inject(ScrollBlockingService);
  private readonly scrollingService = inject(ScrollingService);

  public initialize(steps: T[], stepDefaults?: T): void {
    if (this.status === TourState.ON) {
      console.warn("Can not re-initialize the UI tour while it's still active");
      return;
    }

    if (steps && steps.length > 0) {
      this.status = TourState.OFF;
      this.steps = steps.map((step) => deepMerge(DEFAULT_STEP_OPTIONS as T, this.userDefaults, stepDefaults, step));
      this.validateSteps();
      this.initialize$.next(this.steps);
      this.subscribeToNavigationStartEvent();
    }
  }

  public setDefaults(defaultOptions: T): void {
    this.userDefaults = defaultOptions;
  }

  public getDefaults(): T {
    return this.userDefaults;
  }

  private validateSteps() {
    for (const step of this.steps) {
      if (step.isAsync && step.isOptional && !step.asyncStepTimeout) {
        throw new Error(
          `Tour step with anchor id "${step.anchorId}" can only be both "async" and ` +
            `"optional" when "asyncStepTimeout" is specified!`,
        );
      }
    }
  }

  private subscribeToNavigationStartEvent() {
    this.router.events
      .pipe(
        filter((event): event is NavigationStart => event instanceof NavigationStart),
        takeUntil(this.end$),
      )
      .subscribe((event) => {
        if (!this.currentStep) {
          return;
        }

        const browserBackBtnPressed = event.navigationTrigger === 'popstate',
          userNavigationAllowed = this.currentStep.allowUserInitiatedNavigation;

        if (!this.navigationStarted && (browserBackBtnPressed || !userNavigationAllowed)) {
          this.end();
        }
      });
  }

  public disableHotkeys(): void {
    this.isHotKeysEnabled = false;
  }

  public enableHotkeys(): void {
    this.isHotKeysEnabled = true;
  }

  public start(): void {
    if (this.status === TourState.ON) {
      console.warn('tourService.start() called while the tour is already running.');
      return;
    }
    this.startAt(0);
  }

  public startAt(stepId: number | string): void {
    this.status = TourState.ON;
    this.goToStep(this.loadStep(stepId));
    this.start$.next();
  }

  public end(): void {
    if (this.waitingForScroll) {
      return;
    }

    if (this.status === TourState.OFF) {
      return;
    }
    this.status = TourState.OFF;
    this.disableTour();
    this.currentStep = undefined;
    this.direction = Direction.Forwards;
    this.end$.next();
  }

  public pause(): void {
    this.status = TourState.PAUSED;
    this.disableTour();
    this.pause$.next();
  }

  private disableTour() {
    this.hideStep(this.currentStep);
    this.anchorClickService.removeListener();
    this.backdrop.close();
    this.backdrop.disconnectResizeObserver();
    this.scrollBlockingService.disable();
  }

  public resume(): void {
    this.status = TourState.ON;
    this.showStep(this.currentStep);
    this.resume$.next();
  }

  public toggle(pause?: boolean): void {
    if (pause) {
      if (this.currentStep) {
        this.pause();
      } else {
        this.resume();
      }
    } else {
      if (this.currentStep) {
        this.end();
      } else {
        this.start();
      }
    }
  }

  public next(): void {
    if (this.waitingForScroll) {
      return;
    }

    this.direction = Direction.Forwards;
    if (this.hasNext(this.currentStep)) {
      this.goToStep(this.loadStep(this.currentStep.nextStep ?? this.getStepIndex(this.currentStep) + 1));
    }
  }

  private getStepIndex(step: T): number {
    const index = this.steps.indexOf(step);

    return index < 0 ? 0 : index;
  }

  public hasNext(step: T): boolean {
    if (!step) {
      console.warn("Can't get next step. No currentStep.");
      return false;
    }
    return (
      step.nextStep !== undefined ||
      (this.getStepIndex(step) < this.steps.length - 1 && !this.isNextOptionalAnchorMissing(step))
    );
  }

  private isNextOptionalAnchorMissing(step: T): boolean {
    const stepIndex = this.getStepIndex(step);

    for (let i = stepIndex + 1; i < this.steps.length; i++) {
      const nextStep = this.steps[i];

      if (!nextStep.isOptional || this.anchors[nextStep.anchorId]) return false;
    }

    return true;
  }

  public prev(): void {
    if (this.waitingForScroll) {
      return;
    }

    this.direction = Direction.Backwards;
    if (this.hasPrev(this.currentStep)) {
      this.goToStep(this.loadStep(this.currentStep.prevStep ?? this.getStepIndex(this.currentStep) - 1));
    }
  }

  public hasPrev(step: T): boolean {
    if (!step) {
      console.warn("Can't get previous step. No currentStep.");
      return false;
    }
    return step.prevStep !== undefined || (this.getStepIndex(step) > 0 && !this.isPrevOptionalAnchorMising(step));
  }

  private isPrevOptionalAnchorMising(step: T): boolean {
    const stepIndex = this.getStepIndex(step);

    for (let i = stepIndex - 1; i > -1; i--) {
      const prevStep = this.steps[i];

      if (!prevStep.isOptional || this.anchors[prevStep.anchorId]) return false;
    }

    return true;
  }

  public goto(stepId: number | string): void {
    this.goToStep(this.loadStep(stepId));
  }

  public register(anchorId: string, anchor: TourAnchorDirective): void {
    if (!anchorId) {
      return;
    }

    if (this.anchors[anchorId]) {
      const step = this.findStepByAnchorId(anchorId),
        duplicateAnchorHandling =
          step?.duplicateAnchorHandling ?? this.userDefaults?.duplicateAnchorHandling ?? 'error';

      switch (duplicateAnchorHandling) {
        case 'error':
          throw new Error(`Tour anchor with id "${anchorId}" already registered!`);
        case 'registerFirst':
          return;
      }
    }

    this.anchors[anchorId] = anchor;
    this.anchorRegister$.next(anchorId);
  }

  private findStepByAnchorId(anchorId: string): T {
    return this.steps.find((step) => step.anchorId === anchorId);
  }

  public unregister(anchorId: string): void {
    if (!anchorId) {
      return;
    }
    delete this.anchors[anchorId];
    this.anchorUnregister$.next(anchorId);
  }

  public getStatus(): TourState {
    return this.status;
  }

  public isHotkeysEnabled(): boolean {
    return this.isHotKeysEnabled;
  }

  private goToStep(step: T): void {
    if (!step) {
      console.warn("Can't go to non-existent step");
      this.end$.error("Can't go to non-existent step");
      this.end();
      return;
    }
    if (this.currentStep) {
      this.backdrop.closeSpotlight();
      this.hideStep(this.currentStep);
    }

    this.anchorClickService.removeListener();

    if (step.route !== undefined && step.route !== null) {
      this.navigateToRouteAndSetStep(step);
    } else {
      this.setCurrentStepAsync(step);
    }
  }

  private listenToOnAnchorClick(step: T) {
    if (step.nextOnAnchorClick) {
      const anchorEl = this.anchors[step.anchorId].element.nativeElement;
      this.anchorClickService.addListener(anchorEl, () => this.next());
    }
  }

  private async navigateToRouteAndSetStep(step: T) {
    const url = typeof step.route === 'string' ? step.route : this.router.createUrlTree(step.route),
      matchOptions: IsActiveMatchOptions = {
        paths: 'exact',
        matrixParams: 'exact',
        queryParams: 'subset',
        fragment: 'exact',
      };

    const isActive = this.router.isActive(url, matchOptions);

    if (isActive) {
      this.setCurrentStepAsync(step);
      return;
    }

    this.navigationStarted = true;
    const navigated = await this.router.navigateByUrl(url);
    this.navigationStarted = false;

    if (!navigated) {
      console.warn('Navigation to route failed: ', step.route);
      this.end$.error(`Navigation to route failed: ${step.route}`);
      this.end();
    } else {
      this.setCurrentStepAsync(step, step.delayAfterNavigation);
    }
  }

  private loadStep(stepId: number | string): T {
    if (typeof stepId === 'number') {
      return this.steps[stepId];
    } else {
      return this.steps.find((step) => step.stepId === stepId);
    }
  }

  private setCurrentStep(step: T): void {
    this.currentStep = step;
    this.showStep(this.currentStep);
  }

  private setCurrentStepAsync(step: T, delay = 0): void {
    delay = delay || step.delayBeforeStepShow;

    setTimeout(() => this.setCurrentStep(step), delay);
  }

  protected async showStep(step: T, skipAsync = false): Promise<void> {
    const anchor = this.anchors[step && step.anchorId];

    if (!anchor) {
      if (step.isAsync && !skipAsync) {
        let anchorRegistered$ = this.anchorRegister$.pipe(
          filter((anchorId) => anchorId === step.anchorId),
          first(),
          delay(0),
        );

        if (step.asyncStepTimeout) {
          anchorRegistered$ = anchorRegistered$.pipe(
            timeout({
              each: step.asyncStepTimeout,
              with: () => of(null),
            }),
          );
        }

        anchorRegistered$.subscribe(() => this.showStep(step, true));
        return;
      }
      if (step.isOptional) {
        this[this.direction === Direction.Forwards ? 'next' : 'prev']();
        return;
      }

      console.warn(`Can't attach to unregistered anchor with id "${step.anchorId}"`);
      this.end$.error(`Can't attach to unregistered anchor with id "${step.anchorId}"`);
      this.end();
      return;
    }
    this.listenToOnAnchorClick(step);
    this.waitingForScroll = true;
    await this.scrollToAnchor(step);
    this.waitingForScroll = false;
    anchor.showTourStep(step);
    this.toggleBackdrop(step);
    this.togglePageScrolling(step);
    this.stepShow$.next({
      step,
      direction: this.direction,
    });
  }

  private hideStep(step: T): void {
    const anchor = this.anchors[step && step.anchorId];
    if (!anchor) {
      return;
    }
    anchor.hideTourStep();
    this.stepHide$.next({
      step,
      direction: this.direction,
    });
  }

  private scrollToAnchor(step: T): Promise<void> {
    if (step.scrollSettings.disableScrollToAnchor) {
      return Promise.resolve();
    }

    const anchor = this.anchors[step?.anchorId],
      htmlElement = anchor.element.nativeElement;

    return this.scrollingService.ensureVisible(htmlElement, step.scrollSettings);
  }

  private toggleBackdrop(step: T) {
    const anchor = this.anchors[step?.anchorId];

    if (step.enableBackdrop) {
      this.backdrop.show(anchor.element, step);
    } else {
      this.backdrop.close();
    }
  }

  private togglePageScrolling(step: T) {
    if (step.scrollSettings.disablePageScrolling) {
      this.scrollBlockingService.enable(step.scrollSettings.scrollContainer);
    } else {
      this.scrollBlockingService.disable();
    }
  }
}
