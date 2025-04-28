import { NgTemplateOutlet } from '@angular/common';
import {
  type AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  inject,
  Input,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { TourHotkeyListenerComponent } from '../../core/public_api';
import type { ITuiHintStepOption } from '../step-option.interface';
import { TourStepTemplateService } from '../tour-step-template.service';
import { TourTuiHintService } from '../tour-tui-hint.service';
import { TourDefaultStepTemplateComponent } from './tour-default-step-template/tour-default-step-template.component';

@Component({
  selector: 'tour-step-template',
  templateUrl: './tour-step-template.component.html',
  imports: [NgTemplateOutlet, TourDefaultStepTemplateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TourStepTemplateComponent extends TourHotkeyListenerComponent implements AfterViewInit {
  @Input()
  stepTemplate: TemplateRef<{ step: ITuiHintStepOption }>;

  @ContentChild(TemplateRef)
  stepTemplateContent: TemplateRef<{ step: ITuiHintStepOption }>;

  @ViewChild('tuiDropdownTemplate')
  template: TemplateRef<never>;

  step: ITuiHintStepOption = {};

  protected override readonly tourService = inject(TourTuiHintService);
  private readonly tourStepTemplateService = inject(TourStepTemplateService);

  ngAfterViewInit() {
    this.tourStepTemplateService.templateComponent = this;
  }
}
