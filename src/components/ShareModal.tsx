import React, { useState, useEffect } from 'react';
import {
  Share2,
  FileDown,
  QrCode,
  Copy,
  Check,
  Send,
  Mail,
  ExternalLink,
  X,
  MessageCircle
} from 'lucide-react';
import { AddressRegistration } from '../lib/firebase.js';
import { generateAddressQRCode, generateAddressPDF } from '../lib/pdfGenerator.js';

interface ShareModalProps {
  item: AddressRegistration | null;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ item, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  useEffect(() => {
    if (item) {
      generateAddressQRCode(item.lat, item.lng, item.formattedAddress)
        .then((url) => setQrDataUrl(url))
        .catch((e) => console.error(e));
    }
  }, [item]);

  if (!item) return null;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`;
  const shareText = `Verified Location on Google Maps: ${item.name || item.formattedAddress} (${item.lat.toFixed(5)}, ${item.lng.toFixed(5)}). Open here: ${mapsUrl}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadPDF = async () => {
    setPdfGenerating(true);
    try {
      await generateAddressPDF(item);
    } catch (e: any) {
      alert('PDF generation failed: ' + e.message);
    } finally {
      setPdfGenerating(false);
    }
  };

  // Social share URLs
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(mapsUrl)}&text=${encodeURIComponent(`Verified Address: ${item.formattedAddress}`)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(mapsUrl)}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent(`Verified Address: ${item.name || item.formattedAddress}`)}&body=${encodeURIComponent(shareText)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gold-gradient text-slate-900 flex items-center justify-center shadow-gold font-bold">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Share &amp; Export Address
            </h3>
            <p className="text-xs text-slate-500 truncate max-w-xs">
              {item.formattedAddress}
            </p>
          </div>
        </div>

        {/* QR Code and Quick Details */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-4">
          {qrDataUrl ? (
            <div className="p-1.5 bg-white rounded-lg border border-slate-200 shadow-xs flex-shrink-0">
              <img src={qrDataUrl} alt="Address QR Code" className="w-28 h-28" />
            </div>
          ) : (
            <div className="w-28 h-28 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
          )}

          <div className="space-y-1.5 text-xs text-center sm:text-left">
            <span className="font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider text-[10px]">
              Scan with Mobile Camera
            </span>
            <p className="font-bold text-slate-900 dark:text-white text-sm">
              Instant Google Maps Pin
            </p>
            <p className="text-slate-500 font-mono text-[11px]">
              {item.lat.toFixed(6)}, {item.lng.toFixed(6)}
            </p>
            <div className="pt-1 flex justify-center sm:justify-start">
              <button
                onClick={handleDownloadPDF}
                disabled={pdfGenerating}
                className="px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-amber-300 border border-gold/40 text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs"
              >
                <FileDown className="w-3.5 h-3.5 text-amber-400" />
                <span>{pdfGenerating ? 'Generating PDF...' : 'Download PDF Dossier'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Social Share Buttons */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Share to Social &amp; Messaging
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp</span>
            </a>

            <a
              href={telegramUrl}
              target="_blank"
              rel="noreferrer"
              className="py-2.5 px-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-medium text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
            >
              <Send className="w-4 h-4" />
              <span>Telegram</span>
            </a>

            <a
              href={facebookUrl}
              target="_blank"
              rel="noreferrer"
              className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Facebook</span>
            </a>

            <a
              href={emailUrl}
              className="py-2.5 px-3 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-medium text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
            >
              <Mail className="w-4 h-4" />
              <span>Email</span>
            </a>
          </div>
        </div>

        {/* Copy Link */}
        <div className="flex items-center space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <input
            type="text"
            readOnly
            value={mapsUrl}
            className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono focus:outline-none"
          />
          <button
            onClick={copyToClipboard}
            className="py-2 px-3.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold flex items-center space-x-1 hover:opacity-90 transition-opacity"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
