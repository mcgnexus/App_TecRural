'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ZONES, type ZoneId } from '@/lib/municipalities';

const CoverageMap = dynamic(() => import('./CoverageMap'), { ssr: false });

interface LocationSelectorProps {
  selectedZone: ZoneId | '';
  selectedMunicipality: string;
  onZoneChange: (value: string) => void;
  onMunicipalityChange: (value: string) => void;
  geoStatus: 'idle' | 'locating' | 'ok' | 'error';
  geoMsg: string;
  onGeo: () => void;
  municipalities: Array<{ name: string }>;
}

export default function LocationSelector({
  selectedZone,
  selectedMunicipality,
  onZoneChange,
  onMunicipalityChange,
  geoStatus,
  geoMsg,
  onGeo,
  municipalities,
}: LocationSelectorProps) {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  const handleZoneChange = (value: string) => {
    onZoneChange(value);
    if (viewMode === 'map' && value !== selectedZone) {
      setViewMode('list');
    }
  };

  const handleMapSelect = (municipality: string, zone: ZoneId | '') => {
    if (zone && zone !== selectedZone) {
      onZoneChange(zone);
    }
    onMunicipalityChange(municipality);
    setViewMode('list');
  };

  return (
    <div className="location-selector">
      <div className="field">
        <div className="field-label-row">
          <label htmlFor="zone">Tu zona</label>
          <button
            type="button"
            className="btn-geo"
            onClick={onGeo}
            disabled={geoStatus === 'locating'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            {geoStatus === 'locating' ? 'Localizando…' : 'Usar mi ubicación'}
          </button>
        </div>

        <div className="view-mode-toggle">
          <button
            type="button"
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            aria-label="Ver lista"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
              <line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line>
              <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
          </button>
          <button
            type="button"
            className={`view-btn ${viewMode === 'map' ? 'active' : ''}`}
            onClick={() => setViewMode('map')}
            aria-label="Ver mapa"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
              <line x1="8" y1="2" x2="8" y2="18"></line>
              <line x1="16" y1="6" x2="16" y2="22"></line>
            </svg>
          </button>
        </div>

        <div className="select-wrap">
          <select
            id="zone"
            value={selectedZone}
            onChange={(e) => handleZoneChange(e.target.value)}
            disabled={viewMode === 'map'}
          >
            <option value="">Elige tu zona…</option>
            {ZONES.map((z) => (
              <option key={z.id} value={z.id}>
                {z.label}
              </option>
            ))}
          </select>
        </div>
        {geoStatus === 'ok' && <p className="geo-ok">{geoMsg}</p>}
        {geoStatus === 'error' && <p className="geo-error">{geoMsg}</p>}
      </div>

      {viewMode === 'map' ? (
        <div className="map-view">
          <CoverageMap
            selectedZone={selectedZone}
            selectedMunicipality={selectedMunicipality}
            onMunicipalitySelect={(municipality) => handleMapSelect(municipality, selectedZone)}
            onZoneSelect={(zone) => handleZoneChange(zone)}
          />
        </div>
      ) : (
        <div className="list-view">
          <div className="field">
            <label htmlFor="municipality">Tu municipio</label>
            <div className="select-wrap">
              <select
                id="municipality"
                value={selectedMunicipality}
                onChange={(e) => onMunicipalityChange(e.target.value)}
                disabled={!selectedZone}
              >
                <option value="">
                  {selectedZone ? 'Elige tu municipio…' : 'Primero elige tu zona'}
                </option>
                {municipalities.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
