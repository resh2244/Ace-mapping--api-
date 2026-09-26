import React, { useEffect, useRef, useState } from 'react';
import { Search, MapPin, X } from 'lucide-react';

interface AddressAutocompleteProps {
  apiKey: string;
  onAddressSelect: (place: {
    formattedAddress: string;
    addressLines: string[];
    regionCode?: string;
    lat?: number;
    lng?: number;
  }) => void;
  placeholder?: string;
  value?: string;
  onChange?: (val: string) => void;
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  apiKey,
  onAddressSelect,
  placeholder = 'Start typing address (e.g. 1600 Amphitheatre Pkwy, Mountain View)...',
  value: controlledValue,
  onChange: controlledOnChange
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [internalValue, setInternalValue] = useState(controlledValue || '');

  const val = controlledValue !== undefined ? controlledValue : internalValue;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (controlledOnChange) {
      controlledOnChange(v);
    } else {
      setInternalValue(v);
    }
  };

  useEffect(() => {
    if (!apiKey) return;

    function initAutocomplete() {
      if (!inputRef.current || !window.google?.maps?.places) return;

      // Autocomplete setup
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        fields: ['address_components', 'formatted_address', 'geometry', 'name'],
        types: ['address']
      });

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace();
        if (!place || !place.formatted_address) return;

        let regionCode = '';
        let streetNumber = '';
        let route = '';
        let city = '';
        let postalCode = '';

        if (place.address_components) {
          for (const comp of place.address_components) {
            if (comp.types.includes('country')) {
              regionCode = comp.short_name;
            }
            if (comp.types.includes('street_number')) {
              streetNumber = comp.long_name;
            }
            if (comp.types.includes('route')) {
              route = comp.long_name;
            }
            if (comp.types.includes('locality')) {
              city = comp.long_name;
            }
            if (comp.types.includes('postal_code')) {
              postalCode = comp.long_name;
            }
          }
        }

        const line1 = streetNumber && route ? `${streetNumber} ${route}` : (place.name || '');
        const line2 = [postalCode, city].filter(Boolean).join(' ');

        const addressLines = [line1, line2].filter(Boolean);
        if (addressLines.length === 0) {
          addressLines.push(place.formatted_address);
        }

        const lat = place.geometry?.location ? place.geometry.location.lat() : undefined;
        const lng = place.geometry?.location ? place.geometry.location.lng() : undefined;

        if (controlledOnChange) {
          controlledOnChange(place.formatted_address);
        } else {
          setInternalValue(place.formatted_address);
        }

        onAddressSelect({
          formattedAddress: place.formatted_address,
          addressLines,
          regionCode,
          lat,
          lng
        });
      });
    }

    if (!window.google) {
      const existingScript = document.getElementById('google-maps-script');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'google-maps-script';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
        script.async = true;
        script.defer = true;
        script.onload = initAutocomplete;
        document.head.appendChild(script);
      } else {
        existingScript.addEventListener('load', initAutocomplete);
      }
    } else {
      initAutocomplete();
    }
  }, [apiKey]);

  return (
    <div className="relative w-full">
      <div className="relative">
        <MapPin className="w-4 h-4 absolute left-3.5 top-3 text-blue-500 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={val}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
        />
        {val && (
          <button
            type="button"
            onClick={() => {
              if (controlledOnChange) controlledOnChange('');
              else setInternalValue('');
            }}
            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 flex items-center space-x-1 pl-1">
        <span>⚡ Google Places Autocomplete: suggestions update as you type</span>
      </p>
    </div>
  );
};
