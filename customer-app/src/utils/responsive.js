import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export const wp = (percent) => (SCREEN_W * percent) / 100;

export const hp = (percent) => (SCREEN_H * percent) / 100;

export const scale = (size) => (SCREEN_W / 375) * size;

export const fontScale = (size) => size * PixelRatio.getFontScale();

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const rs = (size) => clamp(scale(size), size * 0.85, size * 1.2);

export { SCREEN_W, SCREEN_H };
