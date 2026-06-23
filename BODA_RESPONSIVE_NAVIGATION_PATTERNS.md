# Boda App — Responsiveness, Navigation & Safe Area Patterns
## Agent Reference Guide (Apply to ALL screens)

This is Part 2 of the Boda pattern system. Always use this together with
`BODA_SHEET_MAP_PATTERNS.md`. Every rule here applies to every screen unless
the developer explicitly overrides it.

---

## 1. Required Libraries

```bash
npx expo install react-native-safe-area-context expo-status-bar expo-navigation-bar
```

These must be installed. Never use React Native's built-in `StatusBar` from `react-native`
— always use `expo-status-bar` instead.

---

## 2. Root App Setup (Do This Once, Never Repeat Per Screen)

`App.js` or the root `_layout.tsx` must wrap everything like this, in this exact order:

```jsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        {/* NavigationContainer and everything else goes here */}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

**Order matters:**
- `GestureHandlerRootView` is outermost — required for bottom sheet gestures
- `SafeAreaProvider` is second — required for `useSafeAreaInsets()` to work anywhere
- `StatusBar` from expo — controls the notification bar appearance globally

---

## 3. Understanding Safe Areas on Android (Especially Important for Gulu Users)

Ugandan Android users will use a wide range of phones — budget devices with thick status
bars, newer ones with punch-hole cameras, some with gesture navigation, some with button
navigation. Safe areas handle all of this automatically.

### The Three Zones Every Screen Must Respect

```
┌─────────────────────────────────┐
│  STATUS BAR (notification area) │  ← insets.top
│  Time, battery, signal, etc.    │
├─────────────────────────────────┤
│                                 │
│         CONTENT AREA            │  ← Your UI goes here
│                                 │
├─────────────────────────────────┤
│  HOME BAR / NAV BUTTONS         │  ← insets.bottom
│  (gesture bar or 3-button nav)  │
└─────────────────────────────────┘
```

### How to Use Safe Area Insets

```jsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* content */}
    </View>
  );
}
```

### When to Use Which Approach

| Situation | What to use |
|---|---|
| Regular screen with a header | `useSafeAreaInsets()` + `paddingTop: insets.top` on the header |
| Full screen map (HomeScreen, Tracking) | Don't pad the map — but pad overlays that sit at the top |
| Bottom sheet bottom padding | `paddingBottom: insets.bottom + 16` on sheet content |
| Fixed bottom buttons (Confirm, CTA) | `paddingBottom: insets.bottom || 16` |
| Modal screens | SafeAreaView wrapping the modal content |
| Tab bar | Handled by React Navigation automatically |

---

## 4. Status Bar (Notification Bar) Rules

### Never Use React Native's Built-in StatusBar

```jsx
// ❌ NEVER DO THIS
import { StatusBar } from 'react-native';

// ✅ ALWAYS DO THIS
import { StatusBar } from 'expo-status-bar';
```

### Per-Screen Status Bar Configuration

Each screen category needs a specific status bar style:

```jsx
// Map screens (HomeScreen, NewBooking, Tracking)
// Map is behind status bar — use translucent dark icons on light map tiles
<StatusBar style="dark" translucent backgroundColor="transparent" />

// Sheet-only screens (Profile, Settings, Activity)
// Normal white background — dark icons
<StatusBar style="dark" backgroundColor={colors.surface} />

// Dark/night mode screens or modals with dark headers
<StatusBar style="light" backgroundColor={colors.onBackground} />
```

### Making the Map Go Edge-to-Edge (Behind Status Bar)

For map screens, the map should render behind the status bar for a full-bleed look.
This requires setting the status bar to translucent:

```jsx
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { useEffect } from 'react';

export default function HomeScreen() {
  useEffect(() => {
    // Make Android nav bar transparent too
    NavigationBar.setBackgroundColorAsync('transparent');
    NavigationBar.setButtonStyleAsync('dark');
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <WebView style={StyleSheet.absoluteFill} ... />
      {/* Top overlay must account for status bar height */}
      <StatusPill insetTop={insets.top} />
    </View>
  );
}
```

Then in your StatusPill or top overlays:

```jsx
// Push overlays below the status bar
const insets = useSafeAreaInsets();

<View style={[styles.statusBar, { top: insets.top + 8 }]}>
  {/* pill content */}
</View>
```

---

## 5. Navigation Patterns

### 5.1 Stack Navigator Configuration

All map/ride screens should use a headerless stack so there's no double header:

```jsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

// In your navigator:
<Stack.Navigator
  screenOptions={{
    headerShown: false,          // We build custom headers
    contentStyle: { backgroundColor: colors.background },
    animation: 'slide_from_right',
  }}
>
  <Stack.Screen name="Home" component={HomeScreen} />
  <Stack.Screen name="NewBooking" component={NewBookingScreen} />
  <Stack.Screen
    name="Tracking"
    component={TrackingScreen}
    options={{ gestureEnabled: false }} // Prevent swipe-back during active ride
  />
</Stack.Navigator>
```

### 5.2 Custom Back Button Pattern

Since headers are hidden, every non-root screen needs its own back button.
Use this consistent component:

```jsx
// src/components/BackButton.jsx
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

export default function BackButton({ onPress, light = false }) {
  const insets = useSafeAreaInsets();
  return (
    <TouchableOpacity
      style={[styles.btn, { top: insets.top + 8 }]}
      onPress={onPress}
      activeOpacity={0.8}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <Text style={[styles.icon, light && styles.iconLight]}>←</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  icon: { fontSize: 20, color: colors.onSurface },
  iconLight: { color: '#fff' },
});
```

Usage on any map screen:

```jsx
<BackButton onPress={() => navigation.goBack()} />
```

### 5.3 Tab Navigator Configuration

If you have a bottom tab bar, configure it to respect safe areas:

```jsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();

function TabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom || 8 }]}>
      {/* tab items */}
    </View>
  );
}

// Tab bar must never overlap the bottom sheet
// Set tabBarStyle to position: 'absolute' and give bottom sheets
// a paddingBottom that accounts for tab bar height + insets.bottom
```

---

## 6. Responsive Sizing System

Never hardcode pixel sizes. Every dimension must be derived from screen size or
the spacing/radius system in `theme.js`.

### 6.1 Screen Dimension Utilities

Create `src/utils/responsive.js` and use it everywhere:

```js
import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Percentage of screen width
export const wp = (percent) => (SCREEN_W * percent) / 100;

// Percentage of screen height
export const hp = (percent) => (SCREEN_H * percent) / 100;

// Scale a size relative to a 375px baseline (iPhone SE / mid-range Android)
export const scale = (size) => (SCREEN_W / 375) * size;

// Scale fonts — more conservative than scale()
export const fontScale = (size) => size * PixelRatio.getFontScale();

// Clamp a value between min and max
export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

// Responsive font size — won't get too huge on tablets or too tiny on small phones
export const rs = (size) => clamp(scale(size), size * 0.85, size * 1.2);

export { SCREEN_W, SCREEN_H };
```

Usage:

```jsx
import { wp, hp, rs, scale } from '../utils/responsive';

const styles = StyleSheet.create({
  card: {
    width: wp(90),           // 90% of screen width
    minHeight: hp(12),       // 12% of screen height
    borderRadius: scale(16), // scales with screen
  },
  title: {
    fontSize: rs(18),        // responsive font size
  },
});
```

### 6.2 Touch Target Rule

Every tappable element must be at least 44×44 logical pixels (Apple HIG and
Android Material guidelines). This is especially important for Boda where users
will be tapping on moving boda bodas.

```jsx
// ✅ Correct — explicitly sized touch targets
<TouchableOpacity
  style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} // extends tap area beyond visual bounds
>
  <Text>Tap me</Text>
</TouchableOpacity>

// ❌ Wrong — tiny icon with no touch padding
<TouchableOpacity onPress={...}>
  <Text style={{ fontSize: 12 }}>✕</Text>
</TouchableOpacity>
```

### 6.3 Text Scaling (Accessibility)

Android users can increase system font size. Protect layouts from breaking:

```jsx
// In all Text components that must not scale:
<Text allowFontScaling={false} style={styles.label}>Status</Text>

// For body text that should respect user preference (accessibility-friendly):
<Text style={styles.body}>Some longer paragraph text</Text>

// In theme.js typography definitions, add maxFontSizeMultiplier:
export const typography = {
  titleMd: {
    fontSize: 16,
    fontWeight: '600',
    maxFontSizeMultiplier: 1.3,  // won't grow beyond 130% even if user sets large text
  },
  bodyMd: {
    fontSize: 14,
    maxFontSizeMultiplier: 1.4,
  },
  labelSm: {
    fontSize: 11,
    maxFontSizeMultiplier: 1.2,
  },
};
```

---

## 7. Full-Screen Mode Patterns

### 7.1 Map Screens — Edge-to-Edge Layout

Map screens should be fully immersive. The map renders under the status bar,
and UI elements are positioned with safe area insets.

```jsx
export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      {/* Map fills the whole screen including under status bar */}
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <WebView style={StyleSheet.absoluteFill} ... />

      {/* Top overlays — pushed below status bar */}
      <View style={[styles.topOverlay, { top: insets.top + 8 }]}>
        <StatusPill />
      </View>

      {/* Right side floating buttons */}
      <View style={[styles.rightControls, { top: insets.top + 64 }]}>
        <RecenterButton />
      </View>

      {/* Bottom sheet handles its own bottom inset via paddingBottom */}
      <BottomSheet ...>
        <BottomSheetScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        >
          {/* content */}
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}
```

### 7.2 When Sheet Is Fully Expanded (90%+ snap point)

When the sheet takes almost the full screen, the map behind it becomes invisible.
In this state, make the status bar content readable against the sheet background:

```jsx
import { useBottomSheet } from '@gorhom/bottom-sheet';

// Inside a component rendered inside the BottomSheet:
function SheetContent() {
  // When sheet is at index 2 (90%), change status bar
  // Pass the index from the parent via prop or context
}

// In the parent screen:
const handleSheetChange = useCallback((index) => {
  if (index >= 2) {
    // Sheet is almost full screen — dark status bar on light sheet
    setStatusBarStyle('dark');
  } else {
    // Map is visible — dark icons on light map tiles
    setStatusBarStyle('dark');
  }
}, []);
```

---

## 8. Screen Shrink — Keyboard + Sheet Combined

This is the trickiest situation: user opens keyboard while sheet is partially expanded.
The sheet should rise with the keyboard, the map should still be visible above both.

### Required BottomSheet Props (Always Include These)

```jsx
<BottomSheet
  ref={sheetRef}
  index={0}
  snapPoints={snapPoints}
  onChange={handleSheetChange}
  // Keyboard handling — these three props work together
  keyboardBehavior="interactive"        // sheet moves up WITH keyboard
  keyboardBlurBehavior="restore"        // sheet drops back when keyboard closes
  android_keyboardInputMode="adjustResize" // Android: resize content, don't pan
  // Avoid sheet content going behind home bar
  bottomInset={insets.bottom}
>
```

### What "adjustResize" Does on Android

On Android, there are two keyboard modes:
- `adjustPan` — the whole screen shifts up (pushes status bar off screen — BAD)
- `adjustResize` — the screen shrinks from the bottom, status bar stays (GOOD)

The `android_keyboardInputMode="adjustResize"` prop on `BottomSheet` sets this
correctly. Never set `android:windowSoftInputMode` to `adjustPan` in AndroidManifest.

### In app.json, Ensure This Exists

```json
{
  "expo": {
    "android": {
      "softwareKeyboardLayoutMode": "resize"
    }
  }
}
```

---

## 9. Dynamic Content Heights

When content inside a sheet is variable (search results list, rider list),
never give the inner list a fixed height. Use flex and let the sheet snap points
control how much is visible.

```jsx
// ❌ Wrong — fixed height breaks on small screens
<ScrollView style={{ height: 300 }}>
  {items.map(...)}
</ScrollView>

// ✅ Correct — flex fills available sheet space
<BottomSheetScrollView
  contentContainerStyle={styles.listContent}
  showsVerticalScrollIndicator={false}
>
  {items.map(...)}
</BottomSheetScrollView>

// Then let the user drag the sheet to reveal more
```

For lists that might be very long (search results, rider list), use
`BottomSheetFlatList` instead of `BottomSheetScrollView`:

```jsx
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';

<BottomSheetFlatList
  data={results}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <ResultRow item={item} />}
  contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
  keyboardShouldPersistTaps="handled"
/>
```

---

## 10. Confirm / CTA Button — Always Pinned Above Home Bar

Action buttons (Confirm Booking, Book Ride, etc.) must always be visible
and never hidden behind the keyboard or home bar indicator.

```jsx
// Pattern: fixed button outside the scrollable sheet content
<BottomSheet ...>
  <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
    {/* all the form content */}
  </BottomSheetScrollView>

  {/* CTA is OUTSIDE the ScrollView but INSIDE the BottomSheet */}
  <View style={[styles.ctaWrapper, { paddingBottom: insets.bottom || 16 }]}>
    <TouchableOpacity style={styles.ctaButton} onPress={handleConfirm}>
      <Text style={styles.ctaText}>Confirm Booking</Text>
    </TouchableOpacity>
  </View>
</BottomSheet>

// Styles:
ctaWrapper: {
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.sm,
  backgroundColor: colors.surface,
  borderTopWidth: 1,
  borderTopColor: colors.outlineVariant,
  // paddingBottom is set dynamically with insets.bottom
},
ctaButton: {
  backgroundColor: colors.primary,
  height: 54,          // never less than 48, ideally 54 for primary CTAs
  borderRadius: radius.xl,
  alignItems: 'center',
  justifyContent: 'center',
},
```

---

## 11. Loading & Empty States — Responsive Rules

### Loading State
Never show a blank white screen while data loads on a map screen.
The map should appear immediately; show a subtle indicator in the sheet area.

```jsx
// In the sheet content area:
{loading ? (
  <View style={styles.loadingState}>
    <ActivityIndicator size="small" color={colors.primary} />
    <Text style={styles.loadingText}>Finding riders nearby…</Text>
  </View>
) : (
  <RiderList riders={nearbyRiders} />
)}

loadingState: {
  alignItems: 'center',
  paddingVertical: spacing.xl,
  gap: spacing.sm,
},
loadingText: {
  ...typography.bodyMd,
  color: colors.onSurfaceVariant,
},
```

### Empty State
Never show nothing. Always give the user an action or explanation.

```jsx
{recentBookings.length === 0 && (
  <View style={styles.emptyState}>
    <Text style={styles.emptyIcon}>🏍</Text>
    <Text style={styles.emptyTitle}>No rides yet</Text>
    <Text style={styles.emptyBody}>Your recent trips will appear here</Text>
    <TouchableOpacity
      style={styles.emptyAction}
      onPress={() => navigation.navigate('NewBooking', { type: 'ride' })}
    >
      <Text style={styles.emptyActionText}>Request your first ride</Text>
    </TouchableOpacity>
  </View>
)}
```

---

## 12. Android-Specific Fixes

### Navigation Bar (3-button or gesture bar at very bottom)

```jsx
import * as NavigationBar from 'expo-navigation-bar';
import { useEffect } from 'react';

// In map screens — transparent nav bar so map shows through
useEffect(() => {
  if (Platform.OS === 'android') {
    NavigationBar.setBackgroundColorAsync('transparent');
    NavigationBar.setButtonStyleAsync('dark'); // dark buttons on light map
  }
}, []);

// In sheet-only screens — match the sheet background
useEffect(() => {
  if (Platform.OS === 'android') {
    NavigationBar.setBackgroundColorAsync(colors.surface);
    NavigationBar.setButtonStyleAsync('dark');
  }
}, []);
```

### Android Back Button (Hardware/Gesture)

Intercept the hardware back button on screens where going back would be destructive
(e.g., active ride in progress):

```jsx
import { BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

useFocusEffect(
  useCallback(() => {
    const onBackPress = () => {
      if (booking?.status === 'accepted' || booking?.status === 'in_progress') {
        showModal('Cannot go back during an active ride');
        return true; // Prevent default back behavior
      }
      return false; // Allow default back behavior
    };

    BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  }, [booking?.status])
);
```

### Ripple Effect on Touchables

Android shows a ripple by default on `TouchableNativeFeedback`. Use it for list items:

```jsx
import { TouchableNativeFeedback, Platform } from 'react-native';

// For list items on Android — native feel
const Touchable = Platform.OS === 'android' ? TouchableNativeFeedback : TouchableOpacity;
const ripple = Platform.OS === 'android'
  ? TouchableNativeFeedback.Ripple(colors.primaryContainer, false)
  : undefined;

<Touchable onPress={handlePress} background={ripple}>
  <View style={styles.listItem}>
    {/* content */}
  </View>
</Touchable>
```

---

## 13. Complete Checklist — Apply Before Every Screen Is Done

### Safe Areas
- [ ] `useSafeAreaInsets()` used to position top overlays (not hardcoded `top: 56`)
- [ ] Bottom sheet content has `paddingBottom: insets.bottom + 16`
- [ ] Fixed CTA buttons have `paddingBottom: insets.bottom || 16`
- [ ] Status bar is configured per screen type (translucent on maps, solid on sheets)

### Navigation
- [ ] `headerShown: false` on stack navigator
- [ ] Custom `BackButton` used on all non-root screens
- [ ] Hardware back button intercepted on active ride/delivery screens
- [ ] `gestureEnabled: false` on Tracking screen during active ride

### Responsiveness
- [ ] No hardcoded pixel sizes for layout (use `wp()`, `hp()`, `scale()`)
- [ ] All touch targets are at least 44×44 with `hitSlop` where needed
- [ ] `maxFontSizeMultiplier` set on typography tokens in `theme.js`
- [ ] `allowFontScaling={false}` on UI labels that must not change size
- [ ] Variable-length lists use `BottomSheetFlatList` not fixed-height ScrollView

### Android-Specific
- [ ] `android_keyboardInputMode="adjustResize"` on all BottomSheets
- [ ] `softwareKeyboardLayoutMode: "resize"` in `app.json`
- [ ] Navigation bar color set via `expo-navigation-bar` on focus
- [ ] Hardware back button handled on critical screens

### Map Screens
- [ ] Map renders behind status bar (`translucent` + `absoluteFill`)
- [ ] Top overlays positioned with `insets.top + offset`, not hardcoded
- [ ] `map.invalidateSize()` called when sheet changes snap point
- [ ] Recenter button positioned with `insets.top` awareness

---

## 14. Responsive Layout at a Glance

```
SMALL PHONE (< 360dp wide, e.g. budget Tecno)
┌─────────────────────┐
│ Status bar          │ ← insets.top (~24px)
│─────────────────────│
│                     │
│    MAP              │ ← most of the screen
│                     │
│─────────────────────│
│ Sheet (25% = ~140px)│ ← compact snap point, fits 2 items
│ ─────────────────── │
│ [   Confirm Btn   ] │
│─────────────────────│
│ Nav bar             │ ← insets.bottom (~0-48px)
└─────────────────────┘

LARGE PHONE (> 400dp wide, e.g. Samsung Galaxy)
┌───────────────────────────┐
│ Status bar                │ ← insets.top (~28px punch-hole)
│───────────────────────────│
│                           │
│         MAP               │ ← more space, riders more visible
│                           │
│───────────────────────────│
│ Sheet (25% = ~185px)      │ ← more content visible at same snap %
│ ─────────────────────── ─ │
│ [      Confirm Btn      ] │
│───────────────────────────│
│ Gesture bar               │ ← insets.bottom (~20px)
└───────────────────────────┘
```

Because snap points are percentages and dimensions use `wp()`/`hp()`, the UI
adapts to both automatically without a single media query.
