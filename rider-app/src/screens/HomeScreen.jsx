import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, ScrollView } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { riderAPI, bookingAPI } from '../services/api';
import { useLocationTracking } from '../hooks/useLocationTracking';
import { colors, typography, spacing, radius } from '../theme';
import { useModal } from '../components/useModal';

const SOCKET_URL = 'https://boda.ocaya.space';
const GULU_CENTER = { lat: 2.7700, lng: 32.2900 };

function buildMapHTML(lat, lng) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>body{margin:0;padding:0;}#map{width:100vw;height:100vh;}</style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false,
      zoomSnap: false
    }).setView([${lat}, ${lng}], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    var userMarker = L.circleMarker([${lat}, ${lng}], {
      radius: 7, fillColor: '#0050cb', color: '#fff', weight: 3, fillOpacity: 1
    }).addTo(map);

    var bookingMarkers = [];
    window.updateBookings = function(json) {
      bookingMarkers.forEach(function(m) { map.removeLayer(m); });
      bookingMarkers = [];
      try {
        var bookings = JSON.parse(json);
        bookings.forEach(function(b) {
          var type = b.type === 'delivery' ? '\\u{1F4E6}' : '\\u{1F6F5}';
          var fare = (b.fare_estimate || 0).toLocaleString();
          var addr = (b.pickup_address || '').replace(/'/g, "\\'");
          var m = L.marker([parseFloat(b.pickup_lat), parseFloat(b.pickup_lng)], {
            icon: L.divIcon({
              className: '',
              html: '<div style="width:32px;height:32px;border-radius:50%;background:#fde047;border:2px solid #6d5e00;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">' + type + '</div>',
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            })
          }).addTo(map).bindPopup('<b>' + addr + '</b><br>UGX ' + fare);
          bookingMarkers.push(m);
        });
      } catch(e) {}
    };

    window.recenterMap = function(lat, lng) {
      userMarker.setLatLng([lat, lng]);
      map.setView([lat, lng], 15, { animate: true });
    };
  </script>
</body>
</html>`;
}

export default function HomeScreen({ navigation }) {
  const { rider, logout } = useAuth();
  const webViewRef = useRef(null);
  const [isOnline, setIsOnline] = useState(false);
  const [profile, setProfile] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [nearbyBookings, setNearbyBookings] = useState([]);
  const [location, setLocation] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const socketRef = useRef(null);
  const { showModal, ModalComponent } = useModal();

  useLocationTracking(rider?.riderId, null);

  useEffect(() => {
    if (!rider?.token) return;
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { token: rider.token },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      if (isOnline) socket.emit('rider:go-online');
    });

    socket.on('booking:new', (data) => {
      bookingAPI.getBooking(data.bookingId).then(({ data: bData }) => {
        const booking = bData.booking;
        if (booking && booking.status === 'pending') {
          navigation.navigate('BookingRequest', { booking });
        }
      }).catch(() => {});
    });

    return () => socket.disconnect();
  }, [rider?.token]);

  useEffect(() => {
    requestLocation();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
      loadEarnings();
      if (location) loadNearbyBookings();
    }, [])
  );

  useEffect(() => {
    if (location) {
      loadNearbyBookings();
      const interval = setInterval(loadNearbyBookings, 30000);
      return () => clearInterval(interval);
    }
  }, [location]);

  useEffect(() => {
    if (mapReady && location && webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `window.recenterMap(${location.lat}, ${location.lng});`
      );
    }
  }, [mapReady, location]);

  const requestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch (err) {
      console.error('Location error:', err);
    }
  };

  const recenter = () => {
    if (location && webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `window.recenterMap(${location.lat}, ${location.lng});`
      );
    }
  };

  const loadProfile = async () => {
    try {
      if (rider?.riderId) {
        const { data } = await riderAPI.getProfile(rider.riderId);
        setProfile(data.rider);
        setIsOnline(data.rider?.is_online || false);
      } else if (rider) {
        setProfile({ status: rider.status || 'not_registered', avg_rating: rider.avg_rating, plate_number: rider.plate_number, is_online: false });
      }
    } catch (err) { console.error('Failed to load profile:', err); }
  };

  const loadEarnings = async () => {
    try {
      if (rider?.riderId) {
        const { data } = await riderAPI.getEarnings(rider.riderId, 'today');
        setEarnings(data.summary);
      }
    } catch (err) { console.error('Failed to load earnings:', err); }
  };

  const loadNearbyBookings = async () => {
    try {
      const { data } = await bookingAPI.getMyBookings();
      const active = (data.bookings || []).filter(b => b.status === 'pending' || b.status === 'accepted');
      setNearbyBookings(active);
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(
          `window.updateBookings(${JSON.stringify(JSON.stringify(active))});`
        );
      }
    } catch (err) {}
  };

  const toggleOnline = async (value) => {
    try {
      if (!rider?.riderId) { showModal({ icon: '⚠️', title: 'Registration Required', message: 'Complete rider registration first to go online.' }); return; }
      if (profile?.status !== 'verified') { showModal({ icon: '⚠️', title: 'Not Verified', message: 'Your account is not verified yet. Please wait for admin approval.' }); return; }
      await riderAPI.toggleOnline(rider.riderId, value);
      setIsOnline(value);
      if (socketRef.current) {
        if (value) socketRef.current.emit('rider:go-online');
        else socketRef.current.emit('rider:go-offline');
      }
    } catch (err) { showModal({ icon: '⚠️', title: 'Error', message: 'Failed to update status' }); }
  };

  const handleLogout = () => {
    showModal({
      icon: '🚪', title: 'Logout', message: 'Are you sure you want to logout?',
      actions: [{ label: 'Cancel' }, { label: 'Logout', primary: true, onPress: logout }],
    });
  };

  const center = location || GULU_CENTER;

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: buildMapHTML(center.lat, center.lng) }}
          style={styles.map}
          originWhitelist={['*']}
          javaScriptEnabled
          onLoadEnd={() => setMapReady(true)}
        />
        <View style={styles.topBar}>
          <View style={styles.appBadge}>
            <Text style={styles.appBadgeText}>Boda Rider</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate('Support')} activeOpacity={0.7}>
            <Text style={styles.notifIcon}>🎧</Text>
          </TouchableOpacity>
        </View>

        {location && (
          <TouchableOpacity style={styles.recenterBtn} onPress={recenter} activeOpacity={0.8}>
            <Text style={styles.recenterIcon}>◎</Text>
          </TouchableOpacity>
        )}

        <View style={styles.onlineToggleContainer}>
          <View style={[styles.onlinePill, isOnline && styles.onlinePillActive]}>
            <View style={[styles.onlineDot, isOnline && styles.onlineDotActive]} />
            <Text style={[styles.onlineText, isOnline && styles.onlineTextActive]}>{isOnline ? 'ONLINE' : 'OFFLINE'}</Text>
            <Switch value={isOnline} onValueChange={toggleOnline} trackColor={{ false: colors.surfaceContainerHigh, true: colors.primaryContainer }} thumbColor={isOnline ? colors.primary : colors.surfaceContainerHighest} />
          </View>
        </View>

        {nearbyBookings.length > 0 && (
          <View style={styles.bookingCountBadge}>
            <Text style={styles.bookingCountText}>{nearbyBookings.length} active booking{nearbyBookings.length > 1 ? 's' : ''}</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.bottomSheet} showsVerticalScrollIndicator={false}>
        <View style={styles.grabber}><View style={styles.grabberBar} /></View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{rider?.name?.[0] || profile?.name?.[0] || 'R'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.name || rider?.name || 'Rider'}</Text>
            <View style={styles.profileMeta}>
              <Text style={styles.profileRating}>⭐ {profile?.avg_rating || '--'}</Text>
              <Text style={styles.profileDot}>•</Text>
              <Text style={styles.profilePlate}>{profile?.plate_number || 'N/A'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{earnings?.total_trips || 0}</Text>
            <Text style={styles.statLabel}>Today's Trips</Text>
          </View>
          <View style={[styles.statCard, styles.statCardHighlight]}>
            <Text style={styles.statValue}>UGX {(earnings?.total_revenue || 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Earnings</Text>
          </View>
        </View>

        <View style={styles.quickLinks}>
          <TouchableOpacity style={styles.quickLinkCard} onPress={() => navigation.navigate('Earnings')} activeOpacity={0.7}>
            <Text style={styles.quickLinkIcon}>💰</Text>
            <Text style={styles.quickLinkLabel}>Earnings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickLinkCard} onPress={() => navigation.navigate('Vehicle')} activeOpacity={0.7}>
            <Text style={styles.quickLinkIcon}>🔧</Text>
            <Text style={styles.quickLinkLabel}>Vehicle</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickLinkCard} onPress={() => navigation.navigate('Incentives')} activeOpacity={0.7}>
            <Text style={styles.quickLinkIcon}>⭐</Text>
            <Text style={styles.quickLinkLabel}>Rewards</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Account Status</Text>
          <Text style={[styles.statusValue, { color: profile?.status === 'verified' ? '#22c55e' : colors.onSurface }]}>{profile?.status || 'Not registered'}</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
      <ModalComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  mapContainer: { flex: 1, position: 'relative' },
  map: { ...StyleSheet.absoluteFillObject },
  topBar: { position: 'absolute', top: 56, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, zIndex: 10 },
  appBadge: { backgroundColor: `${colors.primary}ee`, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.full },
  appBadgeText: { ...typography.labelLg, color: colors.onPrimaryContainer, fontWeight: '700' },
  notifBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: `${colors.surface}ee`, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  notifIcon: { fontSize: 20 },
  recenterBtn: { position: 'absolute', right: 16, top: 120, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3, zIndex: 10 },
  recenterIcon: { fontSize: 22, color: colors.onSurface },
  onlineToggleContainer: { position: 'absolute', top: 120, alignSelf: 'center', zIndex: 10 },
  onlinePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: `${colors.surface}ee`, paddingHorizontal: 20, paddingVertical: 10, borderRadius: radius.full, borderWidth: 2, borderColor: colors.outlineVariant, gap: 10 },
  onlinePillActive: { borderColor: '#22c55e', backgroundColor: '#22c55e1a' },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.outline },
  onlineDotActive: { backgroundColor: '#22c55e' },
  onlineText: { ...typography.labelLg, color: colors.onSurfaceVariant, letterSpacing: 1 },
  onlineTextActive: { color: '#22c55e', fontWeight: '700' },
  bookingCountBadge: { position: 'absolute', top: 170, alignSelf: 'center', backgroundColor: '#f59e0bee', paddingHorizontal: 16, paddingVertical: 6, borderRadius: radius.full, zIndex: 10 },
  bookingCountText: { ...typography.labelLg, color: '#000', fontWeight: '700' },
  bottomSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 25, elevation: 16, zIndex: 20, maxHeight: '55%' },
  grabber: { alignItems: 'center', paddingVertical: spacing.md },
  grabberBar: { width: 40, height: 4, backgroundColor: colors.surfaceContainerHighest, borderRadius: 2 },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceContainerLow, marginHorizontal: spacing.lg, padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.outlineVariant, marginBottom: spacing.lg },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  avatarText: { ...typography.headlineMd, color: colors.onPrimaryContainer },
  profileInfo: { flex: 1 },
  profileName: { ...typography.titleMd, color: colors.onSurface },
  profileMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  profileRating: { ...typography.labelLg, color: colors.primary },
  profileDot: { color: colors.outlineVariant },
  profilePlate: { ...typography.labelLg, color: colors.onSurfaceVariant, textTransform: 'uppercase' },
  statsGrid: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  statCard: { flex: 1, backgroundColor: colors.inverseSurface, borderRadius: radius.xl, padding: spacing.lg },
  statCardHighlight: { backgroundColor: colors.primary },
  statValue: { ...typography.headlineMd, color: colors.surfaceBright, marginBottom: 4 },
  statLabel: { ...typography.labelSm, color: colors.secondaryFixedDim },
  quickLinks: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  quickLinkCard: { flex: 1, backgroundColor: colors.surfaceContainerLow, borderRadius: radius.xl, padding: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.outlineVariant },
  quickLinkIcon: { fontSize: 28, marginBottom: spacing.sm },
  quickLinkLabel: { ...typography.labelLg, color: colors.onSurface },
  statusCard: { marginHorizontal: spacing.lg, backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.outlineVariant, flexDirection: 'row', justifyContent: 'space-between' },
  statusLabel: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  statusValue: { ...typography.bodyMd, fontWeight: '600', textTransform: 'capitalize' },
});
