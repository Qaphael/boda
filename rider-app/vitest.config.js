import { defineConfig } from 'vitest/config';
import path from 'path';

const mocksDir = path.resolve(__dirname, 'src/__mocks__');

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.js'],
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    globals: true,
    alias: {
      '@gorhom/bottom-sheet': path.join(mocksDir, 'bottomSheet.js'),
      'react-native-reanimated': path.join(mocksDir, 'reanimated.js'),
      'react-native-gesture-handler': path.join(mocksDir, 'gestureHandler.js'),
      'react-native-safe-area-context': path.join(mocksDir, 'safeAreaContext.js'),
    },
  },
  esbuild: {
    loader: 'jsx',
    include: /.*\.jsx?$/,
    exclude: [],
  },
});
