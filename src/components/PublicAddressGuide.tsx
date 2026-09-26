import React, { useState } from 'react';
import { HelpCircle, ExternalLink, ShieldCheck, MapPin, Building2, FileCheck, Layers, ChevronDown, ChevronUp } from 'lucide-react';

export const PublicAddressGuide: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <span>Public vs. Private Addresses on Google Maps</span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                Official Guide
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              How private addresses in this app relate to Google&apos;s public Maps catalog
            </p>
          </div>
        </div>

        <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {isOpen && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
              Important Technical Note:
            </p>
            <p>
              Google does <strong>not</strong> provide an API to programmatically inject or force private addresses directly into Google&apos;s public worldwide base map. Public Google Maps data is curated and protected by Google&apos;s contribution and review pipelines to prevent spam, erroneous geocoding, and unverified locations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 bg-white dark:bg-slate-900">
              <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 font-semibold">
                <MapPin className="w-4 h-4" />
                <span>1. This Application</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Validates addresses with the official Google Address Validation API, computes coordinates, and stores them in your own SQLite and Cloud Firestore databases for instant retrieval and map rendering.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 bg-white dark:bg-slate-900">
              <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                <FileCheck className="w-4 h-4" />
                <span>2. Public Review</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                To add missing physical addresses to the global Google Maps layer, use Google Maps &ldquo;Contribute &gt; Add a missing place&rdquo; or the Google Business Profile verification flow for human &amp; GIS review.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 bg-white dark:bg-slate-900">
              <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 font-semibold">
                <Building2 className="w-4 h-4" />
                <span>3. Partner GIS Feeds</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Governments, municipalities, and enterprise developers submit bulk cadastral surveys directly via the Google Maps Content Partner Program.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-400">
              Export submissions from the Admin panel as CSV to provide to local GIS or municipal authorities.
            </span>
            <a 
              href="https://support.google.com/maps/answer/6320846" 
              target="_blank" 
              rel="noreferrer" 
              className="inline-flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              <span>Google Maps Contribution Help</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
