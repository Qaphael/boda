import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useModal } from '../components/useModal';
import * as Location from 'expo-location';
import { bookingAPI, riderAPI } from '../services/api';
import Grabber from '../components/Grabber';
import { colors, typography, spacing, radius } from '../theme';

const VEHICLE_TYPES = [
  {
    id: 'boda',
    name: 'Gulu Boda',
    desc: '3 min • Fast arrival',
    icon: '🏍',
    baseFare: 1000,
    perKm: 500,
  },
  {
    id: 'delivery',
    name: 'Delivery Bike',
    desc: '5 min • Large box',
    icon: '📦',
    baseFare: 1500,
    perKm: 700,
  },
];

export default function NewBookingScreen({ route, navigation }) {
  const { showModal, ModalComponent } = useModal();
  const { type } = route.params;
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropoffCoords, setDropoffCoords] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(type === 'ride' ? 'boda' : 'delivery');
  const [fareEstimate, setFareEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [nearbyCount, setNearbyCount] = useState(0);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (pickupCoords && dropoffCoords) {
      calculateFare();
    }
  }, [pickupCoords, dropoffCoords, selectedVehicle]);

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({});
      const coords = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };
      setPickupCoords(coords);
      setPickupAddress('Current Location');

      try {
        const { data } = await riderAPI.getNearby(coords.lat, coords.lng, 5);
        setNearbyCount(data.riders?.length || 0);
      } catch (e) {
        setNearbyCount(5);
      }
    } catch (err) {
      console.error('Location error:', err);
    } finally {
      setLocationLoading(false);
    }
  };

  const calculateFare = () => {
    if (!pickupCoords || !dropoffCoords) return;
    const R = 6371;
    const dLat = (dropoffCoords.lat - pickupCoords.lat) * Math.PI / 180;
    const dLng = (dropoffCoords.lng - pickupCoords.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(pickupCoords.lat * Math.PI / 180) * Math.cos(dropoffCoords.lat * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    const vehicle = VEHICLE_TYPES.find(v => v.id === selectedVehicle);
    const fare = Math.ceil(vehicle.baseFare + (distance * vehicle.perKm));
    setFareEstimate(fare);
  };

  const handleConfirm = async () => {
    if (!pickupCoords || !dropoffCoords) return;

    setLoading(true);
    try {
      const bookingData = {
        type: selectedVehicle === 'delivery' ? 'delivery' : 'ride',
        pickup_lat: pickupCoords.lat,
        pickup_lng: pickupCoords.lng,
        pickup_address: pickupAddress,
        dropoff_lat: dropoffCoords.lat,
        dropoff_lng: dropoffCoords.lng,
        dropoff_address: dropoffAddress,
        fare_estimate: fareEstimate,
      };

      if (selectedVehicle === 'delivery') {
        bookingData.item_description = 'Package delivery';
        bookingData.recipient_name = 'Recipient';
        bookingData.recipient_phone = '256780000000';
      }

      const { data } = await bookingAPI.create(bookingData);
      navigation.navigate('Tracking', { bookingId: data.booking?.id || data.id });
    } catch (err) {
      console.error('Booking error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapCanvas}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.bodaMarker}>
          <Text style={styles.bodaMarkerIcon}>🏍</Text>
        </View>

        <View style={styles.nearbyPill}>
          <View style={styles.nearbyDot} />
          <Text style={styles.nearbyText}>{nearbyCount} bodas nearby</Text>
        </View>
      </View>

      <View style={styles.bottomSheet}>
        <Grabber />
        <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.addressSection}>
            <View style={styles.addressCard}>
              <View style={styles.dashedLine} />
              <View style={styles.addressRow}>
                <View style={styles.pickupDot} />
                <View style={styles.addressInputWrapper}>
                  <Text style={styles.addressLabel}>Pickup</Text>
                  <Text style={styles.addressValue}>{pickupAddress || 'Set pickup'}</Text>
                </View>
              </View>
              <View style={styles.addressRow}>
                <View style={styles.dropoffDot} />
                <View style={[styles.addressInputWrapper, styles.dropoffInput]}>
                  <Text style={styles.addressLabel}>Dropoff</Text>
                  <TextInput
                    style={styles.addressTextInput}
                    value={dropoffAddress}
                    onChangeText={setDropoffAddress}
                    placeholder="Where to?"
                    placeholderTextColor={colors.outline}
                    onSubmitEditing={() => {
                      if (dropoffAddress.length > 3) {
                        setDropoffCoords({ lat: 2.77, lng: 32.29 });
                      }
                    }}
                  />
                </View>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Choose Ride Type</Text>
          <View style={styles.vehicleList}>
            {VEHICLE_TYPES.map((vehicle) => (
              <TouchableOpacity
                key={vehicle.id}
                style={[
                  styles.vehicleCard,
                  selectedVehicle === vehicle.id && styles.vehicleCardSelected,
                ]}
                onPress={() => setSelectedVehicle(vehicle.id)}
                activeOpacity={0.7}
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
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.paymentSection}>
            <TouchableOpacity style={styles.momoBadge} onPress={() => showModal({ icon: '💳', title: 'Payment', message: 'MoMo payment integration coming soon.' })} activeOpacity={0.7}>
              <View style={styles.momoIcon}>
                <Text style={styles.momoIconText}>MTN</Text>
              </View>
              <View style={styles.momoInfo}>
                <Text style={styles.momoName}>MTN MoMo</Text>
                <Text style={styles.momoNumber}>•••• •123</Text>
              </View>
              <Text style={styles.momoChevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.promoLink} onPress={() => showModal({ icon: '🏷', title: 'Promo Code', message: 'Enter your promo code at checkout.' })}>
              <Text style={styles.promoIcon}>🏷</Text>
              <Text style={styles.promoText}>Apply promo code</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.confirmButton, loading && styles.buttonDisabled]}
            onPress={handleConfirm}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.onPrimaryContainer} />
            ) : (
              <Text style={styles.confirmButtonText}>
                Confirm {selectedVehicle === 'boda' ? 'Boda' : 'Delivery'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
      <ModalComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapCanvas: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surfaceContainerHighest,
    zIndex: 1,
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
    borderWidth: 1,
    borderColor: colors.outlineVariant,
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
  bodaMarker: {
    position: 'absolute',
    top: '35%',
    alignSelf: 'center',
    zIndex: 5,
  },
  bodaMarkerIcon: {
    fontSize: 40,
  },
  nearbyPill: {
    position: 'absolute',
    top: 56,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.surface}ee`,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  nearbyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
    marginRight: 8,
  },
  nearbyText: {
    ...typography.labelLg,
    color: colors.onSurface,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 16,
    maxHeight: '70%',
    zIndex: 40,
  },
  sheetScroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 32,
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
    shadowColor: colors.primaryContainer,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
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
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleIconBgActive: {
    backgroundColor: colors.primary,
  },
  vehicleIcon: {
    fontSize: 32,
  },
  vehicleName: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  vehicleDesc: {
    ...typography.bodyMd,
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
  promoLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  promoIcon: {
    fontSize: 16,
  },
  promoText: {
    ...typography.bodyMd,
    color: colors.tertiary,
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
    opacity: 0.7,
  },
  confirmButtonText: {
    ...typography.headlineMd,
    color: colors.onPrimaryContainer,
  },
});
