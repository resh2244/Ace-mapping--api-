import React, { useEffect, useRef } from 'react';

interface GoogleMapProps {
  apiKey: string;
  lat: number;
  lng: number;
  zoom?: number;
  title?: string;
  formattedAddress?: string;
  markers?: Array<{
    id: string;
    lat: number;
    lng: number;
    title: string;
    description?: string;
  }>;
  onMarkerClick?: (marker: any) => void;
}

declare global {
  interface Window {
    google: any;
    initGoogleMapCallback?: () => void;
  }
}

export const GoogleMap: React.FC<GoogleMapProps> = ({
  apiKey,
  lat,
  lng,
  zoom = 16,
  title = 'Validated Location',
  formattedAddress,
  markers = [],
  onMarkerClick
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const currentMarkersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!apiKey) return;

    // Load Google Maps script if not loaded
    const existingScript = document.getElementById('google-maps-script');
    if (!window.google && !existingScript) {
      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        initializeMap();
      };
      document.head.appendChild(script);
    } else if (window.google) {
      initializeMap();
    }

    function initializeMap() {
      if (!mapContainerRef.current || !window.google) return;

      const center = { lat, lng };

      if (!mapInstanceRef.current) {
        mapInstanceRef.current = new window.google.maps.Map(mapContainerRef.current, {
          center,
          zoom,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
          styles: [
            {
              featureType: 'poi.business',
              stylers: [{ visibility: 'on' }]
            }
          ]
        });
      } else {
        mapInstanceRef.current.setCenter(center);
        mapInstanceRef.current.setZoom(zoom);
      }

      // Clear existing markers
      currentMarkersRef.current.forEach((m) => m.setMap(null));
      currentMarkersRef.current = [];

      // Main active marker
      const mainMarker = new window.google.maps.Marker({
        position: center,
        map: mapInstanceRef.current,
        title: title,
        animation: window.google.maps.Animation.DROP,
        icon: {
          path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#2563EB',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        }
      });

      const infoContent = `
        <div style="font-family: sans-serif; padding: 6px; max-width: 250px;">
          <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold; color: #1e293b;">${title}</h4>
          <p style="margin: 0; font-size: 12px; color: #475569;">${formattedAddress || `${lat.toFixed(5)}, ${lng.toFixed(5)}`}</p>
          <div style="margin-top: 6px; font-size: 11px; color: #2563eb; font-weight: 500;">
            ✓ Geocoded via Google Address Validation
          </div>
        </div>
      `;

      const infoWindow = new window.google.maps.InfoWindow({
        content: infoContent
      });

      mainMarker.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current, mainMarker);
      });

      currentMarkersRef.current.push(mainMarker);

      // Other markers if supplied (e.g. from history submissions)
      markers.forEach((item) => {
        if (item.lat === lat && item.lng === lng) return; // skip center duplicate

        const otherMarker = new window.google.maps.Marker({
          position: { lat: item.lat, lng: item.lng },
          map: mapInstanceRef.current,
          title: item.title,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 5,
            fillColor: '#10B981',
            fillOpacity: 0.9,
            strokeColor: '#ffffff',
            strokeWeight: 1.5,
          }
        });

        const otherInfo = new window.google.maps.InfoWindow({
          content: `
            <div style="font-family: sans-serif; padding: 4px; max-width: 220px;">
              <strong style="color: #0f172a; font-size: 13px;">${item.title}</strong>
              <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b;">${item.description || ''}</p>
            </div>
          `
        });

        otherMarker.addListener('click', () => {
          otherInfo.open(mapInstanceRef.current, otherMarker);
          if (onMarkerClick) onMarkerClick(item);
        });

        currentMarkersRef.current.push(otherMarker);
      });
    }
  }, [apiKey, lat, lng, zoom, title, formattedAddress, markers]);

  return (
    <div className="relative w-full h-full min-h-[380px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-slate-100 dark:bg-slate-900">
      <div ref={mapContainerRef} className="w-full h-full min-h-[380px]" />
      <div className="absolute bottom-3 left-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs shadow-sm flex items-center space-x-2 text-slate-700 dark:text-slate-200">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>Google Maps Active • {lat.toFixed(4)}, {lng.toFixed(4)}</span>
      </div>
    </div>
  );
};
