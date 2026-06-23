import { forwardRef } from 'react';
import { WebView } from 'react-native-webview';
import { StyleSheet } from 'react-native';
import { buildMapHTML } from '../utils/mapHTML';

const MapWebView = forwardRef(function MapWebView(
  { lat, lng, markers = [], onLoadEnd, style, ...rest },
  ref
) {
  return (
    <WebView
      ref={ref}
      source={{ html: buildMapHTML(lat, lng, markers) }}
      style={[StyleSheet.absoluteFill, style]}
      originWhitelist={['*']}
      javaScriptEnabled
      onLoadEnd={onLoadEnd}
      {...rest}
    />
  );
});

export default MapWebView;
