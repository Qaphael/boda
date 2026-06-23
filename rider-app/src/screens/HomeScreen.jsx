import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, ScrollView, ActivityIndicator } from 'react-native';
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
    var map = L.map('map', { zoomControl: false, attributionControl: false, zoomSnap: false }).setView([${lat}, ${lng}], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    var userMarker = L.circleMarker([${lat}, ${lng}], { radius: 7, fillColor: '#0050cb', color: '#fff', weight: 3, fillOpacity: 1 }).addTo(map);
    var bookingMarkers = [];
    window.updateBookings = function(json) {
      bookingMarkers.forEach(function(m) { map.removeLayer(m); });
      bookingMarkers = [];
      try {
        var bookings = JSON.parse(json);
        bookings.forEach(function(b) {
          var type = b.type === 'delivery' ? '\\u{1F4E6}' : '\\u{1F6F5}';
          var addr = (b.pickup_address || '').replace(/'/g, "\\'");
          var m = L.marker([parseFloat(b.pickup_lat), parseFloat(b.pickup_lng)], {
            icon: L.divIcon({ className: '', html: '<div style="width:32px;height:32px;border-radius:50%;background:#fde047;border:2px solid #6d5e00;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">' + type + '</div>', iconSize: [32, 32], iconAnchor: [16, 16] })
          }).addTo(map).bindPopup('<b>' + addr + '</b>');
          bookingMarkers.push(m);
        });
      } catch(e) {}
    };
    window.showRoute = function(pLat, pLng, dLat, dLng) {
      map.eachLayer(function(l) { if (l instanceof L.Polyline && !(l instanceof L.CircleMarker)) map.removeLayer(l); });
      var url = 'https://router.project-osrm.org/route/v1/driving/' + pLng + ',' + pLat + ';' + dLng + ',' + dLat + '?overview=full&geometries=polyline&steps=false';
      fetch(url).then(function(r){return r.json();}).then(function(d){
        if(d.code==='Ok'&&d.routes.length>0){
          var coords=pl.decode(d.routes[0].geometry);
          L.polyline(coords,{color:'#6d5e00',weight:5,opacity:0.9}).addTo(map);
          L.circleMarker([pLat,pLng],{radius:8,fillColor:'#22c55e',color:'#fff',weight:3,fillOpacity:1}).addTo(map);
          L.circleMarker([dLat,dLng],{radius:8,fillColor:'#ba1a1a',color:'#fff',weight:3,fillOpacity:1}).addTo(map);
          map.fitBounds(L.polyline(coords).getBounds(),{padding:[40,40]});
        }
      }).catch(function(){});
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
  const { rider, logout, refreshProfile } = useAuth();
  const webViewRef = useRef(null);
  const [isOnline, setIsOnline] = useState(false);
  const [profile, setProfile] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [location, setLocation] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const socketRef = useRef(null);

  const [pendingBooking, setPendingBooking] = useState(null);
  const [activeBooking, setActiveBooking] = useState(null);
  const [tripPhase, setTripPhase] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  const { showModal, ModalComponent } = useModal();

  useLocationTracking(rider?.riderId, activeBooking?.id);

  useEffect(() => {
    if (!rider?.token) return;
    const socket = io(SOCKET_URL, { transports: ['websocket'], auth: { token: rider.token } });
    socketRef.current = socket;

    socket.on('connect', () => {
      if (isOnline) socket.emit('rider:go-online');
    });

    socket.on('booking:new', (data) => {
      bookingAPI.getBooking(data.bookingId).then(({ data: bData }) => {
        const booking = bData.booking;
        if (booking && booking.status === 'pending' && !activeBooking) {
          setPendingBooking(booking);
          if (webViewRef.current && booking.pickup_lat && booking.pickup_lng) {
            webViewRef.current.injectJavaScript(
              `window.updateBookings(${JSON.stringify(JSON.stringify([booking]))});`
            );
          }
        }
      }).catch(() => {});
    });

    socket.on('booking:status', (data) => {
      if (activeBooking && data.bookingId === activeBooking.id) {
        if (data.status === 'cancelled') {
          setActiveBooking(null);
          setTripPhase(null);
          showModal({ icon: '🚫', title: 'Booking Cancelled', message: 'The customer has cancelled this booking.' });
        }
      }
    });

    return () => socket.disconnect();
  }, [rider?.token, activeBooking]);

  useEffect(() => { requestLocation(); }, []);

  useFocusEffect(useCallback(() => { loadAllData(); checkActiveBooking(); }, []));

  useEffect(() => {
    if (location) {
      const interval = setInterval(loadEarnings, 60000);
      return () => clearInterval(interval);
    }
  }, [location]);

  useEffect(() => {
    if (mapReady && location && webViewRef.current) {
      webViewRef.current.injectJavaScript(`window.recenterMap(${location.lat}, ${location.lng});`);
    }
  }, [mapReady, location]);

  useEffect(() => {
    if (activeBooking && webViewRef.current) {
      const pLat = parseFloat(activeBooking.pickup_lat) || 2.77;
      const pLng = parseFloat(activeBooking.pickup_lng) || 32.29;
      const dLat = parseFloat(activeBooking.dropoff_lat) || 2.78;
      const dLng = parseFloat(activeBooking.dropoff_lng) || 32.30;
      setTimeout(() => {
        webViewRef.current?.injectJavaScript(`window.showRoute(${pLat},${pLng},${dLat},${dLng});`);
      }, 500);
    }
  }, [activeBooking]);

  const requestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch (err) { console.error('Location error:', err); }
  };

  const recenter = () => {
    if (location && webViewRef.current) {
      webViewRef.current.injectJavaScript(`window.recenterMap(${location.lat}, ${location.lng});`);
    }
  };

  const checkActiveBooking = async () => {
    try {
      const { data } = await bookingAPI.getMyBookings();
      const active = (data.bookings || []).find(b => b.status === 'accepted' || b.status === 'in_progress');
      if (active) {
        setActiveBooking(active);
        setTripPhase(active.status === 'accepted' ? 'pickup' : 'trip');
      }
    } catch (err) {}
  };

  const loadProfile = async () => {
    try {
      const updated = await refreshProfile();
      if (updated) {
        setProfile(updated);
        setIsOnline(updated.is_online || false);
      } else if (rider?.riderId) {
        const { data } = await riderAPI.getProfile(rider.riderId);
        setProfile(data.rider);
        setIsOnline(data.rider?.is_online || false);
      }
    } catch (err) {}
  };

  const loadEarnings = async () => {
    try {
      if (rider?.riderId) {
        const { data } = await riderAPI.getEarnings(rider.riderId, 'today');
        setEarnings(data.summary);
      }
    } catch (err) {}
  };

  const loadAllData = async () => {
    await loadProfile();
    loadEarnings();
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

  const handleAccept = async () => {
    if (!pendingBooking) return;
    setAccepting(true);
    try {
      await bookingAPI.acceptBooking(pendingBooking.id);
      setActiveBooking(pendingBooking);
      setTripPhase('pickup');
      setPendingBooking(null);
    } catch (err) {
      showModal({ icon: '⚠️', title: 'Error', message: err.response?.data?.error || 'Failed to accept booking' });
    } finally { setAccepting(false); }
  };

  const handleDecline = () => {
    setPendingBooking(null);
  };

  const handleConfirmPickup = async () => {
    if (!activeBooking) return;
    setLoadingAction(true);
    try {
      await bookingAPI.startBooking(activeBooking.id);
      setTripPhase('trip');
    } catch (err) { showModal({ icon: '⚠️', title: 'Error', message: 'Failed to confirm pickup' }); }
    finally { setLoadingAction(false); }
  };

  const handleCompleteTrip = async () => {
    if (!activeBooking) return;
    setLoadingAction(true);
    try {
      await bookingAPI.completeBooking(activeBooking.id);
      setActiveBooking(null);
      setTripPhase(null);
      loadEarnings();
      showModal({ icon: '✅', title: 'Trip Completed', message: 'Great job! Payment has been processed.' });
    } catch (err) { showModal({ icon: '⚠️', title: 'Error', message: 'Failed to complete trip' }); }
    finally { setLoadingAction(false); }
  };

  const handleCancelTrip = () => {
    showModal({
      icon: '⚠️', title: 'Cancel Trip', message: 'Are you sure you want to cancel?',
      actions: [
        { label: 'No' },
        { label: 'Yes', primary: true, onPress: async () => {
          try {
            await bookingAPI.cancelBooking(activeBooking.id);
            setActiveBooking(null);
            setTripPhase(null);
          } catch (err) { showModal({ icon: '⚠️', title: 'Error', message: 'Failed to cancel' }); }
        }},
      ],
    });
  };

  const handleLogout = () => {
    showModal({
      icon: '🚪', title: 'Logout', message: 'Are you sure you want to logout?',
      actions: [{ label: 'Cancel' }, { label: 'Logout', primary: true, onPress: logout }],
    });
  };

  const center = location || GULU_CENTER;
  const customerName = activeBooking?.customer_name || 'Customer';
  const pickup = activeBooking?.pickup_address || 'Pickup location';
  const dropoff = activeBooking?.dropoff_address || 'Dropoff location';
  const fare = activeBooking?.fare_estimate || 0;
  const distance = activeBooking?.distance_km ? `${activeBooking.distance_km} km` : '--';

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

        {location && !activeBooking && (
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
      </View>

      <View style={styles.bottomSheet}>
        <View style={styles.grabber}><View style={styles.grabberBar} /></View>

        {activeBooking ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
            <View style={styles.tripHeader}>
              <View style={styles.tripAvatar}>
                <Text style={styles.tripAvatarText}>{customerName[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tripCustomerName}>{customerName}</Text>
                <Text style={styles.tripPhaseText}>{tripPhase === 'pickup' ? 'Heading to Pickup' : 'Trip in Progress'}</Text>
              </View>
              {tripPhase === 'trip' && (
                <TouchableOpacity style={styles.sosBtn} onPress={() => showModal({ icon: '🚨', title: 'SOS', message: 'Emergency support is not yet available. Call 112 for emergencies.' })} activeOpacity={0.7}>
                  <Text style={styles.sosBtnText}>SOS</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.tripLocations}>
              <View style={styles.tripLocRow}>
                <View style={styles.greenDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.tripLocLabel}>Pickup</Text>
                  <Text style={styles.tripLocAddress}>{pickup}</Text>
                </View>
              </View>
              <View style={styles.dashedLine} />
              <View style={styles.tripLocRow}>
                <View style={styles.redDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.tripLocLabel}>Drop-off</Text>
                  <Text style={styles.tripLocAddress}>{dropoff}</Text>
                </View>
              </View>
            </View>

            <View style={styles.tripStats}>
              <View style={styles.tripStatItem}>
                <Text style={styles.tripStatIcon}>📏</Text>
                <Text style={styles.tripStatValue}>{distance}</Text>
                <Text style={styles.tripStatLabel}>Distance</Text>
              </View>
              <View style={styles.tripStatItem}>
                <Text style={styles.tripStatIcon}>💰</Text>
                <Text style={styles.tripStatValue}>UGX {fare.toLocaleString()}</Text>
                <Text style={styles.tripStatLabel}>Fare</Text>
              </View>
            </View>

            <View style={styles.tripActions}>
              {tripPhase === 'pickup' ? (
                <TouchableOpacity style={styles.primaryBtn} onPress={handleConfirmPickup} disabled={loadingAction} activeOpacity={0.8}>
                  {loadingAction ? <ActivityIndicator color={colors.onPrimaryContainer} /> : <Text style={styles.primaryBtnText}>Confirm Pickup</Text>}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.primaryBtn} onPress={handleCompleteTrip} disabled={loadingAction} activeOpacity={0.8}>
                  {loadingAction ? <ActivityIndicator color={colors.onPrimaryContainer} /> : <Text style={styles.primaryBtnText}>Destination Reached</Text>}
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelTrip} activeOpacity={0.8}>
                <Text style={styles.cancelBtnText}>Cancel Trip</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : pendingBooking ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
            <View style={styles.requestBadge}>
              <View style={styles.requestPulse} />
              <Text style={styles.requestBadgeText}>New Ride Request</Text>
            </View>

            <View style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <View style={styles.requestAvatar}>
                  <Text style={styles.requestAvatarText}>{(pendingBooking.customer_name || 'C')[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.requestCustomerName}>{pendingBooking.customer_name || 'Customer'}</Text>
                  <Text style={styles.requestType}>{pendingBooking.type === 'delivery' ? 'Delivery' : 'Boda Ride'}</Text>
                </View>
                <Text style={styles.requestFare}>UGX {fare.toLocaleString()}</Text>
              </View>

              <View style={styles.requestLocations}>
                <View style={styles.requestLocRow}>
                  <View style={styles.greenDotSmall} />
                  <Text style={styles.requestLocText} numberOfLines={1}>{pickup}</Text>
                </View>
                <View style={styles.dashedLineSmall} />
                <View style={styles.requestLocRow}>
                  <View style={styles.redDotSmall} />
                  <Text style={styles.requestLocText} numberOfLines={1}>{dropoff}</Text>
                </View>
              </View>

              <View style={styles.requestMeta}>
                <Text style={styles.requestMetaText}>📏 {distance}</Text>
                <Text style={styles.requestMetaText}>💰 UGX {fare.toLocaleString()}</Text>
              </View>

              <View style={styles.requestActions}>
                <TouchableOpacity style={styles.declineBtn} onPress={handleDecline} activeOpacity={0.8}>
                  <Text style={styles.declineBtnText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.acceptBtn, accepting && { opacity: 0.6 }]} onPress={handleAccept} disabled={accepting} activeOpacity={0.8}>
                  {accepting ? <ActivityIndicator color={colors.onPrimaryContainer} /> : <Text style={styles.acceptBtnText}>Accept</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
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
              <View style={[styles.statCard, styles.statCardHighlight]}>
                <Text style={styles.statValue}>UGX {(earnings?.total_revenue || 0).toLocaleString()}</Text>
                <Text style={styles.statLabel}>Today's Earnings</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{earnings?.total_trips || 0}</Text>
                <Text style={styles.statLabel}>Completed Jobs</Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>Quick Actions</Text>
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

            {isOnline && !pendingBooking && (
              <View style={styles.waitingCard}>
                <Text style={styles.waitingIcon}>🔍</Text>
                <Text style={styles.waitingText}>Waiting for ride requests...</Text>
                <Text style={styles.waitingSub}>You'll be notified when a new booking comes in</Text>
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>
        )}
      </View>
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
  sectionLabel: { ...typography.labelLg, color: colors.onSurfaceVariant, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  quickLinks: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  quickLinkCard: { flex: 1, backgroundColor: colors.surfaceContainerLow, borderRadius: radius.xl, padding: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.outlineVariant },
  quickLinkIcon: { fontSize: 28, marginBottom: spacing.sm },
  quickLinkLabel: { ...typography.labelLg, color: colors.onSurface },

  waitingCard: { marginHorizontal: spacing.lg, backgroundColor: colors.surfaceContainerLow, borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: colors.outlineVariant, borderStyle: 'dashed' },
  waitingIcon: { fontSize: 32, marginBottom: spacing.sm },
  waitingText: { ...typography.titleMd, color: colors.onSurface, marginBottom: 4 },
  waitingSub: { ...typography.labelSm, color: colors.onSurfaceVariant, textAlign: 'center' },

  requestBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', backgroundColor: '#fde047', paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.full, gap: 8, marginBottom: spacing.lg },
  requestPulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#b45309' },
  requestBadgeText: { ...typography.labelLg, color: '#726300', fontWeight: '700' },
  requestCard: { marginHorizontal: spacing.lg, backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.outlineVariant },
  requestHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  requestAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  requestAvatarText: { ...typography.titleMd, color: colors.onPrimaryContainer },
  requestCustomerName: { ...typography.titleMd, color: colors.onSurface },
  requestType: { ...typography.labelSm, color: colors.onSurfaceVariant },
  requestFare: { ...typography.headlineMd, color: colors.primary, fontWeight: '700' },
  requestLocations: { marginBottom: spacing.md },
  requestLocRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  greenDotSmall: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e' },
  redDotSmall: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.error },
  dashedLineSmall: { width: 2, height: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.outlineVariant, marginLeft: 4 },
  requestLocText: { ...typography.bodyMd, color: colors.onSurface, flex: 1 },
  requestMeta: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.md },
  requestMetaText: { ...typography.labelLg, color: colors.onSurfaceVariant },
  requestActions: { flexDirection: 'row', gap: spacing.md },
  declineBtn: { flex: 1, height: spacing.touchMin, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.outlineVariant },
  declineBtnText: { ...typography.titleMd, color: colors.onSurfaceVariant },
  acceptBtn: { flex: 1, height: spacing.touchMin, borderRadius: radius.xl, backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center' },
  acceptBtnText: { ...typography.titleMd, color: colors.onPrimaryContainer, fontWeight: '700' },

  tripHeader: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.lg, marginBottom: spacing.lg },
  tripAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  tripAvatarText: { ...typography.headlineMd, color: colors.onPrimaryContainer },
  tripCustomerName: { ...typography.titleMd, color: colors.onSurface },
  tripPhaseText: { ...typography.labelSm, color: colors.primary, fontWeight: '600', marginTop: 2 },
  sosBtn: { backgroundColor: colors.error, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.full },
  sosBtnText: { ...typography.labelLg, color: '#fff', fontWeight: '700' },
  tripLocations: { marginHorizontal: spacing.lg, marginBottom: spacing.lg },
  tripLocRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  greenDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#22c55e', marginTop: 4 },
  redDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.error, marginTop: 4 },
  dashedLine: { width: 2, height: 20, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.outlineVariant, marginLeft: 5 },
  tripLocLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 1 },
  tripLocAddress: { ...typography.bodyMd, color: colors.onSurface, marginTop: 2 },
  tripStats: { flexDirection: 'row', marginHorizontal: spacing.lg, gap: spacing.md, marginBottom: spacing.lg },
  tripStatItem: { flex: 1, backgroundColor: colors.surfaceContainerLow, borderRadius: radius.xl, padding: spacing.md, alignItems: 'center' },
  tripStatIcon: { fontSize: 18, marginBottom: 4 },
  tripStatValue: { ...typography.titleMd, color: colors.onSurface, fontWeight: '700' },
  tripStatLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },
  tripActions: { marginHorizontal: spacing.lg, gap: spacing.md },
  primaryBtn: { height: spacing.touchMin, borderRadius: radius.xl, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { ...typography.titleMd, color: '#fff', fontWeight: '700' },
  cancelBtn: { height: spacing.touchMin, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.outlineVariant },
  cancelBtnText: { ...typography.titleMd, color: colors.onSurfaceVariant },
});
