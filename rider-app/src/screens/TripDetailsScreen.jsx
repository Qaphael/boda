import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { colors, typography, spacing, radius } from '../theme';
import { useModal } from '../components/useModal';

function buildRouteMapHTML(pickup, dropoff) {
  const pLat = pickup?.lat || 2.77;
  const pLng = pickup?.lng || 32.29;
  const dLat = dropoff?.lat || 2.78;
  const dLng = dropoff?.lng || 32.30;

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
  <style>body{margin:0;padding:0;}#map{width:100vw;height:100vh;}</style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false }).setView([${pLat}, ${pLng}], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
    L.circleMarker([${pLat}, ${pLng}], { radius: 8, fillColor: '#22c55e', color: '#fff', weight: 3, fillOpacity: 1 }).addTo(map).bindPopup('<b>Pickup</b>');
    L.circleMarker([${dLat}, ${dLng}], { radius: 8, fillColor: '#ba1a1a', color: '#fff', weight: 3, fillOpacity: 1 }).addTo(map).bindPopup('<b>Dropoff</b>');
    var url = 'https://router.project-osrm.org/route/v1/driving/' + ${pLng} + ',' + ${pLat} + ';' + ${dLng} + ',' + ${dLat} + '?overview=full&geometries=polyline&steps=false';
    fetch(url).then(function(r){return r.json();}).then(function(d){
      if(d.code==='Ok'&&d.routes.length>0){
        var coords=polyline.decode(d.routes[0].geometry);
        L.polyline(coords,{color:'#6d5e00',weight:5,opacity:0.9}).addTo(map);
          map.fitBounds(L.polyline(coords).getBounds(),{paddingBottomRight: L.point(60, 200)});
      }
    }).catch(function(){
      L.polyline([[${pLat},${pLng}],[${dLat},${dLng}]],{color:'#6d5e00',weight:4,dashArray:'8,8'}).addTo(map);
      map.fitBounds([[${pLat},${pLng}],[${dLat},${dLng}]],{paddingBottomRight: L.point(60, 200)});
    });
  </script>
</body>
</html>`;
}

export default function TripDetailsScreen({ route, navigation }) {
  const { booking } = route.params || {};
  const { showModal, ModalComponent } = useModal();
  const insets = useSafeAreaInsets();

  const fare = booking?.fare_final || booking?.fare_estimate || 0;
  const distance = booking?.distance_km ? `${booking.distance_km} km` : '--';
  const duration = booking?.completed_at && booking?.started_at
    ? `${Math.ceil((new Date(booking.completed_at) - new Date(booking.started_at)) / 60000)} min`
    : '--';
  const paymentMethod = booking?.payment?.method?.toUpperCase() || 'MoMo';

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.mapContainer}>
          <WebView
            source={{ html: buildRouteMapHTML(
              { lat: booking?.pickup_lat, lng: booking?.pickup_lng },
              { lat: booking?.dropoff_lat, lng: booking?.dropoff_lng }
            )}}
            style={styles.map}
            originWhitelist={['*']}
          />
          <TouchableOpacity style={[styles.backBtn, { top: insets.top + 8 }]} onPress={() => navigation.navigate('Main')} activeOpacity={0.7}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tripCard}>
          <View style={styles.tripBadge}>
            <Text style={styles.tripBadgeText}>BODA BODA</Text>
          </View>
          <Text style={styles.tripDate}>{booking?.completed_at ? new Date(booking.completed_at).toLocaleDateString('en-UG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--'}</Text>
          <View style={styles.tripStatus}>
            <Text style={styles.tripStatusText}>Trip Completed</Text>
          </View>
          <Text style={styles.tripFare}>UGX {fare.toLocaleString()}</Text>

          <View style={styles.routeSection}>
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

          <View style={styles.bentoGrid}>
            <View style={styles.bentoCard}>
              <Text style={styles.bentoValue}>{duration}</Text>
              <Text style={styles.bentoLabel}>Duration</Text>
            </View>
            <View style={styles.bentoCard}>
              <Text style={styles.bentoValue}>{distance}</Text>
              <Text style={styles.bentoLabel}>Distance</Text>
            </View>
          </View>

          <View style={styles.fareBreakdown}>
            <Text style={styles.fareBreakdownTitle}>Trip Fare</Text>
            <View style={[styles.fareRow, styles.fareRowTotal]}>
              <Text style={styles.fareLabelTotal}>Total</Text>
              <Text style={styles.fareValueTotal}>UGX {fare.toLocaleString()}</Text>
            </View>
          </View>

          <View style={styles.paymentStatus}>
            <Text style={styles.paymentIcon}>✓</Text>
            <Text style={styles.paymentText}>Paid via {paymentMethod}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('Main')} activeOpacity={0.8}>
            <Text style={styles.primaryBtnText}>Done</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
      <ModalComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  mapContainer: { height: 300, position: 'relative' },
  map: { ...StyleSheet.absoluteFillObject },
  backBtn: { position: 'absolute', left: spacing.lg, width: 48, height: 48, borderRadius: 24, backgroundColor: `${colors.surface}ee`, alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  backIcon: { fontSize: 20, color: colors.onSurface },
  tripCard: { marginHorizontal: spacing.lg, marginTop: -40, backgroundColor: colors.surfaceContainerLowest, borderRadius: 24, padding: spacing.xl, borderWidth: 1, borderColor: colors.outlineVariant, zIndex: 10 },
  tripBadge: { backgroundColor: colors.inverseSurface, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.full, marginBottom: spacing.md },
  tripBadgeText: { ...typography.labelSm, color: colors.inverseOnSurface, fontWeight: '700' },
  tripDate: { ...typography.labelLg, color: colors.onSurfaceVariant, marginBottom: 4 },
  tripStatus: { marginBottom: spacing.sm },
  tripStatusText: { ...typography.labelLg, color: '#22c55e', fontWeight: '600' },
  tripFare: { ...typography.displayLg, color: colors.onSurface, fontSize: 32, marginBottom: spacing.sm },
  routeSection: { marginBottom: spacing.lg },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  greenDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#22c55e' },
  redDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.error },
  dashedLine: { width: 2, height: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.outlineVariant, marginLeft: 5 },
  locationText: { ...typography.bodyMd, color: colors.onSurface, flex: 1 },
  bentoGrid: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  bentoCard: { flex: 1, backgroundColor: colors.surfaceContainerLow, borderRadius: radius.xl, padding: spacing.lg, alignItems: 'center' },
  bentoValue: { ...typography.titleMd, color: colors.onSurface },
  bentoLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },
  fareBreakdown: { backgroundColor: colors.surfaceContainerLow, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.lg },
  fareBreakdownTitle: { ...typography.titleMd, color: colors.onSurface, marginBottom: spacing.md },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  fareRowTotal: { borderTopWidth: 1, borderTopColor: colors.outlineVariant, marginTop: spacing.sm, paddingTop: spacing.md },
  fareLabelTotal: { ...typography.titleMd, color: colors.onSurface, fontWeight: '700' },
  fareValueTotal: { ...typography.titleMd, color: colors.primary, fontWeight: '700' },
  paymentStatus: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  paymentIcon: { fontSize: 16, color: '#22c55e', fontWeight: '700' },
  paymentText: { ...typography.labelLg, color: colors.onSurfaceVariant },
  actions: { paddingHorizontal: spacing.lg, gap: spacing.md, marginTop: spacing.lg },
  primaryBtn: { backgroundColor: colors.primaryContainer, height: spacing.touchMin, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { ...typography.titleMd, color: colors.onPrimaryContainer },
});
