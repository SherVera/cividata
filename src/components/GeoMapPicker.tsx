import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DEFAULT_MAP_CENTER, GeoNamedPoint, roundGeo } from '../lib/geo';

export interface GeoMapPickerProps {
  lat: number | null;
  lng: number | null;
  onChange?: (coords: { lat: number; lng: number }) => void;
  centers?: GeoNamedPoint[];
  height?: string;
  readOnly?: boolean;
  className?: string;
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
}: GeoMapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const centersLayerRef = useRef<L.LayerGroup | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

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

    return () => {
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
  }, [centers]);

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
      onChangeRef.current?.(rounded);
    });

    markerRef.current = marker;
    map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng, readOnly]);

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden rounded-xl border border-slate-200 ${className}`}
      style={{ height, width: '100%' }}
    />
  );
}

export function requestDeviceLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Este dispositivo no soporta geolocalización.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(roundGeo(pos.coords.latitude, pos.coords.longitude)),
      (err) => reject(new Error(err.message || 'No se pudo obtener la ubicación.')),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 }
    );
  });
}
