import { describe, it, expect, afterEach } from 'vitest';
import {
  enableWhyRender,
  disableWhyRender,
} from '../src/global';
import {
  shouldTrack,
  isRenderKindReportable,
  getGlobalIgnoredProps,
  isReasonIgnored,
} from '../src/global';

describe('global config', () => {
  afterEach(() => disableWhyRender());

  it('tracks everything by default', () => {
    expect(shouldTrack('Anything')).toBe(true);
  });

  it('include filter restricts tracked components', () => {
    enableWhyRender({ include: [/^User/, 'Header'] });
    expect(shouldTrack('UserCard')).toBe(true);
    expect(shouldTrack('Header')).toBe(true);
    expect(shouldTrack('Footer')).toBe(false);
  });

  it('exclude filter blocks matched components', () => {
    enableWhyRender({ exclude: [/Provider$/] });
    expect(shouldTrack('ThemeProvider')).toBe(false);
    expect(shouldTrack('UserCard')).toBe(true);
  });

  it('ignore.components takes precedence', () => {
    enableWhyRender({ ignore: { components: ['Spinner'] } });
    expect(shouldTrack('Spinner')).toBe(false);
  });

  it('level silent makes nothing reportable', () => {
    enableWhyRender({ level: 'silent' });
    expect(isRenderKindReportable('some-changed-ref')).toBe(false);
    expect(isRenderKindReportable('nothing-changed')).toBe(false);
  });

  it('level all includes all-changed', () => {
    enableWhyRender({ level: 'all' });
    expect(isRenderKindReportable('all-changed')).toBe(true);
    expect(isRenderKindReportable('initial')).toBe(false);
  });

  it('level warn (default) filters all-changed', () => {
    enableWhyRender({ level: 'warn' });
    expect(isRenderKindReportable('all-changed')).toBe(false);
    expect(isRenderKindReportable('some-changed-ref')).toBe(true);
  });

  it('exposes global ignored props', () => {
    enableWhyRender({ ignore: { props: ['style', 'className'] } });
    expect(getGlobalIgnoredProps()).toEqual(['style', 'className']);
  });

  it('exposes ignored reasons', () => {
    enableWhyRender({ ignore: { reasons: ['kind:nothing-changed'] } });
    expect(isReasonIgnored('kind:nothing-changed')).toBe(true);
  });

  it('disposer clears config', () => {
    const dispose = enableWhyRender({ include: ['X'] });
    expect(shouldTrack('Y')).toBe(false);
    dispose();
    expect(shouldTrack('Y')).toBe(true);
  });
});
