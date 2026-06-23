import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import * as NavigationBar from 'expo-navigation-bar';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { bookingAPI, riderAPI } from '../services/api';
import { colors, typography, spacing, radius } from '../theme';
import RecenterButton from '../components/RecenterButton';

const GULU_CENTER = { latitude: 2.7700, longitude: 32.2900 };
const SCREEN_HEIGHT = Dimensions.get('window').height;

function buildMapHTML(lat, lng, riders) {
  const riderMarkers = riders.map(r => {
    const name = (r.name || '').replace(/'/g, "\\'");
    const plate = (r.plate_number || '').replace(/'/g, "\\'");
    const rating = r.avg_rating ? Number(r.avg_rating).toFixed(1) : 'New';
    return `
    L.marker([${parseFloat(r.current_lat)}, ${parseFloat(r.current_lng)}], {
      icon: L.divIcon({
        className: '',
        html: '<div style="width:28px;height:28px;border-radius:50%;background:#fde047;border:2px solid #6d5e00;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.3);">&#x1F6F5;</div>',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      })
    }).addTo(map).bindPopup('<b>${name}</b><br>${plate} • ${rating} ★');
  `}).join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { margin: 0; padding: 0; }
    #map { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false,
      zoomSnap: false
    }).setView([${lat}, ${lng}], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    setTimeout(function() {
      map.setView([${lat}, ${lng}], 16, { animate: false });
    }, 200);

    var userMarker = L.circleMarker([${lat}, ${lng}], {
      radius: 7, fillColor: '#0050cb', color: '#fff', weight: 3, fillOpacity: 1
    }).addTo(map);

    ${riderMarkers}

    window.recenterMap = function(lat, lng) {
      userMarker.setLatLng([lat, lng]);
      map.setView([lat, lng], 16, { animate: true });
    };

    window.updateRiders = function(ridersJson) {
      var riders = JSON.parse(ridersJson);
      map.eachLayer(function(layer) {
        if (layer instanceof L.Marker && layer !== userMarker) {
          map.removeLayer(layer);
        }
      });
      riders.forEach(function(r) {
        var name = (r.name || '').replace(/'/g, "\\\\'");
        var plate = (r.plate_number || '').replace(/'/g, "\\\\'");
        var rating = r.avg_rating ? Number(r.avg_rating).toFixed(1) : 'New';
        L.marker([parseFloat(r.current_lat), parseFloat(r.current_lng)], {
          icon: L.divIcon({
            className: '',
            html: '<div style="width:28px;height:28px;border-radius:50%;background:#fde047;border:2px solid #6d5e00;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.3);">&#x1F6F5;</div>',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          })
        }).addTo(map).bindPopup('<b>' + name + '</b><br>' + plate + ' • ' + rating + ' ★');
      });
    };
  </script>
</body>
</html>`;
}

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef(null);
  const sheetRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [nearbyRiders, setNearbyRiders] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  const snapPoints = useMemo(() => ['25%', '55%'], []);

  useEffect(() => {
    try { NavigationBar.setStyle('dark'); } catch (e) {}
    requestLocation();
    loadRecentBookings();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecentBookings();
    }, [])
  );

  useEffect(() => {
    if (location) {
      loadNearbyRiders();
      const interval = setInterval(loadNearbyRiders, 30000);
      return () => clearInterval(interval);
    }
  }, [location]);

  useEffect(() => {
    if (mapReady && nearbyRiders.length > 0 && webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `window.updateRiders(${JSON.stringify(JSON.stringify(nearbyRiders))}); true;`
      );
    }
  }, [nearbyRiders, mapReady]);

  const handleSheetChange = useCallback((index) => {
    const snapPercents = [0.25, 0.55];
    const sheetHeight = SCREEN_HEIGHT * (snapPercents[index] ?? 0.25);
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        map.invalidateSize();
        map.panBy([0, -${Math.round(sheetHeight / 4)}], { animate: false });
        true;
      `);
    }
  }, []);

  const requestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
    } catch (err) {
      console.error('Location error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadNearbyRiders = async () => {
    try {
      const coords = location || GULU_CENTER;
      const { data } = await riderAPI.getNearby(coords.latitude, coords.longitude, 5);
      setNearbyRiders(data.riders || []);
    } catch (err) {
      console.error('Failed to load nearby riders:', err);
    }
  };

  const loadRecentBookings = async () => {
    try {
      const { data } = await bookingAPI.getMyBookings({ limit: 5 });
      setRecentBookings(data.bookings || []);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    }
  };

  const center = location || GULU_CENTER;

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return d.toLocaleDateString('en-UG', { month: 'short', day: 'numeric' });
  };

  const recenter = () => {
    if (location && webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `window.recenterMap(${location.latitude}, ${location.longitude}); true;`
      );
    }
  };

  const mapHtml = buildMapHTML(center.latitude, center.longitude, nearbyRiders);

  return (
    <View style={styles.container}>
      {/* MAP — full screen, behind everything */}
      <WebView
        ref={webViewRef}
        source={{ html: mapHtml }}
        style={StyleSheet.absoluteFill}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        onLoadEnd={() => setMapReady(true)}
      />

      {/* ABSOLUTE OVERLAYS — status pill and recenter */}
      {location && (
        <RecenterButton onPress={recenter} top={insets.top + 64} />
      )}

      <View style={[styles.statusBar, { top: insets.top + 8 }]}>
        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>
            {nearbyRiders.length > 0
              ? `${nearbyRiders.length} boda${nearbyRiders.length !== 1 ? 's' : ''} nearby`
              : 'Finding active bodas'}
          </Text>
        </View>
      </View>

      {/* BOTTOM SHEET — @gorhom/bottom-sheet */}
      <BottomSheet
        ref={sheetRef}
        index={0}
        snapPoints={snapPoints}
        onChange={handleSheetChange}
        handleIndicatorStyle={styles.grabber}
        backgroundStyle={styles.sheetBackground}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
      >
        <BottomSheetScrollView
          contentContainerStyle={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Floating action cards */}
          <View style={styles.floatingActions}>
            <TouchableOpacity
              style={styles.rideCard}
              onPress={() => navigation.navigate('NewBooking', { type: 'ride' })}
              activeOpacity={0.8}
            >
              <Text style={styles.actionIcon}>🏍</Text>
              <Text style={styles.actionTitle}>Request Ride</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deliveryCard}
              onPress={() => navigation.navigate('DeliveryDetails')}
              activeOpacity={0.8}
            >
              <Text style={styles.actionIcon}>📦</Text>
              <Text style={styles.actionTitle}>Send Delivery</Text>
            </TouchableOpacity>
          </View>

          {/* Greeting */}
          <Text style={styles.greeting}>Hello, {user?.name || 'there'}!</Text>

          {/* Recent Activity */}
          <View style={styles.activityHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Activity')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          {(recentBookings || []).slice(0, 2).map((booking) => (
            <TouchableOpacity
              key={booking.id}
              style={styles.activityItem}
              onPress={() => navigation.navigate('BookingDetail', { bookingId: booking.id })}
              activeOpacity={0.7}
            >
              <View style={[
                styles.activityIconBg,
                booking.type === 'delivery' ? styles.deliveryIconBg : null,
              ]}>
                <Text style={styles.activityIconText}>
                  {booking.type === 'delivery' ? '📦' : '🏍'}
                </Text>
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityTitle}>
                  {booking.type === 'ride' ? 'Ride' : 'Delivery'}
                </Text>
                <Text style={styles.activityStatus}>
                  Status: {booking.status?.replace('_', ' ')}
                </Text>
              </View>
              <View style={styles.activityRight}>
                <Text style={styles.activityFare}>
                  UGX {(booking.fare_estimate || 0).toLocaleString()}
                </Text>
                <Text style={styles.activityTime}>{formatTime(booking.created_at)}</Text>
              </View>
            </TouchableOpacity>
          ))}

          {recentBookings.length === 0 && (
            <Text style={styles.emptyText}>No recent activity</Text>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  floatingActions: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  statusBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: 8,
  },
  statusText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  recenterBtn: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    zIndex: 10,
  },
  recenterIcon: {
    fontSize: 22,
    color: colors.onSurface,
  },
  grabber: {
    backgroundColor: colors.outlineVariant,
    width: 40,
  },
  sheetBackground: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  rideCard: {
    flex: 1,
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.xl,
    paddingVertical: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  deliveryCard: {
    flex: 1,
    backgroundColor: colors.inverseSurface,
    borderRadius: radius.xl,
    paddingVertical: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionTitle: {
    ...typography.titleMd,
    color: colors.onPrimaryContainer,
  },
  greeting: {
    ...typography.headlineLgMobile,
    color: colors.onBackground,
    marginBottom: spacing.lg,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  seeAll: {
    ...typography.labelLg,
    color: colors.primary,
  },
  emptyText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 20,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: spacing.sm,
  },
  activityIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryFixedDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  deliveryIconBg: {
    backgroundColor: colors.secondaryContainer,
  },
  activityIconText: {
    fontSize: 20,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  activityStatus: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  activityRight: {
    alignItems: 'flex-end',
  },
  activityFare: {
    ...typography.titleMd,
    color: colors.primary,
    fontWeight: '700',
  },
  activityTime: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
});
