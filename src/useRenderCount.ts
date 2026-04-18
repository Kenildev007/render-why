import { useRef } from 'react';
import { canRun } from './dev';

export function useRenderCount(): number {
  const ref = useRef(0);
  if (canRun()) ref.current++;
  return ref.current;
}
