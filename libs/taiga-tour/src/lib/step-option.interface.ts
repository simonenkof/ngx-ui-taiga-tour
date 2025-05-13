import type { TuiHintDirection } from '@taiga-ui/core';
import type { IStepOption } from '../core/public_api';

export interface ITuiHintStepOption extends IStepOption {
  placement?: TuiHintDirection;
}
