import { getRenderHistory } from './useWhyRender';
import type { RenderEvent } from './types';

export const useRenderHistory = (name: string): RenderEvent[] =>
  getRenderHistory(name);
