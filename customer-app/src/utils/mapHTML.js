export function buildMapHTML(lat, lng, markers = []) {
  const markerJS = markers.map(m => `
    L.marker([${parseFloat(m.lat)}, ${parseFloat(m.lng)}], {
      icon: L.divIcon({
        className: '',
        html: '${m.html || '<div style="width:28px;height:28px;border-radius:50%;background:#fde047;border:2px solid #6d5e00;display:flex;align-items:center;justify-content:center;font-size:14px;">&#x1F6F5;</div>'}',
        iconSize: [28, 28], iconAnchor: [14, 14]
      })
    }).addTo(map).bindPopup('${m.popup || ''}');
  `).join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    #map { width:100vw; height:100vh; }
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', {
    zoomControl: false,
    attributionControl: false,
  }).setView([${lat}, ${lng}], 16);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(map);

  var userMarker = L.circleMarker([${lat}, ${lng}], {
    radius: 7, fillColor: '#0050cb', color: '#fff', weight: 3, fillOpacity: 1
  }).addTo(map);

  ${markerJS}

  window.recenterMap = function(lat, lng) {
    userMarker.setLatLng([lat, lng]);
    map.setView([lat, lng], 16, { animate: true });
  };

  window.updateMarkers = function(markersJson) {
    var data = JSON.parse(markersJson);
    map.eachLayer(function(layer) {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });
    data.forEach(function(m) {
      L.marker([parseFloat(m.lat), parseFloat(m.lng)], {
        icon: L.divIcon({
          className: '',
          html: m.html || '',
          iconSize: [28, 28], iconAnchor: [14, 14]
        })
      }).addTo(map).bindPopup(m.popup || '');
    });
  };

  window.adjustForSheet = function(bottomPaddingPx) {
    map.invalidateSize();
    map.panBy([0, -(bottomPaddingPx / 4)], { animate: false });
  };
</script>
</body>
</html>`;
}
