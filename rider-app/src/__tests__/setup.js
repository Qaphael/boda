import { vi } from 'vitest';

global.__DEV__ = true;

vi.mock('react-native', () => {
  const React = require('react');
  const component = (name) => (props) => React.createElement(name, props);
  return {
    __esModule: true,
    default: {
      Platform: { OS: 'android', select: (obj) => obj.android || obj.default },
      Dimensions: { get: () => ({ width: 375, height: 812, scale: 2, fontScale: 1 }) },
      StyleSheet: { create: (s) => s, flatten: (s) => s, absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, absoluteFillObject: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } },
      PixelRatio: { get: () => 2, getFontScale: () => 1, getPixelSizeForLayoutSize: (s) => s * 2 },
      Linking: { openURL: vi.fn(), canOpenURL: vi.fn(() => Promise.resolve(true)) },
      Keyboard: { dismiss: vi.fn(), addListener: vi.fn(() => ({ remove: vi.fn() })), removeListener: vi.fn() },
      ScrollView: component('ScrollView'),
      Modal: component('Modal'),
    },
    View: component('View'),
    Text: component('Text'),
    TouchableOpacity: component('TouchableOpacity'),
    TouchableHighlight: component('TouchableHighlight'),
    TouchableWithoutFeedback: component('TouchableWithoutFeedback'),
    TextInput: component('TextInput'),
    Switch: component('Switch'),
    ScrollView: component('ScrollView'),
    FlatList: component('FlatList'),
    ActivityIndicator: component('ActivityIndicator'),
    Image: component('Image'),
    KeyboardAvoidingView: component('KeyboardAvoidingView'),
    Platform: { OS: 'android', select: (obj) => obj.android || obj.default },
    Dimensions: { get: () => ({ width: 375, height: 812, scale: 2, fontScale: 1 }), addEventListener: vi.fn(), removeEventListener: vi.fn() },
    StyleSheet: { create: (s) => s, flatten: (s) => s, absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, absoluteFillObject: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } },
    PixelRatio: { get: () => 2, getFontScale: () => 1 },
    Linking: { openURL: vi.fn() },
    Keyboard: { dismiss: vi.fn() },
    RefreshControl: component('RefreshControl'),
    SafeAreaView: component('SafeAreaView'),
    StatusBar: { setBarStyle: vi.fn(), setBackgroundColor: vi.fn() },
    Alert: { alert: vi.fn() },
    Pressable: component('Pressable'),
  };
});

vi.mock('@testing-library/react-native', () => {
  const React = require('react');
  return {
    render: (component) => {
      return {
        container: {},
        getByText: (text) => ({ textContent: text, closest: () => null }),
        queryByText: (text) => null,
        getByTestId: (id) => ({ testID: id }),
        queryByTestId: (id) => null,
        getByPlaceholderText: (text) => ({ placeholder: text }),
        getByDisplayValue: (text) => ({ value: text }),
        getByRole: (role) => ({ role }),
        UNSAFE_getByType: () => null,
        UNSAFE_getAllByType: () => [],
        rerender: vi.fn(),
        unmount: vi.fn(),
        debug: vi.fn(),
        toJSON: () => null,
      };
    },
    fireEvent: {
      press: vi.fn(),
      changeText: vi.fn(),
      scroll: vi.fn(),
    },
    waitFor: async (fn) => { try { fn(); } catch (e) {} },
    act: async (fn) => { await fn(); },
    renderHook: (hook) => {
      let result = { current: null };
      let cleanup = vi.fn();
      const TestComponent = () => { result.current = hook(); return null; };
      return { result, unmount: cleanup, rerender: vi.fn() };
    },
  };
});

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

vi.mock('expo-image-manipulator', () => ({
  default: {
    manipulateAsync: vi.fn(() => Promise.resolve({ uri: 'file://test.jpg' })),
  },
}));

vi.mock('expo-modules-core', () => {
  class NativeModule {}
  return {
    EventEmitter: class EventEmitter {
      addListener() { return { remove() {} }; }
      removeListener() {}
      removeAllListeners() {}
      emit() {}
    },
    NativeModule,
    requireNativeModule: vi.fn(() => new NativeModule()),
    requireOptionalNativeModule: vi.fn(() => null),
    Platform: { OS: 'android' },
  };
});

vi.mock('expo-file-system', () => ({
  documentDirectory: 'file://test/',
  cacheDirectory: 'file://cache/',
  readAsStringAsync: vi.fn(() => Promise.resolve('')),
  writeAsStringAsync: vi.fn(() => Promise.resolve()),
}));

vi.mock('expo-navigation-bar', () => ({
  setBackgroundColorAsync: vi.fn(),
  setButtonStyleAsync: vi.fn(),
}));

vi.mock('expo-status-bar', () => ({
  StatusBar: (props) => null,
}));

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

vi.mock('react-native-reanimated', () => ({
  default: {
    createAnimatedComponent: (c) => c,
    Value: vi.fn(),
    event: vi.fn(),
    add: vi.fn(),
    eq: vi.fn(),
    set: vi.fn(),
    cond: vi.fn(),
    interpolate: vi.fn(),
    Extrapolate: { CLAMP: 'clamp', EXTEND: 'extend' },
  },
  useAnimatedStyle: vi.fn(() => ({})),
  useSharedValue: vi.fn(() => ({ value: 0 })),
  withSpring: vi.fn((v) => v),
  withTiming: vi.fn((v) => v),
  interpolate: vi.fn(() => 0),
  Extrapolate: { CLAMP: 'clamp', EXTEND: 'extend' },
  Easing: { linear: vi.fn(), ease: vi.fn() },
}));

vi.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const BottomSheet = React.forwardRef((props, ref) => React.createElement('BottomSheet', { ref, ...props }));
  const BottomSheetScrollView = (props) => React.createElement('BottomSheetScrollView', props);
  const BottomSheetTextInput = (props) => React.createElement('BottomSheetTextInput', props);
  const BottomSheetFlatList = (props) => React.createElement('BottomSheetFlatList', props);
  return {
    __esModule: true,
    default: BottomSheet,
    BottomSheetScrollView,
    BottomSheetTextInput,
    BottomSheetFlatList,
  };
});

vi.mock('react-native-webview', () => {
  const React = require('react');
  return {
    WebView: React.forwardRef((props, ref) => React.createElement('WebView', { ref, ...props })),
  };
});

vi.mock('../components/useModal', () => ({
  useModal: () => ({
    modal: null,
    showModal: vi.fn(),
    hideModal: vi.fn(),
    ModalComponent: () => null,
  }),
}));

vi.mock('../components/AppModal', () => ({
  default: (props) => null,
}));

vi.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: vi.fn(),
    replace: vi.fn(),
    goBack: vi.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  useSafeAreaInsets: () => ({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  }),
  useFocusEffect: (cb) => cb(),
  NavigationContainer: (props) => props.children,
  CommonActions: { navigate: vi.fn(), goBack: vi.fn() },
  useNavigationState: vi.fn(() => 0),
  useIsFocused: vi.fn(() => true),
  StackActions: { push: vi.fn(), replace: vi.fn(), pop: vi.fn() },
}));
