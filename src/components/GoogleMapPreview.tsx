import React, { useEffect, useRef, useState } from 'react';
import { Layers, Map as MapIcon, Globe, Mountain } from 'lucide-react';

export type MapLayerType = 'roadmap' | 'satellite' | 'hybrid' | 'terrain';

interface GoogleMapPreviewProps {
  apiKey: string;
  lat: number;
  lng: number;
  zoom?: number;
  draggable?: boolean;
  onPositionChange?: (pos: { lat: number; lng: number }) => void;
  title?: string;
  formattedAddress?: string;
  initialLayer?: MapLayerType;
}

export const GoogleMapPreview: React.FC<GoogleMapPreviewProps> = ({
  apiKey,
  lat,
  lng,
  zoom = 17,
  draggable = true,
  onPositionChange,
  title = 'Target Location',
  formattedAddress,
  initialLayer = 'hybrid'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [activeLayer, setActiveLayer] = useState<MapLayerType>(initialLayer);

  // Switch map layer dynamically
  const handleLayerChange = (layer: MapLayerType) => {
    setActiveLayer(layer);
    if (mapRef.current && window.google?.maps) {
      mapRef.current.setMapTypeId(layer);
    }
  };

  useEffect(() => {
    if (!apiKey) return;

    function initMap() {
      if (!containerRef.current || !window.google?.maps) return;

      const center = { lat, lng };

      if (!mapRef.current) {
        mapRef.current = new window.google.maps.Map(containerRef.current, {
          center,
          zoom,
          mapTypeId: activeLayer,
          mapTypeControl: false, // We provide our luxury in-app layer toggle bar
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
          tilt: 45
        });
      } else {
        mapRef.current.setCenter(center);
        mapRef.current.setZoom(zoom);
        mapRef.current.setMapTypeId(activeLayer);
      }

      // Marker
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }

      // Custom Gold-accented SVG marker
      const marker = new window.google.maps.Marker({
        position: center,
        map: mapRef.current,
        draggable: Boolean(draggable),
        animation: window.google.maps.Animation.DROP,
        title: title || 'Drag pin to adjust exact location',
        icon: {
          path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
          fillColor: '#D4AF37', // Gold
          fillOpacity: 1,
          strokeColor: '#0B1329', // Dark Navy border
          strokeWeight: 2,
          scale: 1.8,
          anchor: new window.google.maps.Point(12, 22)
        }
      });

      markerRef.current = marker;

      // Handle marker drag
      if (draggable) {
        marker.addListener('dragend', () => {
          const pos = marker.getPosition();
          if (pos && onPositionChange) {
            onPositionChange({
              lat: pos.lat(),
              lng: pos.lng()
            });
          }
        });
      }

      // Info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="font-family: system-ui, sans-serif; padding: 6px; max-width: 240px; color: #0f172a;">
            <div style="font-size: 11px; font-weight: 700; color: #b45309; text-transform: uppercase; margin-bottom: 2px;">
              ${draggable ? 'Draggable Verified Pin' : 'Verified Location'}
            </div>
            <div style="font-size: 13px; font-weight: 600; margin-bottom: 4px;">
              ${title || 'Selected Building'}
            </div>
            <div style="font-size: 11px; color: #475569; line-height: 1.3;">
              ${formattedAddress || `${lat.toFixed(6)}, ${lng.toFixed(6)}`}
            </div>
            ${
              draggable
                ? '<div style="margin-top: 6px; font-size: 10px; color: #2563eb;">Drag pin directly onto the building roof or entrance</div>'
                : ''
            }
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(mapRef.current, marker);
      });
    }

    if (!window.google) {
      const existing = document.getElementById('google-maps-script');
      if (!existing) {
        const script = document.createElement('script');
        script.id = 'google-maps-script';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
        script.async = true;
        script.defer = true;
        script.onload = initMap;
        document.head.appendChild(script);
      } else {
        existing.addEventListener('load', initMap);
      }
    } else {
      initMap();
    }
  }, [apiKey, lat, lng, zoom, draggable, title, formattedAddress]);

  return (
    <div className="relative w-full h-full min-h-[360px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md bg-slate-900">
      <div ref={containerRef} className="w-full h-full min-h-[360px]" />

      {/* Top Left: Coordinates & Status Badge */}
      <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-gold/40 text-xs shadow-lg flex items-center space-x-2 text-white pointer-events-none z-10">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
        <span className="font-semibold text-amber-300">
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </span>
        <span className="text-slate-400 hidden sm:inline">• Drag pin to refine</span>
      </div>

      {/* Top Right: Luxury Map Layer Switcher (Roadmap, Satellite, Terrain, Hybrid) */}
      <div className="absolute top-3 right-3 z-10 flex items-center bg-slate-900/90 backdrop-blur-md p-1 rounded-2xl border border-gold/40 shadow-xl space-x-1">
        <button
          type="button"
          onClick={() => handleLayerChange('roadmap')}
          title="Switch to Roadmap View"
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeLayer === 'roadmap'
              ? 'bg-gold-gradient text-slate-950 shadow-gold'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <MapIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Roadmap</span>
        </button>

        <button
          type="button"
          onClick={() => handleLayerChange('satellite')}
          title="Switch to Satellite View"
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeLayer === 'satellite' || activeLayer === 'hybrid'
              ? 'bg-gold-gradient text-slate-950 shadow-gold'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Satellite</span>
        </button>

        <button
          type="button"
          onClick={() => handleLayerChange('terrain')}
          title="Switch to Terrain View"
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeLayer === 'terrain'
              ? 'bg-gold-gradient text-slate-950 shadow-gold'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Mountain className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Terrain</span>
        </button>
      </div>
    </div>
  );
};
