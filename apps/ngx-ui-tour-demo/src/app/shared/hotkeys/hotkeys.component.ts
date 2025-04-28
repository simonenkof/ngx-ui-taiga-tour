import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ProxyTourAnchorDirective } from '../proxy-tour-anchor.directive';
import { HeaderComponent } from '../header/header.component';
import { LIST_COMPONENTS } from '../list';

@Component({
  selector: 'app-hotkeys',
  templateUrl: './hotkeys.component.html',
  styleUrls: ['./hotkeys.component.scss'],
  imports: [HeaderComponent, ProxyTourAnchorDirective, LIST_COMPONENTS],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HotkeysComponent {
  hotkeys: Hotkey[] = [
    {
      key: 'left arrow',
      action: 'Previous step',
    },
    {
      key: 'right arrow',
      action: 'Next step',
    },
    {
      key: 'esc',
      action: 'End tour',
    },
  ];
}

interface Hotkey {
  key: string;
  action: string;
}
