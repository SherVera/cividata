import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, LocateFixed } from 'lucide-react';
import { DEFAULT_MAP_CENTER, GeoNamedPoint, requestDeviceLocation, roundGeo } from '../lib/geo';

export { requestDeviceLocation } from '../lib/geo';

export interface GeoMapPickerProps {
  lat: number | null;
  lng: number | null;
  onChange?: (coords: { lat: number; lng: number }) => void;
  centers?: GeoNamedPoint[];
  height?: string;
  readOnly?: boolean;
  className?: string;
  /** Pan/zoom map to show all centers (and marker when set). */
  fitToCenters?: boolean;
  /** Botón flotante para centrar el mapa en la ubicación del dispositivo. */
  showLocateButton?: boolean;
  onLocateError?: (message: string) => void;
  onLocate?: (coords: { lat: number; lng: number }) => void;
}

const PROXIMITY_RADIUS_M = 800;

export default function GeoMapPicker({
  lat,
  lng,
  onChange,
  centers = [],
  height = '280px',
  readOnly = false,
  className = '',
  fitToCenters = false,
  showLocateButton = false,
  onLocateError,
  onLocate,
}: GeoMapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const centersLayerRef = useRef<L.LayerGroup | null>(null);
  const onChangeRef = useRef(onChange);
  const onLocateErrorRef = useRef(onLocateError);
  const onLocateRef = useRef(onLocate);
  const dragUpdateRef = useRef(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onLocateErrorRef.current = onLocateError;
  }, [onLocateError]);

  useEffect(() => {
    onLocateRef.current = onLocate;
  }, [onLocate]);

  const panToCoords = useCallback((nextLat: number, nextLng: number, zoom?: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.invalidateSize();
    const targetZoom = zoom ?? Math.max(map.getZoom(), 15);
    map.flyTo([nextLat, nextLng], targetZoom, { duration: 0.6 });
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initial = lat != null && lng != null ? { lat, lng } : DEFAULT_MAP_CENTER;

    const map = L.map(containerRef.current, {
      center: [initial.lat, initial.lng],
      zoom: 14,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    centersLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const resize = () => map.invalidateSize();
    const t1 = window.setTimeout(resize, 120);
    const t2 = window.setTimeout(resize, 400);

    let resizeObserver: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      resizeObserver?.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      centersLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const layerGroup = centersLayerRef.current;
    if (!layerGroup) return;

    layerGroup.clearLayers();

    centers.forEach((center) => {
      L.circle([center.lat, center.lng], {
        radius: PROXIMITY_RADIUS_M,
        color: '#0d9488',
        fillColor: '#14b8a6',
        fillOpacity: 0.08,
        weight: 1,
        dashArray: '4 6',
      }).addTo(layerGroup);

      L.circleMarker([center.lat, center.lng], {
        radius: 6,
        color: '#0f766e',
        fillColor: '#14b8a6',
        fillOpacity: 0.85,
        weight: 2,
      })
        .bindTooltip(center.name, { direction: 'top', offset: [0, -4] })
        .addTo(layerGroup);
    });

    if (fitToCenters && centers.length > 0) {
      const map = mapRef.current;
      if (map) {
        const bounds = L.latLngBounds(centers.map((c) => [c.lat, c.lng] as [number, number]));
        if (lat != null && lng != null) bounds.extend([lat, lng]);
        map.invalidateSize();
        map.fitBounds(bounds, { padding: [28, 28], maxZoom: 15, animate: true });
      }
    }
  }, [centers, fitToCenters, lat, lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    if (lat == null || lng == null) return;

    const pinIcon = L.divIcon({
      className: '',
      html: '<div style="width:18px;height:18px;border-radius:9999px;background:#2563eb;border:3px solid white;box-shadow:0 2px 8px rgba(15,23,42,.35)"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    const marker = L.marker([lat, lng], {
      draggable: !readOnly,
      icon: pinIcon,
      autoPan: true,
    }).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      const rounded = roundGeo(pos.lat, pos.lng);
      dragUpdateRef.current = true;
      onChangeRef.current?.(rounded);
    });

    markerRef.current = marker;

    if (!fitToCenters) {
      if (dragUpdateRef.current) {
        dragUpdateRef.current = false;
      } else {
        panToCoords(lat, lng);
      }
    }
  }, [lat, lng, readOnly, fitToCenters, panToCoords]);

  const handleLocate = async () => {
    if (readOnly || locating) return;
    setLocating(true);
    try {
      const coords = await requestDeviceLocation({ highAccuracy: true });
      onChangeRef.current?.(coords);
      onLocateRef.current?.(coords);
      panToCoords(coords.lat, coords.lng, 16);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'No se pudo usar la ubicación del dispositivo.';
      onLocateErrorRef.current?.(message);
    } finally {
      setLocating(false);
    }
  };

  return (
    <div className={`relative ${className}`} style={{ height, width: '100%' }}>
      <div
        ref={containerRef}
        className="geo-map-root relative z-0 h-full w-full overflow-hidden rounded-xl border border-slate-200"
      />
      {showLocateButton && !readOnly && (
        <button
          type="button"
          onClick={handleLocate}
          disabled={locating}
          title="Usar mi ubicación"
          aria-label="Usar mi ubicación"
          className="absolute bottom-3 right-3 z-[500] inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs font-bold text-teal-700 shadow-lg backdrop-blur-sm transition-colors hover:bg-teal-50 disabled:opacity-60"
        >
          {locating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LocateFixed className="h-3.5 w-3.5" />
          )}
          Mi ubicación
        </button>
      )}
    </div>
  );
}
