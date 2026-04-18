import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    rn: 'src/rn.tsx',
    flipper: 'src/flipper.ts',
    'adapters/redux': 'src/adapters/redux.ts',
    'adapters/zustand': 'src/adapters/zustand.ts',
    'adapters/jotai': 'src/adapters/jotai.ts',
    'adapters/query': 'src/adapters/query.ts',
    'adapters/valtio': 'src/adapters/valtio.ts',
    'adapters/mobx': 'src/adapters/mobx.tsx',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  target: 'es2020',
  external: [
    'react',
    'react-native',
    'react-native-flipper',
    'react-redux',
    'zustand',
    'jotai',
    '@tanstack/react-query',
    'valtio',
    'mobx-react-lite',
    'mobx',
  ],
});
