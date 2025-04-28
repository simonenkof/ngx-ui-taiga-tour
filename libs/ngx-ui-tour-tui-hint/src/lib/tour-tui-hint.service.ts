import { Injectable } from '@angular/core';
import { TourService } from '../core/public_api';
import type { ITuiHintStepOption } from './step-option.interface';

@Injectable({
  providedIn: 'root',
})
export class TourTuiHintService<T extends ITuiHintStepOption = ITuiHintStepOption> extends TourService<T> {}
