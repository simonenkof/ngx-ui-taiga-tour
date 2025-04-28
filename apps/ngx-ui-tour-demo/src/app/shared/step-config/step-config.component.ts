import { ChangeDetectionStrategy, Component, ContentChild, Input } from '@angular/core';
import { TuiAddonDoc } from '@taiga-ui/addon-doc';
import type { IStepOption } from 'ngx-ui-tour-tui-hint';
import { HeaderComponent } from '../header/header.component';
import { ProxyTourAnchorDirective } from '../proxy-tour-anchor.directive';
import { PlacementConfigComponent } from './placement-config.component';

@Component({
  selector: 'app-step-config',
  templateUrl: './step-config.component.html',
  styleUrls: ['./step-config.component.scss'],
  imports: [HeaderComponent, TuiAddonDoc, ProxyTourAnchorDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepConfigComponent {
  @Input()
  isCloseOnOutsideClickVisible = false;

  @Input()
  isIonicShowArrowVisible = false;

  @Input()
  isIonicTrapFocusVisible = false;

  @Input()
  isMdMenuShowArrowVisible = false;

  @Input()
  isUseLegacyTitleVisible = false;

  @ContentChild(PlacementConfigComponent)
  placementConfig: PlacementConfigComponent;

  readonly duplicateAnchorHandlingValues: IStepOption['duplicateAnchorHandling'][] = [
    'error',
    'registerFirst',
    'registerLast',
  ];
}
