import { vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(() => Promise.resolve(null)),
    setItem: vi.fn(() => Promise.resolve()),
    removeItem: vi.fn(() => Promise.resolve()),
    clear: vi.fn(() => Promise.resolve()),
    multiRemove: vi.fn(() => Promise.resolve()),
  },
  getItem: vi.fn(() => Promise.resolve(null)),
  setItem: vi.fn(() => Promise.resolve()),
  removeItem: vi.fn(() => Promise.resolve()),
  clear: vi.fn(() => Promise.resolve()),
  multiRemove: vi.fn(() => Promise.resolve()),
}));

vi.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: vi.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  getCurrentPositionAsync: vi.fn(() =>
    Promise.resolve({
      coords: {
        latitude: 2.7700,
        longitude: 32.2900,
      },
    })
  ),
}));

vi.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: vi.fn(() =>
    Promise.resolve({ canceled: false, assets: [{ uri: 'file://test.jpg' }] })
  ),
  MediaTypeOptions: { Images: 'Images' },
}));

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

vi.mock('@react-navigation/native', () => ({
  ...vi.importActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: vi.fn(),
    replace: vi.fn(),
    goBack: vi.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
}));
