import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useModal } from '../components/useModal';
import { io } from 'socket.io-client';
import { bookingAPI, riderAPI } from '../services/api';
import Grabber from '../components/Grabber';
import { colors, typography, spacing, radius } from '../theme';

const SOCKET_URL = 'https://boda.ocaya.space';

function buildTrackingMapHTML(pickup, dropoff, hasDropoff) {
  const pLat = pickup?.lat || 2.77;
  const pLng = pickup?.lng || 32.29;
  const dLat = dropoff?.lat || 0;
  const dLng = dropoff?.lng || 0;

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
  <style>
    body { margin: 0; padding: 0; }
    #map { width: 100vw; height: 100vh; }
    #route-overlay {
      display: ${hasDropoff ? 'flex' : 'none'};
      position: absolute; bottom: 12px; left: 12px; right: 12px; z-index: 1000;
      background: rgba(255,255,255,0.95); border-radius: 12px; padding: 10px 16px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.15); font-family: sans-serif;
      flex-direction: row; align-items: center; justify-content: space-between;
    }
    #route-overlay .route-stat { text-align: center; }
    #route-overlay .route-value { font-size: 15px; font-weight: 700; color: #1c1b1b; }
    #route-overlay .route-label { font-size: 10px; color: #4b4734; text-transform: uppercase; letter-spacing: 0.5px; }
    #route-overlay .route-divider { width: 1px; height: 28px; background: #cec6ad; }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="route-overlay">
    <div class="route-stat"><div class="route-value" id="route-dist">—</div><div class="route-label">Distance</div></div>
    <div class="route-divider"></div>
    <div class="route-stat"><div class="route-value" id="route-time">—</div><div class="route-label">Est. Time</div></div>
    <div class="route-divider"></div>
    <div class="route-stat"><div class="route-value" id="route-fare">—</div><div class="route-label">Fare</div></div>
  </div>
  <script>
    var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${pLat}, ${pLng}], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    L.circleMarker([${pLat}, ${pLng}], {
      radius: 10, fillColor: '#22c55e', color: '#fff', weight: 3, fillOpacity: 1
    }).addTo(map).bindPopup('<b>Pickup</b>');

    ${hasDropoff ? `L.circleMarker([${dLat}, ${dLng}], {
      radius: 10, fillColor: '#ba1a1a', color: '#fff', weight: 3, fillOpacity: 1
    }).addTo(map).bindPopup('<b>Dropoff</b>');` : ''}

    var riderMarker = null;
    var routeLine = null;
    var routeCoords = [];
    var animIdx = 0;
    var animInterval = null;

    window.updateRider = function(lat, lng) {
      if (riderMarker) map.removeLayer(riderMarker);
      riderMarker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: '',
          html: '<div style="width:40px;height:40px;border-radius:50%;background:#fde047;border:3px solid #6d5e00;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 2px 10px rgba(0,0,0,0.3);">&#x1F6F5;</div>',
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        })
      }).addTo(map).bindPopup('<b>Rider</b>');
    };

    var riderMarkers = [];
    window.updateRiders = function(ridersJson) {
      riderMarkers.forEach(function(m) { map.removeLayer(m); });
      riderMarkers = [];
      try {
        var riders = JSON.parse(ridersJson);
        riders.forEach(function(r) {
          if (r.current_lat && r.current_lng) {
            var name = (r.name || 'Rider').replace(/'/g, "\\'");
            var plate = (r.plate_number || '').replace(/'/g, "\\'");
            var m = L.marker([parseFloat(r.current_lat), parseFloat(r.current_lng)], {
              icon: L.divIcon({
                className: '',
                html: '<div style="width:28px;height:28px;border-radius:50%;background:#fde047;border:2px solid #6d5e00;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.3);">&#x1F6F5;</div>',
                iconSize: [28, 28],
                iconAnchor: [14, 14]
              })
            }).addTo(map).bindPopup('<b>' + name + '</b><br>' + plate);
            riderMarkers.push(m);
          }
        });
      } catch(e) {}
    };

    window.fitAll = function() {
      if (${hasDropoff}) {
        map.fitBounds([[${pLat}, ${pLng}], [${dLat}, ${dLng}]], { padding: [60, 60] });
      }
    };

    window.loadRoute = function() {
      if (!${hasDropoff}) return;
      var url = 'https://router.project-osrm.org/route/v1/driving/'
        + ${pLng} + ',' + ${pLat} + ';' + ${dLng} + ',' + ${dLat}
        + '?overview=full&geometries=polyline&steps=false';
      fetch(url)
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (data.code === 'Ok' && data.routes.length > 0) {
            var route = data.routes[0];
            routeCoords = pl.decode(route.geometry);
            routeLine = L.polyline(routeCoords, { color: '#6d5e00', weight: 5, opacity: 0.9 }).addTo(map);
            map.fitBounds(routeLine.getBounds(), { padding: [60, 60] });

            var distKm = (route.distance / 1000).toFixed(1);
            var durationMin = Math.ceil(route.duration / 60);
            document.getElementById('route-dist').textContent = distKm + ' km';
            document.getElementById('route-time').textContent = durationMin + ' min';
            document.getElementById('route-fare').textContent = '';
            document.getElementById('route-overlay').style.display = 'flex';

            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'route', distance: route.distance, duration: route.duration, coords: routeCoords.length }));
          }
        })
        .catch(function() {
          var line = L.polyline([[${pLat}, ${pLng}], [${dLat}, ${dLng}]], { color: '#6d5e00', weight: 4, dashArray: '8, 8' }).addTo(map);
          map.fitBounds(line.getBounds(), { padding: [60, 60] });
        });
    };

    ${hasDropoff ? 'setTimeout(loadRoute, 200);' : ''}

    window.moveRiderAlongRoute = function(targetIdx) {
      if (routeCoords.length === 0 || targetIdx >= routeCoords.length) return;
      if (animInterval) clearInterval(animInterval);
      animIdx = targetIdx;
      animInterval = setInterval(function() {
        if (animIdx >= routeCoords.length - 1) { clearInterval(animInterval); return; }
        animIdx++;
        var c = routeCoords[animIdx];
        if (riderMarker) riderMarker.setLatLng(c);
        else window.updateRider(c[0], c[1]);
        map.panTo(c, { animate: true });
      }, 800);
    };
  </script>
</body>
</html>`;
}

export default function TrackingScreen({ route, navigation }) {
  const { showModal, ModalComponent } = useModal();
  const { bookingId } = route.params;
  const webViewRef = useRef(null);
  const [booking, setBooking] = useState(null);
  const [riderLocation, setRiderLocation] = useState(null);
  const [nearbyRiders, setNearbyRiders] = useState([]);
  const [selectedRider, setSelectedRider] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    loadBooking();
    setupSocket();
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  useEffect(() => {
    if (booking && !booking.rider_id && nearbyRiders.length > 0 && webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `window.updateRiders(${JSON.stringify(JSON.stringify(nearbyRiders))});`
      );
    }
  }, [nearbyRiders]);

  useEffect(() => {
    if (riderLocation && webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `window.updateRider(${riderLocation.lat}, ${riderLocation.lng});`
      );
    }
  }, [riderLocation]);

  const setupSocket = () => {
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join:booking', { bookingId });
    });

    socket.on('rider:moved', (data) => {
      setRiderLocation(data);
    });

    socket.on('rider:accepted', () => {
      loadBooking();
      showModal({ icon: '✅', title: 'Rider Found!', message: 'A rider has accepted your booking.' });
    });

    socket.on('rider:started', () => {
      loadBooking();
    });

    socket.on('rider:completed', () => {
      loadBooking();
    });
  };

  const loadBooking = async () => {
    try {
      const { data } = await bookingAPI.getBooking(bookingId);
      setBooking(data.booking);
      if (data.booking && !data.booking.rider_id) {
        loadNearbyRiders(data.booking);
      }
      if (data.booking?.status === 'in_progress' || data.booking?.status === 'completed') {
        loadPaymentStatus();
      }
    } catch (err) {
      console.error('Failed to load booking:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentStatus = async () => {
    try {
      const { data } = await bookingAPI.getPaymentStatus(bookingId);
      const latest = data.payments?.[0];
      if (latest) setPaymentStatus(latest);
    } catch (err) {
      console.error('Failed to load payment status:', err);
    }
  };

  const loadNearbyRiders = async (b) => {
    try {
      const { data } = await riderAPI.getNearby(b.pickup_lat || 2.77, b.pickup_lng || 32.29, 5);
      setNearbyRiders(data.riders || []);
    } catch (err) {
      console.error('Failed to load nearby riders:', err);
    }
  };

  const handleCancel = () => {
    showModal({
      icon: '⚠️',
      title: 'Cancel Trip?',
      message: 'Are you sure you want to cancel this trip?',
      actions: [
        { label: 'No, keep it' },
        { label: 'Yes, cancel', primary: true, onPress: async () => {
          setActionLoading(true);
          try {
            await bookingAPI.cancelBooking(bookingId);
            loadBooking();
            showModal({ icon: '✅', title: 'Cancelled', message: 'Your trip has been cancelled.' });
          } catch (err) {
            showModal({ icon: '⚠️', title: 'Error', message: err.response?.data?.error || 'Failed to cancel.' });
          } finally {
            setActionLoading(false);
          }
        }},
      ],
    });
  };

  const handleSelectRider = (rider) => {
    setSelectedRider(rider);
  };

  const handleRequestRider = async () => {
    if (!selectedRider) return;
    setActionLoading(true);
    try {
      await bookingAPI.requestRider(bookingId, selectedRider.id);
      setSelectedRider(null);
      loadBooking();
      showModal({ icon: '✅', title: 'Request Sent!', message: `Request sent to ${selectedRider.name}. Waiting for them to accept.` });
    } catch (err) {
      showModal({ icon: '⚠️', title: 'Error', message: err.response?.data?.error || 'Failed to request rider.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestAny = async () => {
    setActionLoading(true);
    try {
      await bookingAPI.requestAny(bookingId);
      loadBooking();
      showModal({ icon: '✅', title: 'Request Sent!', message: 'Request sent to the nearest available rider.' });
    } catch (err) {
      showModal({ icon: '⚠️', title: 'Error', message: err.response?.data?.error || 'Failed to find a rider.' });
    } finally {
      setActionLoading(false);
    }
  };

  const statusPillText = () => {
    if (!booking) return '';
    switch (booking.status) {
      case 'pending': return 'Finding a rider...';
      case 'accepted': return 'Rider heading to you';
      case 'in_progress': return 'On the way to destination';
      case 'completed': return 'Trip completed!';
      case 'cancelled': return 'Trip cancelled';
      default: return booking.status;
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (!booking) {
    return <View style={styles.center}><Text style={{ color: colors.onSurface }}>Booking not found</Text></View>;
  }

  const pickup = { lat: booking.pickup_lat || 2.77, lng: booking.pickup_lng || 32.29 };
  const dropoff = booking.dropoff_lat ? { lat: booking.dropoff_lat, lng: booking.dropoff_lng } : null;
  const mapHTML = buildTrackingMapHTML(pickup, dropoff, !!dropoff);

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: mapHTML }}
          style={styles.map}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          onMessage={(event) => {
            try {
              const msg = JSON.parse(event.nativeEvent.data);
              if (msg.type === 'route' && webViewRef.current) {
                webViewRef.current.injectJavaScript('window.fitAll();');
              }
            } catch (e) {}
          }}
        />
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.statusPill}>
          <View style={[styles.statusDot, booking.status === 'completed' && { backgroundColor: '#22c55e' }, booking.status === 'cancelled' && { backgroundColor: colors.error }]} />
          <Text style={styles.statusPillText}>{statusPillText()}</Text>
        </View>
      </View>

      <View style={styles.bottomSheet}>
        <Grabber />
        <View style={styles.sheetContent}>
          {/* PENDING — select rider */}
          {booking.status === 'pending' && !booking.rider_id && (
            <View style={{ flex: 1 }}>
              {!selectedRider ? (
                <>
                  <Text style={styles.sectionTitle}>
                    {nearbyRiders.length > 0 ? `${nearbyRiders.length} Riders Nearby` : 'Searching for riders...'}
                  </Text>
                  {nearbyRiders.length > 0 && (
                    <ScrollView style={styles.ridersList} showsVerticalScrollIndicator={false}>
                      {nearbyRiders.map((rider) => (
                        <TouchableOpacity key={rider.id} style={styles.riderCard} onPress={() => handleSelectRider(rider)} activeOpacity={0.7}>
                          <View style={styles.riderCardLeft}>
                            <View style={styles.riderCardAvatar}>
                              <Text style={styles.riderCardAvatarText}>{rider.name?.[0] || 'R'}</Text>
                            </View>
                            <View style={styles.riderCardInfo}>
                              <Text style={styles.riderCardName}>{rider.name}</Text>
                              <View style={styles.riderCardMeta}>
                                <Text style={styles.riderCardRating}>⭐ {rider.avg_rating ? Number(rider.avg_rating).toFixed(1) : 'New'}</Text>
                                <Text style={styles.riderCardDot}>•</Text>
                                <Text style={styles.riderCardTrips}>{rider.total_trips || 0} trips</Text>
                              </View>
                              {rider.plate_number && <Text style={styles.riderCardPlate}>{rider.plate_number}</Text>}
                            </View>
                          </View>
                          <View style={styles.riderCardStatus}><View style={styles.riderCardOnlineDot} /></View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                  {nearbyRiders.length === 0 && (
                    <View style={styles.waitingContainer}>
                      <ActivityIndicator size="large" color={colors.primary} />
                      <Text style={styles.waitingText}>Looking for available riders near you...</Text>
                    </View>
                  )}
                  {nearbyRiders.length > 0 && (
                    <TouchableOpacity style={[styles.requestAnyBtn, actionLoading && { opacity: 0.5 }]} onPress={handleRequestAny} disabled={actionLoading} activeOpacity={0.8}>
                      {actionLoading ? <ActivityIndicator color={colors.onPrimaryContainer} /> : <Text style={styles.requestAnyBtnText}>Request Nearest Available</Text>}
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={actionLoading} activeOpacity={0.8}>
                    <Text style={styles.cancelBtnText}>Cancel Booking</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={styles.backToRiders} onPress={() => setSelectedRider(null)} activeOpacity={0.7}>
                    <Text style={styles.backToRidersIcon}>←</Text>
                    <Text style={styles.backToRidersText}>All Riders</Text>
                  </TouchableOpacity>
                  <View style={styles.profileHeader}>
                    <View style={styles.profileAvatar}>
                      <Text style={styles.profileAvatarText}>{selectedRider.name?.[0] || 'R'}</Text>
                      <View style={styles.profileVerifiedBadge}><Text style={styles.profileVerifiedIcon}>✓</Text></View>
                    </View>
                    <Text style={styles.profileName}>{selectedRider.name || 'Rider'}</Text>
                    <View style={styles.profileMeta}>
                      <Text style={styles.profileRating}>⭐ {selectedRider.avg_rating ? Number(selectedRider.avg_rating).toFixed(1) : 'New'}</Text>
                      <Text style={styles.profileDot}>•</Text>
                      <Text style={styles.profileTrips}>{selectedRider.total_trips || 0} trips completed</Text>
                    </View>
                  </View>
                  <View style={styles.profileDetails}>
                    <View style={styles.profileDetailRow}>
                      <Text style={styles.profileDetailLabel}>Vehicle Plate</Text>
                      <Text style={styles.profileDetailValue}>{selectedRider.plate_number || 'N/A'}</Text>
                    </View>
                    <View style={styles.profileDetailRow}>
                      <Text style={styles.profileDetailLabel}>Status</Text>
                      <View style={styles.profileStatusBadge}><View style={styles.profileStatusDot} /><Text style={styles.profileStatusText}>Available Now</Text></View>
                    </View>
                    <View style={[styles.profileDetailRow, { borderBottomWidth: 0 }]}>
                      <Text style={styles.profileDetailLabel}>Estimated Fare</Text>
                      <Text style={styles.profileDetailFare}>UGX {(booking.fare_estimate || 0).toLocaleString()}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={[styles.requestRiderBtn, actionLoading && { opacity: 0.5 }]} onPress={handleRequestRider} disabled={actionLoading} activeOpacity={0.8}>
                    {actionLoading ? <ActivityIndicator color={colors.onPrimaryContainer} /> : <Text style={styles.requestRiderBtnText}>Request {selectedRider.name?.split(' ')[0] || 'Rider'}</Text>}
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* ACCEPTED — rider coming */}
          {booking.status === 'accepted' && (
            <>
              <View style={styles.riderSection}>
                <View style={styles.riderAvatar}>
                  <Text style={styles.riderAvatarText}>{booking.rider_name?.[0] || 'R'}</Text>
                  <View style={styles.verifiedBadge}><Text style={styles.verifiedIcon}>✓</Text></View>
                </View>
                <View style={styles.riderInfo}>
                  <Text style={styles.riderDetailName}>{booking.rider_name || 'Rider'}</Text>
                  <View style={styles.riderMeta}>
                    <Text style={styles.riderRating}>⭐ {booking.rider_rating || '--'}</Text>
                    <Text style={styles.riderDot}>•</Text>
                    <Text style={styles.riderPlate}>{booking.rider_plate || 'Boda'}</Text>
                  </View>
                </View>
                <View style={styles.contactButtons}>
                  <TouchableOpacity style={styles.callBtn} onPress={() => { if (booking.rider_phone) Linking.openURL(`tel:${booking.rider_phone}`); else showModal({ icon: '📞', title: 'Call Rider', message: 'Phone not available yet.' }); }} activeOpacity={0.7}>
                    <Text style={styles.contactIcon}>📞</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.progressCard}>
                <View style={styles.progressRow}>
                  <View style={styles.progressDotGreen} />
                  <View style={styles.progressLine} />
                  <View style={styles.progressDotRed} />
                </View>
                <View style={styles.progressLabels}>
                  <Text style={styles.progressLabel}>Pickup</Text>
                  <Text style={styles.progressLabel}>Dropoff</Text>
                </View>
                <Text style={styles.progressStatus}>Rider is heading to your pickup location</Text>
              </View>
              <View style={styles.detailsGrid}>
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Fare</Text>
                  <Text style={styles.detailValue}>UGX {(booking.fare_estimate || 0).toLocaleString()}</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Distance</Text>
                  <Text style={styles.detailValue}>{booking.distance_km ? `${booking.distance_km} km` : '—'}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={actionLoading} activeOpacity={0.8}>
                <Text style={styles.cancelBtnText}>Cancel Trip</Text>
              </TouchableOpacity>
            </>
          )}

          {/* IN PROGRESS — trip ongoing */}
          {booking.status === 'in_progress' && (
            <>
              <View style={styles.riderSection}>
                <View style={styles.riderAvatar}>
                  <Text style={styles.riderAvatarText}>{booking.rider_name?.[0] || 'R'}</Text>
                  <View style={styles.verifiedBadge}><Text style={styles.verifiedIcon}>✓</Text></View>
                </View>
                <View style={styles.riderInfo}>
                  <Text style={styles.riderDetailName}>{booking.rider_name || 'Rider'}</Text>
                  <View style={styles.riderMeta}>
                    <Text style={styles.riderRating}>⭐ {booking.rider_rating || '--'}</Text>
                    <Text style={styles.riderDot}>•</Text>
                    <Text style={styles.riderPlate}>{booking.rider_plate || 'Boda'}</Text>
                  </View>
                </View>
                <View style={styles.contactButtons}>
                  <TouchableOpacity style={styles.callBtn} onPress={() => { if (booking.rider_phone) Linking.openURL(`tel:${booking.rider_phone}`); else showModal({ icon: '📞', title: 'Call Rider', message: 'Phone not available yet.' }); }} activeOpacity={0.7}>
                    <Text style={styles.contactIcon}>📞</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.tripProgressCard}>
                <View style={styles.tripProgressHeader}>
                  <Text style={styles.tripProgressTitle}>Trip in Progress</Text>
                  <View style={styles.tripProgressDot} />
                </View>
                <View style={styles.tripRouteInfo}>
                  <View style={styles.tripRoutePoint}>
                    <View style={styles.tripRouteDotGreen} />
                    <Text style={styles.tripRouteText} numberOfLines={1}>{booking.pickup_address || 'Pickup'}</Text>
                  </View>
                  <View style={styles.tripRouteDashed} />
                  <View style={styles.tripRoutePoint}>
                    <View style={styles.tripRouteDotRed} />
                    <Text style={styles.tripRouteText} numberOfLines={1}>{booking.dropoff_address || 'Dropoff'}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.detailsGrid}>
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Fare</Text>
                  <Text style={styles.detailValue}>UGX {(booking.fare_estimate || 0).toLocaleString()}</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Distance</Text>
                  <Text style={styles.detailValue}>{booking.distance_km ? `${booking.distance_km} km` : '—'}</Text>
                </View>
              </View>
              {paymentStatus && (
                <View style={styles.paymentBadge}>
                  <View style={[styles.paymentDot, { backgroundColor: paymentStatus.status === 'held' || paymentStatus.status === 'released' ? '#22c55e' : paymentStatus.status === 'failed' ? '#ef4444' : '#f59e0b' }]} />
                  <Text style={styles.paymentBadgeText}>
                    Payment {paymentStatus.status === 'held' ? 'secured in escrow' : paymentStatus.status === 'released' ? 'completed' : paymentStatus.status === 'failed' ? 'failed' : 'processing'}
                    {paymentStatus.method ? ` via ${paymentStatus.method.toUpperCase()}` : ''}
                  </Text>
                </View>
              )}
            </>
          )}

          {/* COMPLETED — rate trip */}
          {booking.status === 'completed' && (
            <>
              <View style={styles.completedCard}>
                <Text style={styles.completedIcon}>🎉</Text>
                <Text style={styles.completedTitle}>Trip Completed!</Text>
                <Text style={styles.completedSub}>You arrived at your destination</Text>
              </View>
              <View style={styles.detailsGrid}>
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Final Fare</Text>
                  <Text style={styles.detailValue}>UGX {(booking.fare_final || booking.fare_estimate || 0).toLocaleString()}</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Distance</Text>
                  <Text style={styles.detailValue}>{booking.distance_km ? `${booking.distance_km} km` : '—'}</Text>
                </View>
              </View>
              {paymentStatus && (
                <View style={styles.paymentBadge}>
                  <View style={[styles.paymentDot, { backgroundColor: paymentStatus.status === 'released' ? '#22c55e' : paymentStatus.status === 'failed' ? '#ef4444' : '#f59e0b' }]} />
                  <Text style={styles.paymentBadgeText}>
                    {paymentStatus.status === 'released' ? 'Payment completed — rider paid' : paymentStatus.status === 'held' ? 'Payment held in escrow' : `Payment ${paymentStatus.status}`}
                  </Text>
                </View>
              )}
              <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.replace('Rating', { bookingId, booking })} activeOpacity={0.8}>
                <Text style={styles.primaryBtnText}>Rate Your Trip</Text>
              </TouchableOpacity>
            </>
          )}

          {/* CANCELLED */}
          {booking.status === 'cancelled' && (
            <>
              <View style={styles.completedCard}>
                <Text style={styles.completedIcon}>❌</Text>
                <Text style={styles.completedTitle}>Trip Cancelled</Text>
                <Text style={styles.completedSub}>This booking has been cancelled</Text>
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('Main')} activeOpacity={0.8}>
                <Text style={styles.primaryBtnText}>Back to Home</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
      <ModalComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  mapContainer: { flex: 1, position: 'relative' },
  map: { ...StyleSheet.absoluteFillObject },
  backButton: {
    position: 'absolute', top: 56, left: spacing.lg,
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, zIndex: 10,
  },
  backIcon: { fontSize: 20, color: colors.onSurface },
  statusPill: {
    position: 'absolute', top: 56, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: radius.full, zIndex: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginRight: 8 },
  statusPillText: { ...typography.titleMd, color: colors.onSurface },
  bottomSheet: {
    flex: 1, backgroundColor: colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.12, shadowRadius: 30, elevation: 16,
    overflow: 'hidden',
  },
  sheetContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, paddingTop: spacing.sm, flex: 1 },
  sectionTitle: { ...typography.titleMd, color: colors.onSurface, marginBottom: spacing.md },
  ridersList: { marginBottom: spacing.md },
  riderCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md, backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.xl, borderWidth: 1, borderColor: colors.outlineVariant,
    marginBottom: spacing.sm,
  },
  riderCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  riderCardAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  riderCardAvatarText: { ...typography.titleMd, color: colors.onPrimaryContainer, fontWeight: '700' },
  riderCardInfo: { flex: 1 },
  riderCardName: { ...typography.titleMd, color: colors.onSurface },
  riderCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  riderCardRating: { ...typography.labelSm, color: colors.primary, fontWeight: '600' },
  riderCardDot: { color: colors.outlineVariant },
  riderCardTrips: { ...typography.labelSm, color: colors.onSurfaceVariant },
  riderCardPlate: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2, textTransform: 'uppercase' },
  riderCardStatus: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  riderCardOnlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  waitingContainer: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.md },
  waitingText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  riderSection: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  riderAvatar: {
    width: 56, height: 56, borderRadius: 28, position: 'relative',
    backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.primaryContainer, marginRight: spacing.md,
  },
  riderAvatarText: { ...typography.titleMd, color: colors.onPrimaryContainer, fontWeight: '700' },
  verifiedBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center',
  },
  verifiedIcon: { fontSize: 11, color: '#fff', fontWeight: '700' },
  riderInfo: { flex: 1 },
  riderDetailName: { ...typography.headlineMd, color: colors.onSurface },
  riderMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  riderRating: { ...typography.labelLg, color: colors.primary },
  riderDot: { color: colors.outlineVariant },
  riderPlate: { ...typography.labelLg, color: colors.onSurfaceVariant, textTransform: 'uppercase' },
  contactButtons: { flexDirection: 'row', gap: spacing.sm },
  callBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center',
  },
  contactIcon: { fontSize: 20 },
  detailsGrid: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  detailCard: {
    flex: 1, backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.xl, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  detailLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, textTransform: 'uppercase', marginBottom: 4 },
  detailValue: { ...typography.titleMd, color: colors.onSurface },
  progressCard: {
    backgroundColor: colors.surfaceContainerLow, borderRadius: radius.xl,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.outlineVariant,
    marginBottom: spacing.lg,
  },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  progressDotGreen: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#22c55e' },
  progressDotRed: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.error },
  progressLine: { flex: 1, height: 2, backgroundColor: colors.outlineVariant, marginHorizontal: spacing.sm, borderStyle: 'dashed' },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  progressLabel: { ...typography.labelSm, color: colors.onSurfaceVariant },
  progressStatus: { ...typography.bodyMd, color: colors.onSurface, textAlign: 'center', fontWeight: '500' },
  tripProgressCard: {
    backgroundColor: colors.primaryContainer, borderRadius: radius.xl,
    padding: spacing.lg, marginBottom: spacing.lg,
  },
  tripProgressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  tripProgressTitle: { ...typography.titleMd, color: colors.onPrimaryContainer, fontWeight: '700' },
  tripProgressDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e' },
  tripRouteInfo: { gap: spacing.sm },
  tripRoutePoint: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tripRouteDotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e' },
  tripRouteDotRed: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.error },
  tripRouteDashed: { width: 2, height: 16, marginLeft: 4, borderLeftWidth: 1, borderLeftColor: colors.onPrimaryContainer, borderStyle: 'dashed' },
  tripRouteText: { ...typography.bodyMd, color: colors.onPrimaryContainer, flex: 1 },
  completedCard: { alignItems: 'center', paddingVertical: spacing.xl, marginBottom: spacing.lg },
  completedIcon: { fontSize: 48, marginBottom: spacing.md },
  completedTitle: { ...typography.headlineMd, color: colors.onSurface, marginBottom: 4 },
  completedSub: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  primaryBtn: {
    backgroundColor: colors.primary, height: spacing.touchMin, borderRadius: radius.xl,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  primaryBtnText: { ...typography.titleMd, color: colors.onPrimaryContainer },
  cancelBtn: {
    height: spacing.touchMin, borderRadius: radius.xl,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.outlineVariant, marginTop: spacing.sm,
  },
  cancelBtnText: { ...typography.titleMd, color: colors.onSurfaceVariant },
  requestAnyBtn: {
    backgroundColor: colors.primaryContainer, height: spacing.touchMin, borderRadius: radius.xl,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
    marginTop: spacing.md,
  },
  requestAnyBtnText: { ...typography.titleMd, color: colors.onPrimaryContainer, fontWeight: '700' },
  backToRiders: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl },
  backToRidersIcon: { fontSize: 20, color: colors.primary },
  backToRidersText: { ...typography.titleMd, color: colors.primary },
  profileHeader: { alignItems: 'center', marginBottom: spacing.xl },
  profileAvatar: { width: 80, height: 80, borderRadius: 40, position: 'relative', backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  profileAvatarText: { ...typography.displayLg, color: colors.onPrimaryContainer, fontSize: 32 },
  profileVerifiedBadge: { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  profileVerifiedIcon: { fontSize: 12, color: '#fff', fontWeight: '700' },
  profileName: { ...typography.headlineMd, color: colors.onSurface, marginBottom: 4 },
  profileMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  profileRating: { ...typography.labelLg, color: colors.primary, fontWeight: '600' },
  profileDot: { color: colors.outlineVariant },
  profileTrips: { ...typography.labelLg, color: colors.onSurfaceVariant },
  profileDetails: { backgroundColor: colors.surfaceContainerLow, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.outlineVariant, marginBottom: spacing.xl, overflow: 'hidden' },
  profileDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.surfaceContainer },
  profileDetailLabel: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  profileDetailValue: { ...typography.titleMd, color: colors.onSurface, fontWeight: '600' },
  profileDetailFare: { ...typography.titleMd, color: colors.primary, fontWeight: '700' },
  profileStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  profileStatusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  profileStatusText: { ...typography.labelLg, color: '#22c55e', fontWeight: '600' },
  requestRiderBtn: { backgroundColor: colors.primaryContainer, height: spacing.touchMin, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  requestRiderBtnText: { ...typography.headlineMd, color: colors.onPrimaryContainer },
  paymentBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surfaceContainerLow, marginTop: spacing.sm },
  paymentDot: { width: 8, height: 8, borderRadius: 4 },
  paymentBadgeText: { ...typography.bodySm, color: colors.onSurfaceVariant },
});
