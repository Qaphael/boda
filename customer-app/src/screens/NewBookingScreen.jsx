import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import { bookingAPI } from '../services/api';

export default function NewBookingScreen({ route, navigation }) {
  const { type } = route.params;
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropoffCoords, setDropoffCoords] = useState(null);
  const [fareEstimate, setFareEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Error', 'Location permission denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setPickupCoords({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
      setPickupAddress('Current Location');
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

    const baseFare = type === 'ride' ? 1000 : 1500;
    const perKm = type === 'ride' ? 500 : 700;
    const fare = Math.ceil(baseFare + (distance * perKm));

    setFareEstimate(fare);
  };

  const handleConfirmBooking = async () => {
    if (!pickupCoords || !dropoffCoords) {
      Alert.alert('Error', 'Please set pickup and dropoff locations');
      return;
    }

    setLoading(true);
    try {
      const bookingData = {
        type,
        pickup_lat: pickupCoords.lat,
        pickup_lng: pickupCoords.lng,
        pickup_address: pickupAddress,
        dropoff_lat: dropoffCoords.lat,
        dropoff_lng: dropoffCoords.lng,
        dropoff_address: dropoffAddress,
        fare_estimate: fareEstimate,
      };

      if (type === 'delivery') {
        bookingData.item_description = 'Package delivery';
        bookingData.recipient_name = 'Recipient';
        bookingData.recipient_phone = '256780000000';
      }

      const { data } = await bookingAPI.create(bookingData);

      Alert.alert(
        'Booking Created',
        `Your ${type} has been booked. Estimated fare: UGX ${fareEstimate?.toLocaleString()}`,
        [{ text: 'OK', onPress: () => navigation.navigate('Main') }]
      );
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    await getCurrentLocation();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>
        {type === 'ride' ? 'Request Ride' : 'Send Delivery'}
      </Text>

      <View style={styles.section}>
        <Text style={styles.label}>Pickup Location</Text>
        <View style={styles.locationRow}>
          <TextInput
            style={[styles.input, styles.inputFlex]}
            value={pickupAddress}
            onChangeText={setPickupAddress}
            placeholder="Enter pickup address"
            placeholderTextColor="#999"
          />
          <TouchableOpacity
            style={styles.locationButton}
            onPress={handleUseCurrentLocation}
            disabled={locationLoading}
          >
            <Text style={styles.locationButtonText}>
              {locationLoading ? '...' : 'GPS'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Dropoff Location</Text>
        <TextInput
          style={styles.input}
          value={dropoffAddress}
          onChangeText={(text) => {
            setDropoffAddress(text);
            if (text.length > 5) {
              setDropoffCoords({ lat: 2.78, lng: 32.30 });
              calculateFare();
            }
          }}
          placeholder="Enter dropoff address"
          placeholderTextColor="#999"
        />
      </View>

      {fareEstimate && (
        <View style={styles.fareCard}>
          <Text style={styles.fareLabel}>Estimated Fare</Text>
          <Text style={styles.fareAmount}>UGX {fareEstimate.toLocaleString()}</Text>
          <Text style={styles.fareNote}>Final fare may vary based on actual distance</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.confirmButton, loading && styles.buttonDisabled]}
        onPress={handleConfirmBooking}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.confirmButtonText}>
            {type === 'ride' ? 'Request Ride' : 'Send Package'}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputFlex: {
    flex: 1,
  },
  locationButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    padding: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  locationButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  fareCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  fareLabel: {
    fontSize: 14,
    color: '#666',
  },
  fareAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginTop: 4,
  },
  fareNote: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  confirmButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
