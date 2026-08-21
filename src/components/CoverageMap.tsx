'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MUNICIPALITIES, ZONES, type Municipality, type ZoneId } from '@/lib/municipalities';

interface CoverageMapProps {
  selectedZone: ZoneId | '';
  selectedMunicipality: string;
  onMunicipalitySelect: (municipality: string) => void;
  onZoneSelect: (zone: ZoneId | '') => void;
}

const ALTIPANO_CENTER: [number, number] = [37.6, -2.6];
const COSTA_CENTER: [number, number] = [36.8, -3.5];

const ALTIPANO_BOUNDS: L.LatLngBoundsExpression = [
  [37.4, -3.1],
  [38.1, -2.3]
];

const COSTA_BOUNDS: L.LatLngBoundsExpression = [
  [36.6, -3.8],
  [37.0, -3.2]
];

const ZONE_COLORS = {
  altiplano: '#3d7a3f',
  costa: '#4a90d9',
  selected: '#c9862a'
};

export default function CoverageMap({
  selectedZone,
  selectedMunicipality,
  onMunicipalitySelect,
  onZoneSelect
}: CoverageMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current || isInitialized) return;

    mapRef.current = L.map(mapContainerRef.current, {
      center: ALTIPANO_CENTER,
      zoom: 9,
      zoomControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18
    }).addTo(mapRef.current);

    L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

    setIsInitialized(true);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isInitialized]);

  useEffect(() => {
    if (!mapRef.current || !isInitialized) return;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const center = selectedZone === 'costa' ? COSTA_CENTER : ALTIPANO_CENTER;
    const bounds = selectedZone === 'costa' ? COSTA_BOUNDS : ALTIPANO_BOUNDS;

    mapRef.current.setView(center, 9);
    mapRef.current.fitBounds(bounds, { padding: [20, 20] });

    const municipalitiesToShow = selectedZone
      ? MUNICIPALITIES.filter(m => m.zone === selectedZone)
      : MUNICIPALITIES;

    const createCustomIcon = (color: string, isSelected: boolean) => {
      return L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div style="
            width: ${isSelected ? '24px' : '20px'};
            height: ${isSelected ? '24px' : '20px'};
            background-color: ${color};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            ${isSelected ? 'transform: scale(1.2);' : ''}
          "></div>
        `,
        iconSize: [isSelected ? 24 : 20, isSelected ? 24 : 20],
        iconAnchor: [isSelected ? 12 : 10, isSelected ? 12 : 10]
      });
    };

    municipalitiesToShow.forEach(municipality => {
      const isSelected = municipality.name === selectedMunicipality;
      const color = isSelected ? ZONE_COLORS.selected : ZONE_COLORS[municipality.zone];

      const marker = L.marker([municipality.lat, municipality.lon], {
        icon: createCustomIcon(color, isSelected)
      });

      marker.bindTooltip(municipality.name, {
        permanent: false,
        direction: 'top',
        offset: [0, -10],
        className: 'map-tooltip'
      });

      marker.on('click', () => {
        onMunicipalitySelect(municipality.name);
        if (!selectedZone || selectedZone !== municipality.zone) {
          onZoneSelect(municipality.zone);
        }
      });

      marker.addTo(mapRef.current);
      markersRef.current.push(marker);
    });
  }, [selectedZone, selectedMunicipality, isInitialized, onMunicipalitySelect, onZoneSelect]);

  return (
    <div className="coverage-map">
      <div className="map-legend">
        <h3>Zonas de cobertura</h3>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: ZONE_COLORS.altiplano }}></div>
            <span>Altiplano de Granada</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: ZONE_COLORS.costa }}></div>
            <span>Costa Tropical</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: ZONE_COLORS.selected }}></div>
            <span>Seleccionado</span>
          </div>
        </div>
      </div>
      <div ref={mapContainerRef} className="map-container"></div>
      <div className="map-hint">
        Haz clic en un marcador para seleccionar tu municipio
      </div>
    </div>
  );
}