import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { WebView } from 'react-native-webview';
import { useModal } from '../components/useModal';
import { profileAPI } from '../services/api';
import { colors, typography, spacing, radius } from '../theme';

const ICONS = ['🏠', '💼', '🏪', '🏫', '🏥', '⛽', '📍', '🎪', '✈️', '🏟'];

function buildMapHTML() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { margin: 0; padding: 0; }
    #map { width: 100vw; height: 100vh; }
    #pin-info {
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
    }
    #pin-info .pin-text { font-size: 13px; color: #1c1b1b; font-weight: 600; }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="pin-info"><div class="pin-text" id="pin-label"></div></div>
  <script>
    var map = L.map('map', { zoomControl: false }).setView([2.77, 32.29], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);

    var marker = null;

    window.updatePin = function(lat, lng, label) {
      if (marker) map.removeLayer(marker);
      marker = L.marker([lat, lng]).addTo(map);
      map.setView([lat, lng], 16);
      if (label) {
        document.getElementById('pin-label').textContent = label;
        document.getElementById('pin-info').style.display = 'block';
      }
    };

    window.centerOn = function(lat, lng, zoom) {
      map.setView([lat, lng], zoom || 15);
    };
  </script>
</body>
</html>`;
}

export default function SavedPlacesScreen({ navigation }) {
  const { showModal, ModalComponent } = useModal();
  const webViewRef = useRef(null);
  const searchTimeout = useRef(null);

  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adding, setAdding] = useState(false);

  const [label, setLabel] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState('📍');

  const [savedLat, setSavedLat] = useState(null);
  const [savedLng, setSavedLng] = useState(null);
  const [savedAddress, setSavedAddress] = useState('');

  const [mapReady, setMapReady] = useState(false);

  const fetchPlaces = async () => {
    try {
      const { data } = await profileAPI.getSavedPlaces();
      setPlaces(data.places);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchPlaces(); }, []);

  const resetForm = () => {
    setLabel('');
    setSearchQuery('');
    setSearchResults([]);
    setSavedLat(null);
    setSavedLng(null);
    setSavedAddress('');
    setSelectedIcon('📍');
  };

  const searchLocation = (query) => {
    setSearchQuery(query);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (query.length < 3) { setSearchResults([]); return; }

    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=ug&accept-language=en`,
          { headers: { 'Accept': 'application/json', 'User-Agent': 'BodaApp/1.0' } }
        );
        const results = await res.json();
        setSearchResults(results);
      } catch (err) {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const selectResult = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const address = result.display_name.split(',').slice(0, 3).join(', ');
    setSavedLat(lat);
    setSavedLng(lng);
    setSavedAddress(address);
    setSearchQuery(address);
    setSearchResults([]);

    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`window.updatePin(${lat}, ${lng}, "${address.replace(/"/g, '\\"')}");`);
    }
  };

  const handleSave = async () => {
    if (!label.trim()) {
      showModal({ icon: '⚠️', title: 'Label Required', message: 'Give this place a name like "Home" or "Work".' });
      return;
    }
    if (!savedLat || !savedLng) {
      showModal({ icon: '⚠️', title: 'Location Required', message: 'Search and select a place on the map first.' });
      return;
    }
    setAdding(true);
    try {
      const payload = { label: label.trim(), address: savedAddress || searchQuery, lat: savedLat, lng: savedLng, icon: selectedIcon };
      const { data } = await profileAPI.addSavedPlace(payload);
      setPlaces(prev => [...prev, data.place]);
      resetForm();
      showModal({ icon: '✅', title: 'Place Saved', message: `"${label}" has been saved to your places.` });
    } catch (err) {
      showModal({ icon: '❌', title: 'Error', message: err.response?.data?.error || 'Failed to save' });
    } finally { setAdding(false); }
  };

  const handleDelete = (id, placeName) => {
    showModal({
      icon: '🗑',
      title: 'Delete Place',
      message: `Remove "${placeName}" from saved places?`,
      actions: [
        { label: 'Cancel' },
        { label: 'Delete', primary: true, onPress: async () => {
          try {
            await profileAPI.deleteSavedPlace(id);
            setPlaces(prev => prev.filter(p => p.id !== id));
          } catch (err) { showModal({ icon: '❌', title: 'Error', message: 'Failed to delete' }); }
        }},
      ],
    });
  };

  const handlePlaceOnMap = (place) => {
    showModal({
      icon: place.icon || '📍',
      title: place.label,
      message: place.address,
      actions: [
        { label: 'Close' },
        {
          label: 'Navigate', primary: true, onPress: () => {
            navigation.navigate('Home');
          }
        },
      ],
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Places</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPlaces(); }} tintColor={colors.primary} />}>
        {/* Map Preview */}
        <View style={styles.mapContainer}>
          <WebView
            ref={webViewRef}
            source={{ html: buildMapHTML() }}
            style={styles.map}
            onLoad={() => setMapReady(true)}
          />
        </View>

        {/* Add New Place Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add New Place</Text>

          {/* Label */}
          <TextInput
            style={styles.input}
            value={label}
            onChangeText={setLabel}
            placeholder="Label (e.g. Home, Work, Market)"
            placeholderTextColor={colors.onSurfaceVariant}
          />

          {/* Icon Picker */}
          <View style={styles.iconRow}>
            {ICONS.map(icon => (
              <TouchableOpacity
                key={icon}
                style={[styles.iconChip, selectedIcon === icon && styles.iconChipActive]}
                onPress={() => setSelectedIcon(icon)}
                activeOpacity={0.7}
              >
                <Text style={styles.iconText}>{icon}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Location Search */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={searchLocation}
              placeholder="Search for a place in Gulu..."
              placeholderTextColor={colors.onSurfaceVariant}
            />
            {searching && <ActivityIndicator style={styles.searchSpinner} color={colors.primary} size="small" />}
          </View>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <View style={styles.resultsCard}>
              {searchResults.map((result, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.resultItem, idx < searchResults.length - 1 && styles.resultBorder]}
                  onPress={() => selectResult(result)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resultIcon}>📍</Text>
                  <Text style={styles.resultText} numberOfLines={2}>{result.display_name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Save Button */}
          {savedLat && (
            <TouchableOpacity
              style={[styles.saveBtn, adding && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={adding}
              activeOpacity={0.7}
            >
              {adding ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save Place</Text>}
            </TouchableOpacity>
          )}
        </View>

        {/* Saved Places List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Places ({places.length})</Text>
          {places.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📍</Text>
              <Text style={styles.emptyText}>No saved places yet</Text>
              <Text style={styles.emptySub}>Search and add your Home, Work, or favorite spots above</Text>
            </View>
          ) : places.map(place => (
            <TouchableOpacity key={place.id} style={styles.placeCard} onPress={() => handlePlaceOnMap(place)} activeOpacity={0.7}>
              <Text style={styles.placeIcon}>{place.icon || '📍'}</Text>
              <View style={styles.placeInfo}>
                <Text style={styles.placeLabel}>{place.label}</Text>
                <Text style={styles.placeAddress} numberOfLines={2}>{place.address}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(place.id, place.label)} style={styles.deleteBtn} activeOpacity={0.7}>
                <Text style={styles.deleteIcon}>✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
      <ModalComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 56 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 28, color: colors.onSurface, lineHeight: 30 },
  headerTitle: { ...typography.headlineMd, color: colors.onSurface },
  mapContainer: { height: 200, marginHorizontal: spacing.lg, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.outlineVariant, marginBottom: spacing.lg },
  map: { flex: 1 },
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  sectionTitle: { ...typography.labelLg, color: colors.primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md },
  input: { backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.outlineVariant, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, ...typography.bodyMd, color: colors.onSurface, marginBottom: spacing.sm },
  iconRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  iconChip: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: colors.outlineVariant, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceContainerLowest },
  iconChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryContainer },
  iconText: { fontSize: 20 },
  searchContainer: { position: 'relative' },
  searchInput: { backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.outlineVariant, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, ...typography.bodyMd, color: colors.onSurface },
  searchSpinner: { position: 'absolute', right: 16, top: 14 },
  resultsCard: { backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.outlineVariant, marginTop: spacing.sm, overflow: 'hidden' },
  resultItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md },
  resultBorder: { borderBottomWidth: 1, borderBottomColor: colors.outlineVariant },
  resultIcon: { fontSize: 16 },
  resultText: { flex: 1, ...typography.bodySm, color: colors.onSurface, lineHeight: 18 },
  saveBtn: { marginTop: spacing.md, paddingVertical: spacing.md, borderRadius: radius.lg, backgroundColor: colors.primary, alignItems: 'center' },
  saveBtnText: { ...typography.titleMd, color: '#fff', fontWeight: '700' },
  placeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.outlineVariant, marginBottom: spacing.md, gap: spacing.md },
  placeIcon: { fontSize: 28 },
  placeInfo: { flex: 1 },
  placeLabel: { ...typography.titleMd, color: colors.onSurface },
  placeAddress: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2, lineHeight: 16 },
  deleteBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.errorContainer, alignItems: 'center', justifyContent: 'center' },
  deleteIcon: { fontSize: 14, color: colors.error, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl * 2 },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyText: { ...typography.titleMd, color: colors.onSurface },
  emptySub: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 4, textAlign: 'center' },
});
