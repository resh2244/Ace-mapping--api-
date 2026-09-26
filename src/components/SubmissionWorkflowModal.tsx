import React, { useState } from 'react';
import {
  Compass,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Info,
  Clock,
  Send,
  Building,
  MapPin,
  Camera,
  ShieldCheck,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { AddressRegistration } from '../lib/firebase.js';

interface SubmissionWorkflowModalProps {
  item: AddressRegistration | null;
  onClose: () => void;
  onConfirmedSubmission: (updatedItem: AddressRegistration) => void;
}

export const SubmissionWorkflowModal: React.FC<SubmissionWorkflowModalProps> = ({
  item,
  onClose,
  onConfirmedSubmission
}) => {
  const [step, setStep] = useState<'review' | 'instructions' | 'submitted'>('review');

  if (!item) return null;

  // Prepare official Google Maps "Add a missing place" query
  const googleContributeUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    item.formattedAddress
  )}`;

  const handleConfirm = () => {
    const updated: AddressRegistration = {
      ...item,
      googleSubmissionPayload: {
        placeName: item.name || 'Building / Residence',
        category: item.category || 'Premise / Address',
        fullAddress: item.formattedAddress,
        coordinates: { lat: item.lat, lng: item.lng },
        officialGoogleMapsContributeUrl: googleContributeUrl,
        status: 'PENDING_GOOGLE_REVIEW'
      }
    };
    onConfirmedSubmission(updated);
    setStep('submitted');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-gold/40 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative space-y-6">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
        >
          ✕
        </button>

        {/* Step 1: Verification Review */}
        {step === 'review' && (
          <div className="space-y-5">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-gold-gradient text-slate-950 flex items-center justify-center shadow-gold">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Submit Address to Google Maps
                </h3>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  Step 1: Review Verified Specifications
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
              <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 font-medium">Standardized Address:</span>
                <span className="font-semibold text-slate-900 dark:text-white text-right max-w-xs">
                  {item.formattedAddress}
                </span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 font-medium">Verified Coordinates:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {item.lat.toFixed(6)}, {item.lng.toFixed(6)}
                </span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 font-medium">Address Validation Granularity:</span>
                <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 font-mono text-[10px]">
                  {item.granularity}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Attached Photos:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {item.photos?.length || 0} exterior images ready
                </span>
              </div>
            </div>

            {/* Official Google Review explanation */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-xs text-amber-900 dark:text-amber-200">
              <div className="flex items-center space-x-2 font-bold text-amber-800 dark:text-amber-300">
                <Clock className="w-4 h-4" />
                <span>How Google Maps Public Review Works</span>
              </div>
              <p className="leading-relaxed text-[11px]">
                Google enforces strict quality reviews before any private address or new establishment becomes public on the worldwide base map. Submissions are checked against satellite imagery, local parcel boundaries, and postal registry records. Approval typically takes <strong>24 to 72 hours</strong>.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep('instructions')}
                className="px-5 py-2.5 rounded-xl bg-gold-gradient hover:opacity-95 text-slate-950 text-xs font-bold flex items-center space-x-2 shadow-gold"
              >
                <span>Proceed to Google Submission</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Google Submission Instructions */}
        {step === 'instructions' && (
          <div className="space-y-5">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg">
                <Compass className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Google Maps Official Intake
                </h3>
                <p className="text-xs text-slate-500">
                  Step 2: Submit to Google&apos;s Review Pipeline
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                We have compiled the standardized dossier for <strong>{item.formattedAddress}</strong>. To finalize public inclusion in Google&apos;s map:
              </p>
              <ol className="list-decimal list-inside space-y-2 pl-2">
                <li>
                  Click <strong>&ldquo;Open in Google Maps &amp; Add Place&rdquo;</strong> below.
                </li>
                <li>
                  In Google Maps, tap <strong>&ldquo;Add a missing place&rdquo;</strong> or <strong>&ldquo;Add missing address&rdquo;</strong>.
                </li>
                <li>
                  Paste the verified coordinates (<code>{item.lat.toFixed(5)}, {item.lng.toFixed(5)}</code>) and upload the building photo.
                </li>
              </ol>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                href={googleContributeUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-md"
              >
                <span>Open in Google Maps</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              <button
                onClick={handleConfirm}
                className="py-3 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-gold/40 text-xs font-bold flex items-center justify-center space-x-2"
              >
                <span>Mark as Submitted to Google</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Submitted Confirmation */}
        {step === 'submitted' && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Submission Recorded!
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Your address registration has been marked as <strong>Pending Google Review</strong> in Firestore. You can track this address, generate PDF certifications, or share location pins from the Saved Addresses dashboard.
            </p>
            <button
              onClick={onClose}
              className="py-2.5 px-6 rounded-xl bg-navy-800 hover:bg-navy-700 text-amber-300 border border-gold/40 text-xs font-bold"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
