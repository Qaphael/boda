# Boda App — Bottom Sheet, Map & Keyboard Patterns
## Agent Reference Guide (Apply to ALL screens)

This document is the authoritative pattern for every screen in the Boda ride-hailing app
(React Native, Expo Managed Workflow). Every screen you build or modify must follow these
patterns unless explicitly told otherwise by the developer.

---

## 1. Required Libraries

These must already be installed. If any are missing, install them before writing screen code.

```bash
npx expo install @gorhom/bottom-sheet react-native-gesture-handler react-native-reanimated
```

Root `app.json` or `babel.config.js` must include the Reanimated plugin:

```js
// babel.config.js
module.exports = function (config) {
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'], // MUST be last
  };
};
```

Root component (App.js or _layout.tsx) MUST wrap everything in `<GestureHandlerRootView>`:

```jsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* rest of app / navigation */}
    </GestureHandlerRootView>
  );
}
```

---

## 2. Screen Categories

Every screen in Boda falls into one of these two categories. Identify which applies before
writing any code.

### Category A — Map + Sheet Screen
Has a full-screen map (WebView/Leaflet) with a bottom sheet floating over it.
Examples: HomeScreen, NewBookingScreen, TrackingScreen, RiderHomeScreen

### Category B — Sheet-Only Screen
No map. Content lives in a scrollable sheet or plain scroll view.
Examples: ProfileScreen, SettingsScreen, ActivityScreen, WalletScreen

---

## 3. Category A: Map + Sheet Screen — Full Pattern

### 3.1 Structure

```
<GestureHandlerRootView>           ← Already in App root, don't repeat
  <View style={{flex:1}}>
    <WebView />                    ← Full screen, absoluteFill, zIndex 0
    <AbsoluteOverlays />           ← Status pill, recenter button, zIndex 10
    <BottomSheet>                  ← zIndex 20+, handles everything
      <BottomSheetScrollView>      ← or BottomSheetFlatList
        <BottomSheetTextInput />   ← ONLY use this for inputs inside sheets
      </BottomSheetScrollView>
    </BottomSheet>
  </View>
</GestureHandlerRootView>
```

### 3.2 Snap Points

Always define snap points as percentages from the bottom of the screen.

```js
// Standard 3-point sheet (most screens)
const snapPoints = useMemo(() => ['25%', '50%', '90%'], []);

// Input-heavy sheet (booking, search) — starts higher
const snapPoints = useMemo(() => ['50%', '90%'], []);

// Tracking/status sheet — minimal info, mostly map
const snapPoints = useMemo(() => ['20%', '45%'], []);
```

### 3.3 Map Adjustment on Sheet Movement

The map must always be visually centered above the sheet, not behind it.
Use the sheet's animated index to inject padding into Leaflet via the WebView.

```jsx
import BottomSheet, { useBottomSheetSpringConfigs } from '@gorhom/bottom-sheet';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  interpolate,
} from 'react-native-reanimated';
import { Dimensions } from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const webViewRef = useRef(null);
const sheetRef = useRef(null);
const animatedIndex = useSharedValue(0);   // tracks which snap point is active

// Called every time sheet position changes
const handleSheetChange = useCallback((index) => {
  animatedIndex.value = index;

  // Inject bottom padding into Leaflet so map center sits above sheet
  const snapPercents = [0.25, 0.50, 0.90]; // match your snapPoints
  const sheetHeight = SCREEN_HEIGHT * (snapPercents[index] ?? 0.25);

  if (webViewRef.current) {
    webViewRef.current.injectJavaScript(`
      map.invalidateSize();
      map.panBy([0, -${sheetHeight / 4}], { animate: false });
      true;
    `);
  }
}, []);
```

### 3.4 Full Category A Template

Copy this as the starting point for any Map + Sheet screen:

```jsx
import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import * as Location from 'expo-location';
import { colors, typography, spacing, radius } from '../theme';

const GULU_CENTER = { latitude: 2.7700, longitude: 32.2900 };

export default function SomeMapScreen({ navigation }) {
  const webViewRef = useRef(null);
  const sheetRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [mapReady, setMapReady] = useState(false);

  // SNAP POINTS — adjust per screen
  const snapPoints = useMemo(() => ['25%', '55%', '90%'], []);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    })();
  }, []);

  const handleSheetChange = useCallback((index) => {
    const snapPercents = [0.25, 0.55, 0.90];
    const sheetHeight = Dimensions.get('window').height * (snapPercents[index] ?? 0.25);
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        map.invalidateSize();
        map.panBy([0, -${Math.round(sheetHeight / 4)}], { animate: false });
        true;
      `);
    }
  }, []);

  const recenter = () => {
    if (location && webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `map.setView([${location.latitude}, ${location.longitude}], 16, { animate: true }); true;`
      );
    }
  };

  const center = location || GULU_CENTER;

  return (
    <View style={styles.container}>
      {/* MAP — always full screen, always behind sheet */}
      <WebView
        ref={webViewRef}
        source={{ html: buildMapHTML(center.latitude, center.longitude) }}
        style={StyleSheet.absoluteFill}
        originWhitelist={['*']}
        javaScriptEnabled
        onLoadEnd={() => setMapReady(true)}
      />

      {/* ABSOLUTE OVERLAYS */}
      <TouchableOpacity style={styles.recenterBtn} onPress={recenter}>
        <Text style={styles.recenterIcon}>◎</Text>
      </TouchableOpacity>

      {/* BOTTOM SHEET */}
      <BottomSheet
        ref={sheetRef}
        index={0}
        snapPoints={snapPoints}
        onChange={handleSheetChange}
        handleIndicatorStyle={styles.grabber}
        backgroundStyle={styles.sheetBackground}
        keyboardBehavior="interactive"       // ← key: sheet rises with keyboard
        keyboardBlurBehavior="restore"       // ← drops back when keyboard closes
        android_keyboardInputMode="adjustResize"
      >
        <BottomSheetScrollView
          contentContainerStyle={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* CONTENT HERE */}
          <Text style={styles.title}>Screen Title</Text>

          {/* ALWAYS use BottomSheetTextInput for inputs inside sheets */}
          <BottomSheetTextInput
            style={styles.input}
            placeholder="Where to?"
            placeholderTextColor={colors.onSurfaceVariant}
          />
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  recenterBtn: {
    position: 'absolute',
    right: 16,
    top: 120,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    zIndex: 10,
  },
  recenterIcon: { fontSize: 22, color: colors.onSurface },
  sheetBackground: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  grabber: {
    backgroundColor: colors.outlineVariant,
    width: 40,
  },
  sheetContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  title: {
    ...typography.headlineLgMobile,
    color: colors.onBackground,
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    ...typography.bodyMd,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
});
```

---

## 4. Category B: Sheet-Only Screen — Full Pattern

No map. Use a regular `ScrollView` but still wrap inputs in `KeyboardAvoidingView`.

```jsx
import {
  View, Text, ScrollView, KeyboardAvoidingView,
  TextInput, Platform, StyleSheet,
} from 'react-native';
import { colors, typography, spacing, radius } from '../theme';

export default function SomeFormScreen({ navigation }) {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* CONTENT AND INPUTS HERE */}
        <TextInput
          style={styles.input}
          placeholder="Enter value"
          placeholderTextColor={colors.onSurfaceVariant}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  input: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    ...typography.bodyMd,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
});
```

---

## 5. Input Rules — Always Follow These

| Situation | Component to use |
|---|---|
| Input inside a `BottomSheet` | `BottomSheetTextInput` from `@gorhom/bottom-sheet` |
| Input in a plain screen (no sheet) | Regular `TextInput` inside `KeyboardAvoidingView` |
| Input inside a `BottomSheetFlatList` | `BottomSheetTextInput` |
| Multi-line input inside sheet | `BottomSheetTextInput` with `multiline` prop |

Never use a plain `TextInput` inside a `BottomSheet`. It will not respond to the keyboard correctly on Android.

---

## 6. Leaflet / WebView Map — Standard HTML Template

Use this `buildMapHTML` function across all map screens. It includes:
- `invalidateSize()` readiness
- `recenterMap()` and `updateMarkers()` JS hooks
- Mobile-friendly viewport settings

```js
export function buildMapHTML(lat, lng, markers = []) {
  const markerJS = markers.map(m => `
    L.marker([${parseFloat(m.lat)}, ${parseFloat(m.lng)}], {
      icon: L.divIcon({
        className: '',
        html: '${m.html || '<div style="width:28px;height:28px;border-radius:50%;background:#fde047;border:2px solid #6d5e00;display:flex;align-items:center;justify-content:center;font-size:14px;">&#x1F6F5;</div>'}',
        iconSize: [28, 28], iconAnchor: [14, 14]
      })
    }).addTo(map).bindPopup('${m.popup || ''}');
  `).join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    #map { width:100vw; height:100vh; }
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', {
    zoomControl: false,
    attributionControl: false,
  }).setView([${lat}, ${lng}], 16);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(map);

  var userMarker = L.circleMarker([${lat}, ${lng}], {
    radius: 7, fillColor: '#0050cb', color: '#fff', weight: 3, fillOpacity: 1
  }).addTo(map);

  ${markerJS}

  // Called from React Native to recenter
  window.recenterMap = function(lat, lng) {
    userMarker.setLatLng([lat, lng]);
    map.setView([lat, lng], 16, { animate: true });
  };

  // Called from React Native to refresh markers
  window.updateMarkers = function(markersJson) {
    var data = JSON.parse(markersJson);
    map.eachLayer(function(layer) {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });
    data.forEach(function(m) {
      L.marker([parseFloat(m.lat), parseFloat(m.lng)], {
        icon: L.divIcon({
          className: '',
          html: m.html || '',
          iconSize: [28, 28], iconAnchor: [14, 14]
        })
      }).addTo(map).bindPopup(m.popup || '');
    });
  };

  // Called from React Native when sheet moves to refit map
  window.adjustForSheet = function(bottomPaddingPx) {
    map.invalidateSize();
    map.panBy([0, -(bottomPaddingPx / 4)], { animate: false });
  };
</script>
</body>
</html>`;
}
```

Place this function in `src/utils/mapHTML.js` and import it wherever needed.

---

## 7. Reusable Components to Build Once

Build these components once in `src/components/` and reuse across all screens:

### `MapWebView.jsx`
Wraps WebView with ref forwarding, `onLoadEnd`, and standard props.

### `SheetTextInput.jsx`
Wraps `BottomSheetTextInput` with Boda's standard styling (border, radius, color, font).

### `RecenterButton.jsx`
The floating ◎ button — absolute positioned, consistent styling.

### `StatusPill.jsx`
The top status indicator (already in HomeScreen, extract it).

### `Grabber.jsx`
Already exists — keep using it (or let `@gorhom/bottom-sheet` handle it via `handleIndicatorStyle`).

---

## 8. Common Mistakes — Never Do These

1. **Never use plain `TextInput` inside a `BottomSheet`** — always `BottomSheetTextInput`
2. **Never nest `ScrollView` inside `BottomSheet`** — use `BottomSheetScrollView` or `BottomSheetFlatList`
3. **Never use `KeyboardAvoidingView` on a Map+Sheet screen** — `@gorhom/bottom-sheet` handles it via `keyboardBehavior="interactive"`
4. **Never forget `true;` at the end of `injectJavaScript` strings** — WebView will throw a warning
5. **Never hardcode snap points as pixel values** — always use percentages so it works on all screen sizes
6. **Never put the sheet inside a `position: absolute` View** — pass it as a sibling to the map View
7. **Never skip `GestureHandlerRootView`** — gestures will silently fail without it

---

## 9. Screen-Specific Snap Point Recommendations

| Screen | Snap Points | Notes |
|---|---|---|
| HomeScreen | `['25%', '55%']` | Recent activity, action cards |
| NewBookingScreen | `['55%', '90%']` | Has inputs, start high |
| TrackingScreen | `['20%', '45%']` | Mostly map, minimal sheet |
| DeliveryDetailsScreen | `['60%', '90%']` | Form-heavy |
| RiderHomeScreen | `['15%', '40%']` | Rider sees mostly map |
| SearchScreen | `['70%', '95%']` | Almost full screen, search inputs |
| BookingDetailScreen | `['40%', '85%']` | Summary info + actions |

---

## 10. Quick Checklist Before Submitting Any Screen

- [ ] Is `GestureHandlerRootView` in the app root?
- [ ] Is the Reanimated babel plugin the last plugin in `babel.config.js`?
- [ ] Are snap points percentages, not pixels?
- [ ] Does the sheet have `keyboardBehavior="interactive"`?
- [ ] Are all inputs inside the sheet using `BottomSheetTextInput`?
- [ ] Does every `injectJavaScript` call end with `; true;`?
- [ ] Is the WebView a sibling of BottomSheet (not a parent or child)?
- [ ] Is `map.invalidateSize()` called when the sheet changes snap point?
