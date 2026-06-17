import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const [form, setForm] = useState({
    name: '',
    national_id: '',
    plate_number: '',
    id_photo: null,
    selfie_photo: null,
  });
  const [loading, setLoading] = useState(false);
  const { rider, register } = useAuth();

  const pickImage = async (type) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setForm({ ...form, [type]: result.assets[0].uri });
    }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.national_id || !form.plate_number) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await register({
        phone: rider?.phone,
        name: form.name,
        national_id: form.national_id,
        plate_number: form.plate_number,
        id_photo: form.id_photo,
        selfie_photo: form.selfie_photo,
      });
      Alert.alert('Success', 'Registration submitted! Awaiting admin verification.', [
        { text: 'OK', onPress: () => navigation.replace('Main') },
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Rider Registration</Text>
      <Text style={styles.subtitle}>Complete your profile to start earning</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Full Name *</Text>
        <TextInput
          style={styles.input}
          value={form.name}
          onChangeText={(v) => setForm({ ...form, name: v })}
          placeholder="John Doe"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>National ID *</Text>
        <TextInput
          style={styles.input}
          value={form.national_id}
          onChangeText={(v) => setForm({ ...form, national_id: v })}
          placeholder="CM123456789"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Plate Number *</Text>
        <TextInput
          style={styles.input}
          value={form.plate_number}
          onChangeText={(v) => setForm({ ...form, plate_number: v })}
          placeholder="UGDJ1234A"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>ID Photo</Text>
        <TouchableOpacity style={styles.imageButton} onPress={() => pickImage('id_photo')}>
          <Text style={styles.imageButtonText}>
            {form.id_photo ? 'Change ID Photo' : 'Select ID Photo'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.label}>Selfie Photo</Text>
        <TouchableOpacity style={styles.imageButton} onPress={() => pickImage('selfie_photo')}>
          <Text style={styles.imageButtonText}>
            {form.selfie_photo ? 'Change Selfie' : 'Select Selfie Photo'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Registration</Text>
          )}
        </TouchableOpacity>
      </View>
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  form: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  imageButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  imageButtonText: {
    color: '#4F46E5',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
