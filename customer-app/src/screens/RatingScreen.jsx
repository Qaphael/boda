import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { bookingAPI } from '../services/api';
import { colors, typography, spacing, radius } from '../theme';

const FEEDBACK_TAGS = ['Safe Driving', 'Great Conversation', 'Polite', 'On Time', 'Clean Bike'];

export default function RatingScreen({ route, navigation }) {
  const { bookingId, booking } = route.params || {};
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState([]);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setLoading(true);
    try {
      const fullComment = [comment, ...selectedTags].filter(Boolean).join(', ');
      await bookingAPI.rateBooking(bookingId, rating, fullComment);
      setSubmitted(true);
      setTimeout(() => navigation.navigate('Main'), 1500);
    } catch (err) {
      console.error('Rating error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIcon}>
          <Text style={styles.successCheckmark}>✓</Text>
        </View>
        <Text style={styles.successTitle}>Thanks for your feedback!</Text>
        <Text style={styles.successSubtitle}>Your rating helps keep GuluRide safe.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.headline}>Rate your trip</Text>

        <View style={styles.riderCard}>
          <View style={styles.riderAvatar}>
            <Text style={styles.riderAvatarText}>
              {booking?.rider_name?.[0] || 'R'}
            </Text>
          </View>
          <Text style={styles.riderName}>{booking?.rider_name || 'Your Rider'}</Text>
          <Text style={styles.riderMeta}>🏍 Bajaj Boxer • KY 123Z</Text>
        </View>

        <Text style={styles.sectionLabel}>How was your ride?</Text>
        <View style={styles.starRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              activeOpacity={0.7}
              style={styles.starButton}
            >
              <Text style={[styles.star, star <= rating && styles.starActive]}>
                {star <= rating ? '★' : '☆'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>What went well?</Text>
        <View style={styles.tagsRow}>
          {FEEDBACK_TAGS.map((tag) => (
            <TouchableOpacity
              key={tag}
              style={[styles.tag, selectedTags.includes(tag) && styles.tagSelected]}
              onPress={() => toggleTag(tag)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tagText, selectedTags.includes(tag) && styles.tagTextSelected]}>
                {tag}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.commentInput}
          value={comment}
          onChangeText={setComment}
          placeholder="Tell us more (Optional)"
          placeholderTextColor={colors.onSurfaceVariant}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.submitButton, (rating === 0 || loading) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={rating === 0 || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.onPrimaryContainer} />
          ) : (
            <Text style={styles.submitText}>Submit Feedback</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 60,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
  },
  headline: {
    ...typography.headlineLgMobile,
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  riderCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: spacing.xl,
  },
  riderAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 4,
    borderColor: colors.primaryContainer,
  },
  riderAvatarText: {
    ...typography.headlineMd,
    color: colors.primary,
  },
  riderName: {
    ...typography.titleLg,
    color: colors.onSurface,
    marginBottom: 4,
  },
  riderMeta: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  sectionLabel: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: spacing.xl,
  },
  starButton: {
    padding: 4,
  },
  star: {
    fontSize: 48,
    color: colors.outlineVariant,
  },
  starActive: {
    color: colors.primary,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  tagSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tagText: {
    ...typography.labelLg,
    color: colors.onSurface,
  },
  tagTextSelected: {
    color: colors.onPrimary,
  },
  commentInput: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.lg,
    ...typography.bodyMd,
    color: colors.onSurface,
    minHeight: 100,
    marginBottom: spacing.xl,
  },
  submitButton: {
    backgroundColor: colors.primaryContainer,
    height: spacing.touchMin,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    ...typography.headlineMd,
    color: colors.onPrimaryContainer,
  },
  successContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  successCheckmark: {
    fontSize: 36,
    color: colors.onPrimaryContainer,
    fontWeight: '700',
  },
  successTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  successSubtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
});
