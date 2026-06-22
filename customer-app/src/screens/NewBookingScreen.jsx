import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useModal } from '../components/useModal';
import * as Location from 'expo-location';
import { bookingAPI, riderAPI, profileAPI } from '../services/api';
import Grabber from '../components/Grabber';
import { colors, typography, spacing, radius } from '../theme';

const VEHICLE_TYPES = [
  {
    id: 'boda',
    name: 'Gulu Boda',
    desc: 'Fast arrival',
    icon: '🏍',
    baseFare: 1000,
    perKm: 500,
  },
];

function buildBookingMapHTML(pickup, dropoff) {
  const pLat = pickup?.lat || 2.77;
  const pLng = pickup?.lng || 32.29;

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var polyline = { decode: function(encoded) {
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
    #route-info {
      display: none;
      position: absolute;
      bottom: 12px;
      left: 12px;
      right: 12px;
      z-index: 1000;
      background: rgba(255,255,255,0.95);
      border-radius: 12px;
      padding: 12px 16px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.15);
      font-family: sans-serif;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
    #route-info .route-stat { text-align: center; }
    #route-info .route-value {
      font-size: 16px;
      font-weight: 700;
      color: #1c1b1b;
    }
    #route-info .route-label {
      font-size: 11px;
      color: #4b4734;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    #route-info .route-divider {
      width: 1px;
      height: 30px;
      background: #cec6ad;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="route-info">
    <div class="route-stat">
      <div class="route-value" id="route-distance">—</div>
      <div class="route-label">Distance</div>
    </div>
    <div class="route-divider"></div>
    <div class="route-stat">
      <div class="route-value" id="route-time">—</div>
      <div class="route-label">Est. Time</div>
    </div>
    <div class="route-divider"></div>
    <div class="route-stat">
      <div class="route-value" id="route-fare">—</div>
      <div class="route-label">Est. Fare</div>
    </div>
  </div>
  <script>
    var map = L.map('map', { zoomControl: false, attributionControl: false })
      .setView([${pLat}, ${pLng}], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    var pickupMarker = L.circleMarker([${pLat}, ${pLng}], {
      radius: 8, fillColor: '#22c55e', color: '#fff', weight: 3, fillOpacity: 1
    }).addTo(map).bindPopup('Pickup');

    var routePolyline = null;
    var dropoffMarker = null;
    var routeDistanceM = 0;
    var routeDurationS = 0;

    function calcFare(distM, vehicleId) {
      var rates = { boda: { base: 1000, perKm: 500 }, delivery: { base: 1500, perKm: 700 } };
      var r = rates[vehicleId] || rates.boda;
      return Math.ceil(r.base + (distM / 1000) * r.perKm);
    }

    window.updateFare = function(vehicleId) {
      if (routeDistanceM > 0) {
        document.getElementById('route-fare').textContent = 'UGX ' + calcFare(routeDistanceM, vehicleId).toLocaleString();
      }
    };

    window.updateDropoff = function(lat, lng) {
      if (dropoffMarker) map.removeLayer(dropoffMarker);
      if (routePolyline) map.removeLayer(routePolyline);

      dropoffMarker = L.circleMarker([lat, lng], {
        radius: 8, fillColor: '#ba1a1a', color: '#fff', weight: 3, fillOpacity: 1
      }).addTo(map).bindPopup('Dropoff');

      var url = 'https://router.project-osrm.org/route/v1/driving/'
        + ${pLng} + ',' + ${pLat} + ';' + lng + ',' + lat
        + '?overview=full&geometries=polyline&steps=false';

      fetch(url)
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (data.code === 'Ok' && data.routes.length > 0) {
            var route = data.routes[0];
            var coords = polyline.decode(route.geometry);
            routePolyline = L.polyline(coords, {
              color: '#6d5e00', weight: 4, opacity: 0.9
            }).addTo(map);

            routeDistanceM = route.distance;
            routeDurationS = route.duration;
            var distKm = (route.distance / 1000).toFixed(1);
            var durationMin = Math.ceil(route.duration / 60);

            document.getElementById('route-distance').textContent = distKm + ' km';
            document.getElementById('route-time').textContent = durationMin < 1 ? '< 1 min' : durationMin + ' min';
            document.getElementById('route-fare').textContent = 'UGX ' + calcFare(route.distance, 'boda').toLocaleString();
            document.getElementById('route-info').style.display = 'flex';

            map.fitBounds(routePolyline.getBounds(), { padding: [40, 40] });

            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'route', distance: route.distance, duration: route.duration }));
          }
        })
        .catch(function() {
          var R = 6371;
          var dLat = (lat - ${pLat}) * Math.PI / 180;
          var dLng = (lng - ${pLng}) * Math.PI / 180;
          var a = Math.sin(dLat/2)*Math.sin(dLat/2) +
            Math.cos(${pLat}*Math.PI/180)*Math.cos(lat*Math.PI/180)*
            Math.sin(dLng/2)*Math.sin(dLng/2);
          var dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

          routeDistanceM = dist * 1000;
          routePolyline = L.polyline([[${pLat}, ${pLng}], [lat, lng]], {
            color: '#6d5e00', weight: 3, dashArray: '8, 8'
          }).addTo(map);

          document.getElementById('route-distance').textContent = dist.toFixed(1) + ' km';
          document.getElementById('route-time').textContent = Math.ceil((dist/25)*60) + ' min';
          document.getElementById('route-fare').textContent = 'UGX ' + calcFare(routeDistanceM, 'boda').toLocaleString();
          document.getElementById('route-info').style.display = 'flex';
          map.fitBounds(routePolyline.getBounds(), { padding: [40, 40] });

          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'route', distance: routeDistanceM, duration: (dist/25)*3600 }));
        });
    };
  </script>
</body>
</html>`;
}

export default function NewBookingScreen({ route, navigation }) {
  const { showModal, ModalComponent } = useModal();
  const { type } = route.params;
  const webViewRef = useRef(null);
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropoffCoords, setDropoffCoords] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(type === 'ride' ? 'boda' : 'delivery');
  const [fareEstimate, setFareEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [nearbyCount, setNearbyCount] = useState(0);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [roadDistanceM, setRoadDistanceM] = useState(0);
  const searchTimeout = useRef(null);

  useEffect(() => {
    getCurrentLocation();
    profileAPI.getSavedPlaces()
      .then(({ data }) => setSavedPlaces(data.places || []))
      .catch(() => {});
    profileAPI.getPaymentMethods()
      .then(({ data }) => {
        const methods = data.methods || [];
        setPaymentMethods(methods);
        const def = methods.find(m => m.is_default) || methods[0];
        if (def) setSelectedPayment(def);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `window.updateFare('${selectedVehicle}');`
      );
    }
  }, [selectedVehicle]);

  useEffect(() => {
    if (pickupCoords && dropoffCoords) {
      calculateFare();
    }
  }, [pickupCoords, dropoffCoords, selectedVehicle, roadDistanceM]);

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationLoading(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };
      setPickupCoords(coords);

      try {
        const places = await Location.reverseGeocodeAsync(coords);
        if (places.length > 0) {
          const p = places[0];
          setPickupAddress([p.name, p.street, p.city].filter(Boolean).join(', '));
        } else {
          setPickupAddress('Current Location');
        }
      } catch {
        setPickupAddress('Current Location');
      }

      try {
        const { data } = await riderAPI.getNearby(coords.lat, coords.lng, 5);
        setNearbyCount(data.riders?.length || 0);
      } catch {
        setNearbyCount(0);
      }
    } catch (err) {
      console.error('Location error:', err);
    } finally {
      setLocationLoading(false);
    }
  };

  const searchLocations = (query) => {
    setDropoffAddress(query);
    setShowResults(true);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const lat = pickupCoords?.lat || 2.77;
        const lng = pickupCoords?.lng || 32.29;
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=ug&accept-language=en`,
          { headers: { 'Accept': 'application/json', 'User-Agent': 'BodaApp/1.0' } }
        );
        const results = await res.json();
        setSearchResults(results);
      } catch (err) {
        console.error('Search error:', err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const selectLocation = (result) => {
    const coords = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
    setDropoffCoords(coords);
    setDropoffAddress(result.display_name.split(',').slice(0, 3).join(', '));
    setSearchResults([]);
    setShowResults(false);
    setSearchFocused(false);

    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `window.updateDropoff(${coords.lat}, ${coords.lng});`
      );
    }
  };

  const selectSavedPlace = (place) => {
    const coords = { lat: parseFloat(place.lat), lng: parseFloat(place.lng) };
    setDropoffCoords(coords);
    setDropoffAddress(place.address);
    setShowResults(false);
    setSearchFocused(false);
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `window.updateDropoff(${coords.lat}, ${coords.lng});`
      );
    }
  };

  const calculateFare = () => {
    let distanceKm;
    if (roadDistanceM > 0) {
      distanceKm = roadDistanceM / 1000;
    } else if (pickupCoords && dropoffCoords) {
      const R = 6371;
      const dLat = (dropoffCoords.lat - pickupCoords.lat) * Math.PI / 180;
      const dLng = (dropoffCoords.lng - pickupCoords.lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(pickupCoords.lat * Math.PI / 180) * Math.cos(dropoffCoords.lat * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distanceKm = R * c;
    } else {
      return;
    }

    const vehicle = VEHICLE_TYPES.find(v => v.id === selectedVehicle);
    const fare = Math.ceil(vehicle.baseFare + (distanceKm * vehicle.perKm));
    setFareEstimate(fare);
  };

  const handleConfirm = async () => {
    if (!pickupCoords || !dropoffCoords) return;

    setLoading(true);
    try {
      const bookingData = {
        type: 'ride',
        pickup_lat: pickupCoords.lat,
        pickup_lng: pickupCoords.lng,
        pickup_address: pickupAddress,
        dropoff_lat: dropoffCoords.lat,
        dropoff_lng: dropoffCoords.lng,
        dropoff_address: dropoffAddress,
        fare_estimate: fareEstimate,
        payment_method_id: selectedPayment?.id || undefined,
      };

      const { data } = await bookingAPI.create(bookingData);
      navigation.navigate('Tracking', { bookingId: data.bookingId });
    } catch (err) {
      const activeId = err.response?.data?.activeBookingId;
      const msg = err.response?.data?.error || 'Could not create booking. Please try again.';
      if (activeId) {
        showModal({
          icon: '⚠️',
          title: 'Active Booking',
          message: msg,
          actions: [
            { label: 'View Active', onPress: () => navigation.navigate('BookingDetail', { bookingId: activeId }) },
            { label: 'Cancel It', primary: true, onPress: async () => {
              try {
                await bookingAPI.cancelBooking(activeId);
                showModal({ icon: '✅', title: 'Cancelled', message: 'Your active booking has been cancelled. You can now book a new ride.' });
              } catch (e) {
                const errMsg = e.response?.data?.error || 'Failed to cancel.';
                showModal({ icon: '⚠️', title: 'Error', message: errMsg });
              }
            }},
          ],
        });
      } else {
        showModal({ icon: '⚠️', title: 'Booking Failed', message: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: buildBookingMapHTML(pickupCoords) }}
          style={styles.map}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          onMessage={(event) => {
            try {
              const msg = JSON.parse(event.nativeEvent.data);
              if (msg.type === 'route') {
                setRoadDistanceM(msg.distance);
              }
            } catch (e) {}
          }}
        />

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.bottomSheet, searchFocused && styles.bottomSheetExpanded]}>
        <Grabber />
        <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.addressSection}>
            <View style={styles.addressCard}>
              <View style={styles.dashedLine} />
              <View style={styles.addressRow}>
                <View style={styles.pickupDot} />
                <View style={styles.addressInputWrapper}>
                  <Text style={styles.addressLabel}>Pickup</Text>
                  {locationLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 4 }} />
                  ) : (
                    <Text style={styles.addressValue}>{pickupAddress || 'Current Location'}</Text>
                  )}
                </View>
              </View>
              <View style={styles.addressRow}>
                <View style={styles.dropoffDot} />
                <View style={[styles.addressInputWrapper, styles.dropoffInput]}>
                  <Text style={styles.addressLabel}>Dropoff</Text>
                  <TextInput
                    style={styles.addressTextInput}
                    value={dropoffAddress}
                    onChangeText={searchLocations}
                    placeholder="Search destination..."
                    placeholderTextColor={colors.outline}
                    onFocus={() => { setShowResults(true); setSearchFocused(true); }}
                    onBlur={() => { setTimeout(() => setSearchFocused(false), 200); }}
                  />
                </View>
              </View>
            </View>

            {showResults && dropoffAddress.length >= 3 && (
              <View style={styles.searchResults}>
                {searching ? (
                  <ActivityIndicator size="small" color={colors.primary} style={{ padding: 16 }} />
                ) : searchResults.length > 0 ? (
                  searchResults.map((result, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.searchResultItem}
                      onPress={() => selectLocation(result)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.searchResultIcon}>📍</Text>
                      <Text style={styles.searchResultText} numberOfLines={2}>
                        {result.display_name}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.noResults}>No results found</Text>
                )}
              </View>
            )}

            {showResults && searchFocused && dropoffAddress.length < 3 && savedPlaces.length > 0 && (
              <View style={styles.savedPlacesSection}>
                <Text style={styles.savedPlacesTitle}>Saved Places</Text>
                {savedPlaces.map((place) => (
                  <TouchableOpacity
                    key={place.id}
                    style={styles.savedPlaceItem}
                    onPress={() => selectSavedPlace(place)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.savedPlaceIcon}>{place.icon || '📍'}</Text>
                    <View style={styles.savedPlaceInfo}>
                      <Text style={styles.savedPlaceLabel}>{place.label}</Text>
                      <Text style={styles.savedPlaceAddress} numberOfLines={1}>{place.address}</Text>
                    </View>
                    <Text style={styles.savedPlaceArrow}>→</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <Text style={styles.sectionTitle}>Your Ride</Text>
          <View style={styles.vehicleList}>
            {VEHICLE_TYPES.map((vehicle) => (
              <View
                key={vehicle.id}
                style={[styles.vehicleCard, styles.vehicleCardSelected]}
              >
                <View style={styles.vehicleLeft}>
                  <View style={[
                    styles.vehicleIconBg,
                    selectedVehicle === vehicle.id ? styles.vehicleIconBgActive : null,
                  ]}>
                    <Text style={styles.vehicleIcon}>{vehicle.icon}</Text>
                  </View>
                  <View>
                    <Text style={styles.vehicleName}>{vehicle.name}</Text>
                    <Text style={styles.vehicleDesc}>{vehicle.desc}</Text>
                  </View>
                </View>
                <Text style={styles.vehicleFare}>
                  {fareEstimate && selectedVehicle === vehicle.id
                    ? `UGX ${fareEstimate.toLocaleString()}`
                    : '—'}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.paymentSection}>
            <Text style={styles.sectionLabel}>Payment Method</Text>
            {paymentMethods.length === 0 ? (
              <TouchableOpacity style={styles.momoBadge} onPress={() => navigation.navigate('PaymentMethods')} activeOpacity={0.7}>
                <View style={styles.momoIcon}>
                  <Text style={styles.momoIconText}>+</Text>
                </View>
                <View style={styles.momoInfo}>
                  <Text style={styles.momoName}>Add MoMo Number</Text>
                  <Text style={styles.momoNumber}>Set up payment to continue</Text>
                </View>
                <Text style={styles.momoChevron}>›</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.momoBadge}
                onPress={() => {
                  const currentIndex = paymentMethods.findIndex(m => m.id === selectedPayment?.id);
                  const nextIndex = (currentIndex + 1) % paymentMethods.length;
                  setSelectedPayment(paymentMethods[nextIndex]);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.momoIcon, { backgroundColor: selectedPayment?.type === 'airtel' ? '#e11d48' : '#fbbf24' }]}>
                  <Text style={[styles.momoIconText, { color: selectedPayment?.type === 'airtel' ? '#fff' : '#713f12' }]}>
                    {selectedPayment?.type === 'airtel' ? 'AIR' : 'MTN'}
                  </Text>
                </View>
                <View style={styles.momoInfo}>
                  <Text style={styles.momoName}>{selectedPayment?.type === 'airtel' ? 'Airtel Money' : 'MTN MoMo'}</Text>
                  <Text style={styles.momoNumber}>{selectedPayment?.phone_number ? `•••• ${selectedPayment.phone_number.slice(-4)}` : 'No number'}</Text>
                </View>
                {paymentMethods.length > 1 && <Text style={styles.momoChevron}>↻</Text>}
              </TouchableOpacity>
            )}
          </View>

        </ScrollView>

        <View style={styles.confirmWrapper}>
          <TouchableOpacity
            style={[styles.confirmButton, (!pickupCoords || !dropoffCoords || loading) && styles.buttonDisabled]}
            onPress={handleConfirm}
            disabled={!pickupCoords || !dropoffCoords || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.onPrimaryContainer} />
            ) : (
              <Text style={styles.confirmButtonText}>
                Confirm Boda
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
      <ModalComponent />
    </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  backButton: {
    position: 'absolute',
    top: 56,
    left: spacing.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  backIcon: {
    fontSize: 20,
    color: colors.onSurface,
  },
  bottomSheet: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 16,
    overflow: 'hidden',
  },
  bottomSheetExpanded: {
    flex: 3,
  },
  sheetScroll: {
    paddingHorizontal: spacing.lg,
    flex: 1,
  },
  addressSection: {
    marginBottom: spacing.xl,
  },
  addressCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.xl,
    padding: spacing.md,
    position: 'relative',
  },
  dashedLine: {
    position: 'absolute',
    left: 28,
    top: 42,
    bottom: 42,
    width: 2,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
  },
  pickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
  },
  dropoffDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.error,
  },
  addressInputWrapper: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  dropoffInput: {
    borderWidth: 2,
    borderColor: colors.primaryContainer,
  },
  addressLabel: {
    ...typography.labelSm,
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  addressValue: {
    ...typography.titleMd,
    color: colors.onSurface,
    marginTop: 2,
  },
  addressTextInput: {
    ...typography.titleMd,
    color: colors.onSurface,
    padding: 0,
    marginTop: 2,
  },
  searchResults: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  searchResultIcon: {
    fontSize: 16,
  },
  searchResultText: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  noResults: {
    padding: spacing.lg,
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  sectionTitle: {
    ...typography.titleLg,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  vehicleList: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  vehicleCardSelected: {
    borderWidth: 2,
    borderColor: colors.onSurface,
    backgroundColor: `${colors.primaryContainer}26`,
  },
  vehicleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  vehicleIconBg: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleIconBgActive: {
    backgroundColor: colors.primary,
  },
  vehicleIcon: {
    fontSize: 28,
  },
  vehicleName: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  vehicleDesc: {
    ...typography.labelSm,
    color: colors.secondary,
  },
  vehicleFare: {
    ...typography.headlineMd,
    color: colors.onSurface,
  },
  paymentSection: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  momoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: `${colors.primaryFixed}1a`,
    borderWidth: 1,
    borderColor: `${colors.primaryFixed}4d`,
  },
  momoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffcc00',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  momoIconText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.onBackground,
  },
  momoInfo: {
    flex: 1,
  },
  momoName: {
    ...typography.labelLg,
    color: colors.onSurface,
  },
  momoNumber: {
    ...typography.bodyMd,
    color: colors.secondary,
  },
  momoChevron: {
    fontSize: 24,
    color: colors.secondary,
  },
  confirmWrapper: {
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
  },
  confirmButton: {
    backgroundColor: colors.primaryContainer,
    height: spacing.touchMin,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    ...typography.headlineMd,
    color: colors.onPrimaryContainer,
  },
  savedPlacesSection: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
  },
  savedPlacesTitle: {
    ...typography.labelLg,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  savedPlaceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant || '#e0e0e0',
  },
  savedPlaceIcon: {
    fontSize: 22,
  },
  savedPlaceInfo: {
    flex: 1,
  },
  savedPlaceLabel: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  savedPlaceAddress: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant || '#666',
    marginTop: 2,
  },
  savedPlaceArrow: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '600',
  },
});
