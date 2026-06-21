import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  Map,
  Camera,
  UserLocation,
  Marker,
  GeoJSONSource,
  Layer,
  useCurrentPosition,
  type CameraRef,
} from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import type { Report, ReportType } from '../../types/report';

const OSM_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const CDMX: [number, number] = [-99.1332, 19.4326];
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';

const MARKER_COLOR: Record<ReportType, string> = {
  lost: '#E53935',
  sighting: '#1E88E5',
  injured: '#FB8C00',
  abandoned: '#8E24AA',
};

const TYPE_LABEL: Record<ReportType, string> = {
  lost: 'Perdido',
  sighting: 'Avistamiento',
  injured: 'Herido',
  abandoned: 'Abandonado',
};

interface Props {
  reports?: Report[];
  onReportPress?: (report: Report) => void;
}

interface RouteGeoJSON {
  type: 'Feature';
  geometry: { type: 'LineString'; coordinates: [number, number][] };
  properties: Record<string, never>;
}

export function MapView({ reports = [], onReportPress }: Props) {
  const cameraRef = useRef<CameraRef>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [centeredOnUser, setCenteredOnUser] = useState(false);
  const [selected, setSelected] = useState<Report | null>(null);
  const [route, setRoute] = useState<RouteGeoJSON | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  // Evita que el onPress del mapa cancele la selección al tocar un pin
  const suppressMapPress = useRef(false);

  const position = useCurrentPosition({ enabled: hasPermission });

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      setHasPermission(status === 'granted');
    });
  }, []);

  useEffect(() => {
    if (position && !centeredOnUser) {
      cameraRef.current?.flyTo({
        center: [position.coords.longitude, position.coords.latitude],
        zoom: 16,
      });
      setCenteredOnUser(true);
    }
  }, [position, centeredOnUser]);

  const fetchRoute = async (report: Report) => {
    if (!position) return;
    setLoadingRoute(true);
    try {
      const origin = `${position.coords.longitude},${position.coords.latitude}`;
      const dest = `${report.location.lng},${report.location.lat}`;
      const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${origin};${dest}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url);
      const json = (await res.json()) as {
        routes?: { geometry: { coordinates: [number, number][] } }[];
      };
      if (json.routes && json.routes.length > 0) {
        setRoute({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: json.routes[0].geometry.coordinates },
          properties: {},
        });
        // Fit camera to show the full route
        const coords = json.routes[0].geometry.coordinates;
        if (coords.length > 1) {
          const lngs = coords.map((c) => c[0]);
          const lats = coords.map((c) => c[1]);
          cameraRef.current?.fitBounds(
            [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)],
            { padding: { top: 80, bottom: 220, left: 60, right: 60 }, duration: 600 },
          );
        }
      }
    } catch {
      // sin ruta disponible
    } finally {
      setLoadingRoute(false);
    }
  };

  const clearRoute = () => setRoute(null);

  const handleSelectReport = (report: Report) => {
    suppressMapPress.current = true;
    setSelected(report);
    setRoute(null);
    setTimeout(() => { suppressMapPress.current = false; }, 150);
  };

  return (
    <View style={styles.container}>
      <Map
        style={styles.map}
        mapStyle={OSM_STYLE}
        onPress={() => {
          if (suppressMapPress.current) return;
          setSelected(null);
          setRoute(null);
        }}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: CDMX,
            zoom: 15,
            pitch: 60,
            bearing: -17,
          }}
        />

        {hasPermission && <UserLocation animated accuracy />}

        {/* Ruta de navegación */}
        {route && (
          <GeoJSONSource id="route-source" data={route}>
            <Layer
              id="route-casing"
              type="line"
              paint={{ 'line-color': '#fff', 'line-width': 7, 'line-opacity': 0.9 }}
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            />
            <Layer
              id="route-line"
              type="line"
              paint={{ 'line-color': '#1565C0', 'line-width': 4, 'line-opacity': 1 }}
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            />
          </GeoJSONSource>
        )}

        {reports.map((report) => (
          <Marker
            key={report.id}
            id={report.id}
            lngLat={[report.location.lng, report.location.lat]}
          >
            <TouchableOpacity
              onPress={() => handleSelectReport(report)}
              activeOpacity={0.75}
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
            >
              <View style={[styles.pin, { backgroundColor: MARKER_COLOR[report.type] }]}>
                <View style={styles.pinTip} />
              </View>
            </TouchableOpacity>
          </Marker>
        ))}
      </Map>

      {/* Popup del reporte seleccionado */}
      {selected && (
        <View style={styles.popup}>
          {/* Info del reporte — toca para abrir detalle */}
          <Pressable style={styles.popupInfo} onPress={() => onReportPress?.(selected)}>
            <View style={[styles.popupDot, { backgroundColor: MARKER_COLOR[selected.type] }]} />
            <View style={styles.popupContent}>
              <Text style={styles.popupType}>{TYPE_LABEL[selected.type]}</Text>
              <Text style={styles.popupTitle} numberOfLines={2}>{selected.title}</Text>
              <Text style={styles.popupCta}>Toca para ver el caso →</Text>
            </View>
            <Pressable style={styles.popupClose} onPress={() => { setSelected(null); setRoute(null); }}>
              <Text style={styles.popupCloseText}>✕</Text>
            </Pressable>
          </Pressable>

          {/* Botones de acción */}
          <View style={styles.popupActions}>
            {route ? (
              <TouchableOpacity style={styles.btnCancel} onPress={clearRoute}>
                <Text style={styles.btnCancelText}>✕ Cancelar ruta</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.btnRoute, !position && styles.btnDisabled]}
                onPress={() => { void fetchRoute(selected); }}
                disabled={!position || loadingRoute}
              >
                {loadingRoute ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.btnRouteText}>
                    {position ? '🗺 Cómo llegar' : 'Sin ubicación'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  pin: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  pinTip: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginBottom: 1,
  },
  popup: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  popupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  popupDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    flexShrink: 0,
  },
  popupContent: {
    flex: 1,
    gap: 2,
  },
  popupType: {
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  popupTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  popupCta: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 2,
  },
  popupClose: {
    padding: 6,
  },
  popupCloseText: {
    fontSize: 16,
    color: '#aaa',
  },
  popupActions: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  btnRoute: {
    backgroundColor: '#1565C0',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnRouteText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  btnCancel: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnCancelText: {
    color: '#555',
    fontWeight: '600',
    fontSize: 14,
  },
  btnDisabled: {
    backgroundColor: '#ccc',
  },
});
