import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as NavigationBar from 'expo-navigation-bar';
import { io } from 'socket.io-client';
import { bookingAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLocationTracking } from '../hooks/useLocationTracking';
import { colors, typography, spacing, radius } from '../theme';
import { useModal } from '../components/useModal';

const SOCKET_URL = 'https://boda.ocaya.space';
const SCREEN_HEIGHT = Dimensions.get('window').height;

function buildTripMapHTML(pickup, dropoff) {
  const pLat = pickup?.lat || 2.77;
  const pLng = pickup?.lng || 32.29;
  const dLat = dropoff?.lat || 2.78;
  const dLng = dropoff?.lng || 32.30;
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var pl = { decode: function(encoded) {
      var points = [], index = 0, lat = 0, lng = 0;
      while (index < encoded.length) {
        var b, shift = 0, result = 0;
        do { b = encoded.charCodeAt(index++) - 63; result |= (b & 31) << shift; shift += 5; } while (b >= 32);
        lat += ((result & 1) ? ~(result >> 1) : (result >> 1));
        shift = 0; result = 0;
        do { b = encoded.charCodeAt(index++) - 63; result |= (b & 31) << shift; shift += 5; } while (b >= 32);
        lng += ((result & 1) ? ~(result >> 1) : (result >> 1));
        points.push([lat / 1e5, lng / 1e5]);
      }
      return points;
    }};
  </script>
  <style>body{margin:0;padding:0;}#map{width:100vw;height:100vh;}</style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false }).setView([${pLat}, ${pLng}], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '' }).addTo(map);
    L.circleMarker([${pLat}, ${pLng}], { radius: 8, fillColor: '#22c55e', color: '#fff', weight: 3, fillOpacity: 1 }).addTo(map);
    L.circleMarker([${dLat}, ${dLng}], { radius: 8, fillColor: '#ba1a1a', color: '#fff', weight: 3, fillOpacity: 1 }).addTo(map);
    var riderMarker = null;
    window.updateRiderPosition = function(lat, lng) {
      if (riderMarker) riderMarker.setLatLng([lat, lng]);
      else riderMarker = L.marker([lat, lng], { icon: L.divIcon({ className: '', html: '<div style="width:24px;height:24px;border-radius:50%;background:#4285f4;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>', iconSize: [24, 24], iconAnchor: [12, 12] }) }).addTo(map);
      map.panTo([lat, lng], { animate: true });
    };
    fetch('https://router.project-osrm.org/route/v1/driving/${pLng},${pLat};${dLng},${dLat}?overview=full&geometries=polyline&steps=false')
      .then(function(r){return r.json();}).then(function(d){
        if(d.code==='Ok'&&d.routes.length>0){
          var coords=pl.decode(d.routes[0].geometry);
          L.polyline(coords,{color:'#6d5e00',weight:5,opacity:0.9}).addTo(map);
          map.fitBounds(L.polyline(coords).getBounds(),{paddingBottomRight: L.point(40, 200)});
        }
      }).catch(function(){});
  </script>
</body>
</html>`;
}

export default function ActiveBookingScreen({ route, navigation }) {
  const { booking } = route.params || {};
  const { rider } = useAuth();
  const insets = useSafeAreaInsets();
  const [tripPhase, setTripPhase] = useState('pickup');
  const [loading, setLoading] = useState(false);
  const socketRef = useRef(null);
  const webViewRef = useRef(null);
  const sheetRef = useRef(null);
  const snapPoints = useMemo(() => ['35%', '70%'], []);
  const { showModal, ModalComponent } = useModal();

  const handleSheetChange = useCallback((index) => {
    const snapPercents = [0.35, 0.70];
    const sheetHeight = SCREEN_HEIGHT * (snapPercents[index] ?? 0.35);
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        map.invalidateSize();
        map.panBy([0, -${Math.round(sheetHeight / 4)}], { animate: false });
        true;
      `);
    }
  }, []);

  useLocationTracking(rider?.riderId, booking?.id);

  useEffect(() => {
    try { NavigationBar.setStyle('dark'); } catch (e) {}
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { token: rider?.token },
    });
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('join:booking', { bookingId: booking?.id }));
    socket.on('rider:moved', (data) => {
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(
          `window.updateRiderPosition(${data.lat}, ${data.lng}); true;`
        );
      }
    });
    return () => socket.disconnect();
  }, [booking?.id]);

  const handleConfirmPickup = async () => {
    setLoading(true);
    try {
      await bookingAPI.startBooking(booking.id);
      setTripPhase('trip');
    } catch (err) {
      showModal({ icon: '⚠️', title: 'Error', message: 'Failed to confirm pickup' });
    } finally { setLoading(false); }
  };

  const handleCompleteTrip = async () => {
    setLoading(true);
    try {
      await bookingAPI.completeBooking(booking.id);
      navigation.replace('TripDetails', { booking });
    } catch (err) {
      showModal({ icon: '⚠️', title: 'Error', message: 'Failed to complete trip' });
    } finally { setLoading(false); }
  };

  const handleCancel = async () => {
    showModal({
      icon: '⚠️',
      title: 'Cancel Trip',
      message: 'Are you sure you want to cancel?',
      actions: [
        { label: 'No' },
        {
          label: 'Yes', primary: true, onPress: async () => {
            try { await bookingAPI.cancelBooking(booking.id); navigation.goBack(); } catch (err) { showModal({ icon: '⚠️', title: 'Error', message: 'Failed to cancel' }); }
          }
        },
      ],
    });
  };

  const progressPercent = tripPhase === 'pickup' ? 25 : tripPhase === 'trip' ? 60 : 100;
  const progressSteps = ['To Pickup', 'In Progress', 'Complete'];
  const activeStep = tripPhase === 'pickup' ? 0 : tripPhase === 'trip' ? 1 : 2;

  return (
    <View style={styles.container}>
      <View style={styles.mapCanvas}>
        <WebView
          ref={webViewRef}
          source={{ html: buildTripMapHTML(
            { lat: booking?.pickup_lat, lng: booking?.pickup_lng },
            { lat: booking?.dropoff_lat, lng: booking?.dropoff_lng }
          )}}
          style={StyleSheet.absoluteFill}
          originWhitelist={['*']}
          javaScriptEnabled
        />
        <View style={[styles.statusPill, { top: insets.top + 8 }]}>
          <View style={styles.statusDot} />
          <Text style={styles.statusPillText}>{tripPhase === 'pickup' ? 'Heading to Pickup' : 'Trip in Progress'}</Text>
        </View>
      </View>

      <View style={[styles.customerCard, { top: insets.top + 56 }]}>
        <View style={styles.customerAvatar}>
          <Text style={styles.customerAvatarText}>{booking?.customer_name?.[0] || 'C'}</Text>
        </View>
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{booking?.customer_name || 'Customer'}</Text>
          <Text style={styles.customerMeta}>⭐ {booking?.customer_rating || '--'} • {booking?.customer_trips || 0} trips</Text>
        </View>
        <View style={styles.contactBtns}>
          <TouchableOpacity style={styles.callBtn} onPress={() => { const p = booking?.customer_phone; p ? Linking.openURL(`tel:${p}`) : showModal({ icon: '⚠️', title: 'Error', message: 'Phone not available' }); }} activeOpacity={0.7}>
            <Text style={styles.contactIcon}>📞</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.chatBtn} onPress={() => showModal({ icon: '💬', title: 'Chat', message: 'Messaging coming soon.' })} activeOpacity={0.7}>
            <Text style={styles.contactIcon}>💬</Text>
          </TouchableOpacity>
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
        <BottomSheetScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>

        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <View style={styles.progressSteps}>
            {progressSteps.map((step, i) => (
              <Text key={step} style={[styles.progressStepText, i === activeStep && styles.progressStepActive]}>{step}</Text>
            ))}
          </View>
        </View>

        <View style={styles.locationSection}>
          <View style={styles.locationRow}>
            <View style={styles.greenDot} />
            <Text style={styles.locationText}>{booking?.pickup_address || 'Pickup'}</Text>
          </View>
          <View style={styles.dashedLine} />
          <View style={styles.locationRow}>
            <View style={styles.redDot} />
            <Text style={styles.locationText}>{booking?.dropoff_address || 'Dropoff'}</Text>
          </View>
        </View>

        <View style={styles.fareRow}>
          <Text style={styles.fareLabel}>Fare</Text>
          <Text style={styles.fareAmount}>UGX {(booking?.fare_estimate || 0).toLocaleString()}</Text>
        </View>

        <View style={styles.actions}>
          {tripPhase === 'pickup' && (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleConfirmPickup} disabled={loading} activeOpacity={0.8}>
              <Text style={styles.primaryBtnText}>{loading ? 'Confirming...' : 'Confirm Pickup'}</Text>
            </TouchableOpacity>
          )}
          {tripPhase === 'trip' && (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleCompleteTrip} disabled={loading} activeOpacity={0.8}>
              <Text style={styles.primaryBtnText}>{loading ? 'Completing...' : 'Complete Trip'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.8}>
            <Text style={styles.cancelBtnText}>Cancel Trip</Text>
          </TouchableOpacity>
        </View>
        </BottomSheetScrollView>
      </BottomSheet>
      <ModalComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  mapCanvas: { flex: 1, position: 'relative' },
  statusPill: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: `${colors.primaryContainer}ee`, paddingHorizontal: 20, paddingVertical: 10, borderRadius: radius.full, zIndex: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginRight: 8 },
  statusPillText: { ...typography.titleMd, color: colors.onPrimaryContainer },
  customerCard: { position: 'absolute', left: spacing.lg, right: spacing.lg, flexDirection: 'row', alignItems: 'center', backgroundColor: `${colors.surface}ee`, borderRadius: radius.xl, padding: spacing.md, zIndex: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  customerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  customerAvatarText: { ...typography.titleMd, color: colors.onPrimaryContainer },
  customerInfo: { flex: 1 },
  customerName: { ...typography.titleMd, color: colors.onSurface },
  customerMeta: { ...typography.labelSm, color: colors.onSurfaceVariant },
  contactBtns: { flexDirection: 'row', gap: 8 },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center' },
  chatBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondaryContainer, alignItems: 'center', justifyContent: 'center' },
  contactIcon: { fontSize: 18 },
  grabber: { backgroundColor: colors.outlineVariant, width: 40 },
  sheetBackground: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetContent: { paddingHorizontal: spacing.lg, paddingBottom: 32 },
  progressBar: { height: 6, backgroundColor: colors.surfaceContainerHigh, borderRadius: 3, marginBottom: spacing.sm },
  progressFill: { height: 6, backgroundColor: colors.primary, borderRadius: 3 },
  progressSteps: { flexDirection: 'row', justifyContent: 'space-between' },
  progressStepText: { ...typography.labelSm, color: colors.onSurfaceVariant },
  progressStepActive: { color: colors.primary, fontWeight: '700' },
  locationSection: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  greenDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#22c55e' },
  redDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.error },
  dashedLine: { width: 2, height: 20, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.outlineVariant, marginLeft: 5 },
  locationText: { ...typography.bodyMd, color: colors.onSurface, flex: 1 },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  fareLabel: { ...typography.titleMd, color: colors.onSurfaceVariant },
  fareAmount: { ...typography.headlineMd, color: colors.onSurface },
  actions: { paddingHorizontal: spacing.lg, gap: spacing.md },
  primaryBtn: { backgroundColor: colors.primary, height: spacing.touchMin, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { ...typography.titleMd, color: colors.onPrimaryContainer },
  cancelBtn: { height: spacing.touchMin, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.outlineVariant },
  cancelBtnText: { ...typography.titleMd, color: colors.onSurfaceVariant },
});
