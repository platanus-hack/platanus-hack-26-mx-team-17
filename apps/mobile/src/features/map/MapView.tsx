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
import { reportTypeColors } from '../../theme/tokens';
import { reportTypeLabels } from '../reports/labels';

const OSM_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const CDMX: [number, number] = [-99.1332, 19.4326];
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';

const MARKER_COLOR: Record<ReportType, string> = reportTypeColors;
const TYPE_LABEL: Record<ReportType, string> = reportTypeLabels;

interface Props {
  reports?: Report[];
  onReportPress?: (report: Report) => void;
  /** Reporte al que trazar ruta automáticamente (desde la lista) */
  routeTarget?: Report | null;
  onRouteClear?: () => void;
  /** El padre puede guardar aquí la función flyToUser para invocarla desde un botón externo */
  flyToUserRef?: React.MutableRefObject<(() => void) | undefined>;
  /** Coordenadas a las que volar directamente (desde detalle de reporte) */
  focusCoords?: { lat: number; lng: number } | null;
}

interface RouteGeoJSON {
  type: 'Feature';
  geometry: { type: 'LineString'; coordinates: [number, number][] };
  properties: Record<string, never>;
}

export function MapView({
  reports = [],
  onReportPress,
  routeTarget,
  onRouteClear,
  flyToUserRef,
  focusCoords,
}: Props) {
  const cameraRef = useRef<CameraRef>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [centeredOnUser, setCenteredOnUser] = useState(false);
  const [selected, setSelected] = useState<Report | null>(null);
  const [route, setRoute] = useState<RouteGeoJSON | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  // Si routeTarget llega antes de que haya posición, guardamos el target pendiente
  const pendingRouteRef = useRef<Report | null>(null);
  // Evita que el onPress del mapa cancele la selección al tocar un pin
  const suppressMapPress = useRef(false);

  const position = useCurrentPosition({ enabled: hasPermission });

  // ── Permisos de ubicación ─────────────────────────────────────────────────
  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      setHasPermission(status === 'granted');
    });
  }, []);

  // ── Centrar en usuario la primera vez que llega la posición ───────────────
  useEffect(() => {
    if (position && !centeredOnUser) {
      cameraRef.current?.flyTo({
        center: [position.coords.longitude, position.coords.latitude],
        zoom: 16,
      });
      setCenteredOnUser(true);
    }
  }, [position, centeredOnUser]);

  // ── Exponer flyToUser al padre via ref ────────────────────────────────────
  useEffect(() => {
    if (!flyToUserRef) return;
    flyToUserRef.current = () => {
      if (!position) return;
      cameraRef.current?.flyTo({
        center: [position.coords.longitude, position.coords.latitude],
        zoom: 16,
        duration: 800,
      });
    };
  }, [position, flyToUserRef]);

  // ── Volar a coordenadas específicas (desde detalle de reporte) ───────────
  useEffect(() => {
    if (!focusCoords) return;
    cameraRef.current?.flyTo({
      center: [focusCoords.lng, focusCoords.lat],
      zoom: 16,
      duration: 800,
    });
  }, [focusCoords]);

  // ── Cuando llega un routeTarget desde la lista ────────────────────────────
  useEffect(() => {
    if (!routeTarget) {
      pendingRouteRef.current = null;
      return;
    }
    suppressMapPress.current = true;
    setSelected(routeTarget);
    setRoute(null);
    setTimeout(() => { suppressMapPress.current = false; }, 150);

    // Volar al reporte inmediatamente para que el usuario lo vea en el mapa
    cameraRef.current?.flyTo({
      center: [routeTarget.location.lng, routeTarget.location.lat],
      zoom: 15,
      duration: 700,
    });

    if (position) {
      void doFetchRoute(routeTarget, position);
    } else {
      pendingRouteRef.current = routeTarget;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeTarget]);

  // ── Ejecutar ruta pendiente cuando llega la posición ─────────────────────
  useEffect(() => {
    if (position && pendingRouteRef.current) {
      const target = pendingRouteRef.current;
      pendingRouteRef.current = null;
      void doFetchRoute(target, position);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position]);

  // ── Trazar ruta via Mapbox Directions ────────────────────────────────────
  const doFetchRoute = async (
    report: Report,
    pos: NonNullable<ReturnType<typeof useCurrentPosition>>,
  ) => {
    setLoadingRoute(true);
    try {
      const origin = `${pos.coords.longitude},${pos.coords.latitude}`;
      const dest = `${report.location.lng},${report.location.lat}`;
      const url =
        `https://api.mapbox.com/directions/v5/mapbox/walking/${origin};${dest}` +
        `?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
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
        const coords = json.routes[0].geometry.coordinates;
        if (coords.length > 1) {
          // Incluir posición del usuario en los bounds para que ambos puntos sean visibles
          const allLngs = [...coords.map((c) => c[0]), pos.coords.longitude];
          const allLats = [...coords.map((c) => c[1]), pos.coords.latitude];
          cameraRef.current?.fitBounds(
            [Math.min(...allLngs), Math.min(...allLats), Math.max(...allLngs), Math.max(...allLats)],
            { padding: { top: 100, bottom: 260, left: 60, right: 60 }, duration: 800 },
          );
        }
      }
    } catch {
      // sin ruta disponible
    } finally {
      setLoadingRoute(false);
    }
  };

  const clearRoute = () => {
    setRoute(null);
    pendingRouteRef.current = null;
    onRouteClear?.();
  };

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
          <Pressable style={styles.popupInfo} onPress={() => onReportPress?.(selected)}>
            <View style={[styles.popupDot, { backgroundColor: MARKER_COLOR[selected.type] }]} />
            <View style={styles.popupContent}>
              <Text style={styles.popupType}>{TYPE_LABEL[selected.type]}</Text>
              <Text style={styles.popupTitle} numberOfLines={2}>{selected.title}</Text>
              <Text style={styles.popupCta}>Toca para ver el caso →</Text>
            </View>
            <Pressable style={styles.popupClose} onPress={() => { setSelected(null); clearRoute(); }}>
              <Text style={styles.popupCloseText}>✕</Text>
            </Pressable>
          </Pressable>

          <View style={styles.popupActions}>
            {route ? (
              <TouchableOpacity style={styles.btnCancel} onPress={clearRoute}>
                <Text style={styles.btnCancelText}>✕ Cancelar ruta</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.btnRoute, (!position || loadingRoute) && styles.btnDisabled]}
                onPress={() => { if (position) void doFetchRoute(selected, position); }}
                disabled={!position || loadingRoute}
              >
                {loadingRoute ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.btnRouteText}>
                    {position ? '🗺 Cómo llegar' : 'Obteniendo ubicación…'}
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
    color: '#F2563C',
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
    backgroundColor: '#F2563C',
    borderRadius: 24,
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
