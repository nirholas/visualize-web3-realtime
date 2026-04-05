import { basicPreset } from './basic';
import { websocketPreset } from './websocket';
import { customThemePreset } from './custom-theme';
import { physicsPreset } from './physics';
import { largeDatasetPreset } from './large-dataset';

export interface Preset {
  name: string;
  description: string;
  code: string;
}

export const presets: Preset[] = [
  basicPreset,
  websocketPreset,
  customThemePreset,
  physicsPreset,
  largeDatasetPreset,
];
