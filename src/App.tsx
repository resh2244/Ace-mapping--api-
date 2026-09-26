import React, { useState, useEffect } from 'react';
import {
  MapPin,
  CheckCircle2,
  AlertCircle,
  Database,
  Search,
  Bot,
  Video,
  Radio,
  Sparkles,
  Layers,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  Loader2,
  LogIn,
  LogOut,
  User,
  History,
  Info,
  Plus,
  Compass,
  FileDown,
  Share2,
  Camera,
  ShieldCheck,
  Building,
  Menu,
  X
} from 'lucide-react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  auth,
  logOut,
  saveAddressToFirestore,
  AddressRegistration
} from './lib/firebase.js';

// Components
import { SplashScreen } from './components/SplashScreen.js';
import { GoogleMapPreview } from './components/GoogleMapPreview.js';
import { AddressAutocomplete } from './components/AddressAutocomplete.js';
import { PhotoUploader } from './components/PhotoUploader.js';
import { SavedAddressesView } from './components/SavedAddressesView.js';
import { ShareModal } from './components/ShareModal.js';
import { SubmissionWorkflowModal } from './components/SubmissionWorkflowModal.js';
import { AdminView } from './components/AdminView.js';
import { AuthModal } from './components/AuthModal.js';
import { PublicAddressGuide } from './components/PublicAddressGuide.js';
import { GoogleMeetPanel } from './components/GoogleMeetPanel.js';
import { VoiceAssistant } from './components/VoiceAssistant.js';
import { AiAssistant } from './components/AiAssistant.js';
import { ChatDrawer } from './components/ChatDrawer.js';
import { generateAddressPDF } from './lib/pdfGenerator.js';

export default function App() {
  // Splash Screen State (shown on first visit)
  const [showSplash, setShowSplash] = useState(true);

  // Config from environment variables and backend
  const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || '';
  const envMapsApiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
  const [apiKey, setApiKey] = useState(envMapsApiKey || 'AIzaSyAIzViRqCEzl-p7aeHP3IHz0wNNtJi-Thk');

  // Auth
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Active Navigation
  // 'home' | 'add-address' | 'saved' | 'admin' | 'ai-tools'
  const [currentTab, setCurrentTab] = useState<'home' | 'add-address' | 'saved' | 'admin' | 'ai-tools'>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Address Registration Form State
  const [buildingName, setBuildingName] = useState('Villa Bellini Residence');
  const [category, setCategory] = useState('Residential');
  const [addressLine1, setAddressLine1] = useState("Via Sant'Anna 8");
  const [addressLine2, setAddressLine2] = useState('95124 Catania');
  const [regionCode, setRegionCode] = useState('IT');
  const [enableUspsCass, setEnableUspsCass] = useState(false);
  const [autocompleteInput, setAutocompleteInput] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState('Main front entrance on Via Sant\'Anna with private courtyard.');

  // Draggable Map coordinates
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number }>({
    lat: 37.5029,
    lng: 15.0873
  });

  // Validation State
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Active item for sharing or Google Submission modal
  const [activeShareItem, setActiveShareItem] = useState<AddressRegistration | null>(null);
  const [activeWorkflowItem, setActiveWorkflowItem] = useState<AddressRegistration | null>(null);

  // Track Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  // Fetch Maps API key from backend
  useEffect(() => {
    fetch(`${apiBaseUrl}/api/config`)
      .then((res) => res.json())
      .then((data) => {
        if (data.mapsApiKey && !envMapsApiKey) {
          setApiKey(data.mapsApiKey);
        }
      })
      .catch((err) => console.warn('Config fetch error:', err));
  }, [apiBaseUrl, envMapsApiKey]);

  // Handle Autocomplete Place selection
  const handleAutocompleteSelect = (place: {
    formattedAddress: string;
    addressLines: string[];
    regionCode?: string;
    lat?: number;
    lng?: number;
  }) => {
    if (place.addressLines.length > 0) {
      setAddressLine1(place.addressLines[0]);
      setAddressLine2(place.addressLines.slice(1).join(', ') || '');
    } else {
      setAddressLine1(place.formattedAddress);
      setAddressLine2('');
    }
    if (place.regionCode) {
      setRegionCode(place.regionCode.toUpperCase());
    }
    if (place.lat !== undefined && place.lng !== undefined) {
      setCoordinates({
        lat: place.lat,
        lng: place.lng
      });
    }
  };

  // Run Google Address Validation API
  const handleValidateAddress = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setValidating(true);
    setErrorMsg(null);
    setSaveSuccessMsg(null);

    const lines = [addressLine1.trim(), addressLine2.trim()].filter(Boolean);
    if (lines.length === 0) {
      setErrorMsg('Please enter at least one address line.');
      setValidating(false);
      return;
    }

    try {
      const res = await fetch(`${apiBaseUrl}/api/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addressLines: lines,
          regionCode: regionCode.trim().toUpperCase() || undefined,
          enableUspsCass
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Address validation request failed');
      }

      setValidationResult(data);

      const geocode = data.result?.geocode;
      if (geocode?.location) {
        setCoordinates({
          lat: geocode.location.latitude,
          lng: geocode.location.longitude
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during validation');
    } finally {
      setValidating(false);
    }
  };

  // Save address registration to Firestore & SQLite and open Google Maps intake flow
  const handleSaveRegistration = async (initiateWorkflow = false) => {
    setSaving(true);
    setErrorMsg(null);
    setSaveSuccessMsg(null);

    try {
      const lines = [addressLine1.trim(), addressLine2.trim()].filter(Boolean);
      if (lines.length === 0) {
        throw new Error('Please enter at least one address line to submit.');
      }

      // 1. If not yet validated, run Google Address Validation API first
      let currentVal = validationResult;
      if (!currentVal) {
        const valRes = await fetch(`${apiBaseUrl}/api/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            addressLines: lines,
            regionCode: regionCode.trim().toUpperCase() || undefined,
            enableUspsCass
          })
        });
        const valData = await valRes.json();
        if (valRes.ok) {
          currentVal = valData;
          setValidationResult(valData);
          const geocode = valData.result?.geocode;
          if (geocode?.location) {
            setCoordinates({
              lat: geocode.location.latitude,
              lng: geocode.location.longitude
            });
          }
        }
      }

      const resData = currentVal?.result;
      const formattedAddress =
        resData?.address?.formattedAddress || lines.join(', ');
      const verdict = resData?.verdict || {};
      const granularity = verdict.validationGranularity || 'PREMISE';
      const complete = verdict.addressComplete !== undefined ? verdict.addressComplete : true;
      const hasUnconfirmed = verdict.hasUnconfirmedComponents || false;

      const registrationId = 'reg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

      const record: AddressRegistration = {
        id: registrationId,
        name: buildingName || 'Registered Address',
        category,
        formattedAddress,
        addressLines: lines,
        regionCode: regionCode.toUpperCase(),
        lat: coordinates.lat,
        lng: coordinates.lng,
        granularity,
        complete,
        hasUnconfirmedComponents: hasUnconfirmed,
        verdictSummary: `Granularity: ${granularity}. Validated via Google Address Validation API.`,
        notes,
        photos,
        userId: currentUser?.uid || 'guest',
        userEmail: currentUser?.email || 'Guest User',
        userName: currentUser?.displayName || 'Guest',
        createdAt: new Date().toISOString()
      };

      // 2. Save to Cloud Firestore
      await saveAddressToFirestore(record);

      // 3. Also save to SQLite / D1
      await fetch(`${apiBaseUrl}/api/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: record.id,
          formattedAddress: record.formattedAddress,
          addressLines: JSON.stringify(record.addressLines),
          regionCode: record.regionCode,
          lat: record.lat,
          lng: record.lng,
          granularity: record.granularity,
          complete: record.complete,
          hasUnconfirmedComponents: record.hasUnconfirmedComponents,
          verdictSummary: record.verdictSummary,
          notes: record.notes,
          userId: record.userId,
          userEmail: record.userEmail,
          createdAt: record.createdAt
        })
      });

      setSaveSuccessMsg('Address successfully validated and saved to Firestore!');

      if (initiateWorkflow) {
        setActiveWorkflowItem(record);
      } else {
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      setErrorMsg('Submission error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const currentFormattedString =
    validationResult?.result?.address?.formattedAddress ||
    [addressLine1, addressLine2].filter(Boolean).join(', ');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* 1. Splash Screen Overlay */}
      {showSplash && <SplashScreen onDismiss={() => setShowSplash(false)} />}

      {/* Luxury Navigation Header */}
      <header className="sticky top-0 z-40 bg-navy-900/90 backdrop-blur-md border-b border-gold/20 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          {/* Logo & Branding */}
          <div
            onClick={() => setCurrentTab('home')}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gold-gradient p-0.5 shadow-gold flex items-center justify-center">
              <div className="w-full h-full rounded-2xl bg-navy-900 flex items-center justify-center">
                <Compass className="w-5 h-5 text-amber-400 group-hover:rotate-45 transition-transform duration-300" />
              </div>
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white flex items-center space-x-2">
                <span>Google Maps</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-gold/40">
                  Address Registration
                </span>
              </span>
              <p className="text-[10px] text-slate-400 font-medium">
                Official Validation &amp; Public Review Intake
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 bg-navy-800/80 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => setCurrentTab('home')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                currentTab === 'home'
                  ? 'bg-gold-gradient text-slate-950 shadow-gold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentTab('add-address')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                currentTab === 'add-address'
                  ? 'bg-gold-gradient text-slate-950 shadow-gold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              + Add Address
            </button>
            <button
              onClick={() => setCurrentTab('saved')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                currentTab === 'saved'
                  ? 'bg-gold-gradient text-slate-950 shadow-gold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Saved Addresses
            </button>
            <button
              onClick={() => setCurrentTab('admin')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                currentTab === 'admin'
                  ? 'bg-gold-gradient text-slate-950 shadow-gold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Admin Portal
            </button>
            <button
              onClick={() => setCurrentTab('ai-tools')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                currentTab === 'ai-tools'
                  ? 'bg-gold-gradient text-slate-950 shadow-gold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              AI Grounding &amp; Voice
            </button>
          </nav>

          {/* Auth Button & Mobile Toggle */}
          <div className="flex items-center space-x-3">
            {currentUser ? (
              <div className="flex items-center space-x-2 bg-navy-800/60 pl-3 pr-1.5 py-1.5 rounded-2xl border border-slate-800">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-amber-300 truncate max-w-[130px]">
                    {currentUser.displayName || currentUser.email}
                  </div>
                  <div className="text-[9px] text-emerald-400 font-semibold uppercase tracking-wider">
                    Firestore Sync Active
                  </div>
                </div>
                <button
                  onClick={() => logOut()}
                  title="Sign out"
                  className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="py-2 px-4 rounded-xl bg-gold-gradient text-slate-950 font-bold text-xs shadow-gold hover:opacity-95 transition-all flex items-center space-x-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login / Register</span>
              </button>
            )}

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-navy-800 border border-slate-800 text-slate-200"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-navy-900 border-b border-gold/30 p-4 space-y-2 animate-in slide-in-from-top-2">
            <button
              onClick={() => {
                setCurrentTab('home');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold bg-navy-800 text-white"
            >
              Dashboard
            </button>
            <button
              onClick={() => {
                setCurrentTab('add-address');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold bg-navy-800 text-white"
            >
              + Add Address to Google Maps
            </button>
            <button
              onClick={() => {
                setCurrentTab('saved');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold bg-navy-800 text-white"
            >
              Saved Addresses
            </button>
            <button
              onClick={() => {
                setCurrentTab('admin');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold bg-navy-800 text-white"
            >
              Admin Portal &amp; SQLite
            </button>
            <button
              onClick={() => {
                setCurrentTab('ai-tools');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold bg-navy-800 text-white"
            >
              AI Grounding &amp; Voice
            </button>
          </div>
        )}
      </header>

      {/* Main Content View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Quick Localhost / Admin Info Strip */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-navy-900 via-navy-800 to-navy-900 border border-gold/30 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-gold">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-gold-gradient text-slate-950 font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-amber-300">Production Google Maps Address System:</span>{' '}
              <span className="text-slate-300">
                Connected to Google Address Validation, Places Autocomplete &amp; Firestore.
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <a
              href="http://localhost:3000"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-navy-700 hover:bg-navy-600 text-amber-300 font-semibold border border-gold/30 text-[11px] inline-flex items-center space-x-1 transition-all"
            >
              <span>http://localhost:3000</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="/admin.html"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-gold-gradient text-slate-950 font-bold text-[11px] inline-flex items-center space-x-1 shadow-gold"
            >
              <span>admin.html</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Public vs Private Google Maps Explanation component */}
        <PublicAddressGuide />

        {/* TAB 1: HOME DASHBOARD */}
        {currentTab === 'home' && (
          <div className="space-y-8 animate-in fade-in">
            {/* Hero Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-900 via-navy-800 to-slate-900 border border-gold/40 p-8 sm:p-10 shadow-2xl">
              <div className="max-w-2xl space-y-4">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-gold-gradient text-slate-950 shadow-gold inline-block">
                  Next-Gen Address Intake
                </span>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                  Validate &amp; Register Addresses with <br />
                  <span className="text-gold-gradient">Google Maps Intelligence</span>
                </h1>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Pinpoint building entrances with sub-meter precision, validate against Google’s official address records, upload exterior building photos, and compile certified dossiers for Google&apos;s public intake.
                </p>

                <div className="pt-3 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setCurrentTab('add-address')}
                    className="py-3 px-6 rounded-2xl bg-gold-gradient text-slate-950 font-extrabold text-xs shadow-gold hover:opacity-95 transition-all flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Address to Google Maps</span>
                  </button>

                  <button
                    onClick={() => setCurrentTab('saved')}
                    className="py-3 px-6 rounded-2xl bg-navy-800 hover:bg-navy-700 text-amber-300 border border-gold/40 font-bold text-xs flex items-center space-x-2 transition-all"
                  >
                    <History className="w-4 h-4" />
                    <span>View Saved Addresses</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick 3-Step Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-3xl bg-navy-900/60 border border-slate-800 hover:border-gold/50 transition-all space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-gold-gradient text-slate-950 flex items-center justify-center font-bold text-lg shadow-gold">
                  1
                </div>
                <h3 className="font-bold text-base text-white">Autocomplete &amp; Pinpoint</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Fast search with Google Places Autocomplete. Adjust the marker directly on the building roof or entrance using satellite hybrid view.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-navy-900/60 border border-slate-800 hover:border-gold/50 transition-all space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-gold-gradient text-slate-950 flex items-center justify-center font-bold text-lg shadow-gold">
                  2
                </div>
                <h3 className="font-bold text-base text-white">Validate &amp; Photo Evidence</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Verify deliverability with Google Address Validation API and upload high-res exterior photos required for GIS and cadastral review.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-navy-900/60 border border-slate-800 hover:border-gold/50 transition-all space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-gold-gradient text-slate-950 flex items-center justify-center font-bold text-lg shadow-gold">
                  3
                </div>
                <h3 className="font-bold text-base text-white">Dossier, PDF &amp; Submit</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Export luxury PDF certificates with custom QR codes, share via WhatsApp, and prepare the official &ldquo;Add a missing place&rdquo; submission for Google review.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ADD ADDRESS TO GOOGLE MAPS */}
        {currentTab === 'add-address' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-2xl font-extrabold text-white flex items-center space-x-2">
                  <span>Add Address to Google Maps</span>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gold-gradient text-slate-950 shadow-gold">
                    Full Intake Form
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Validate address lines, position draggable pin, attach exterior photos, and prepare Google submission.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Form Side */}
              <div className="lg:col-span-6 space-y-6">
                <div className="p-6 rounded-3xl bg-navy-900/90 border border-gold/30 shadow-xl space-y-5">
                  {/* Google Places Autocomplete */}
                  <div>
                    <label className="block text-xs font-bold text-amber-300 mb-2">
                      Google Places Autocomplete Search
                    </label>
                    <AddressAutocomplete
                      apiKey={apiKey}
                      value={autocompleteInput}
                      onChange={setAutocompleteInput}
                      onAddressSelect={handleAutocompleteSelect}
                    />
                  </div>

                  {/* Place Name and Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Building / Place Name
                      </label>
                      <input
                        type="text"
                        value={buildingName}
                        onChange={(e) => setBuildingName(e.target.value)}
                        placeholder="e.g. Villa Bellini Residence"
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-700 bg-navy-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-700 bg-navy-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="Residential">Residential Building / Villa</option>
                        <option value="Commercial">Commercial / Office</option>
                        <option value="Industrial">Industrial / Warehouse</option>
                        <option value="Government">Government / Institutional</option>
                        <option value="Other">Other Premise</option>
                      </select>
                    </div>
                  </div>

                  {/* Address lines */}
                  <div className="space-y-3 pt-2 border-t border-slate-800">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Address Line 1 (Street &amp; House Number)
                      </label>
                      <input
                        type="text"
                        value={addressLine1}
                        onChange={(e) => setAddressLine1(e.target.value)}
                        placeholder="e.g. Via Sant'Anna 8"
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-700 bg-navy-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Address Line 2 (City, Postal Code, Apt/Unit)
                      </label>
                      <input
                        type="text"
                        value={addressLine2}
                        onChange={(e) => setAddressLine2(e.target.value)}
                        placeholder="e.g. 95124 Catania"
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-700 bg-navy-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Region Code (ISO-2)
                        </label>
                        <input
                          type="text"
                          maxLength={3}
                          value={regionCode}
                          onChange={(e) => setRegionCode(e.target.value.toUpperCase())}
                          placeholder="e.g. IT, US, GB, FR"
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-700 bg-navy-800 text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div className="flex items-center pt-5">
                        <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enableUspsCass}
                            onChange={(e) => setEnableUspsCass(e.target.checked)}
                            className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                          />
                          <span>USPS CASS Mode</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Photo Uploader */}
                  <div className="pt-2 border-t border-slate-800">
                    <PhotoUploader photos={photos} onChange={setPhotos} maxPhotos={4} />
                  </div>

                  {/* Notes / Access Instructions */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Entrance &amp; Courier Delivery Notes
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Main front entrance on Via Sant'Anna with private courtyard."
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-700 bg-navy-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={handleValidateAddress}
                      disabled={validating}
                      className="flex-1 py-3 px-4 rounded-2xl bg-navy-800 hover:bg-navy-700 text-amber-300 border border-gold/40 text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-xs"
                    >
                      {validating ? (
                        <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 text-amber-400" />
                      )}
                      <span>Run Address Validation API</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveRegistration(true)}
                      disabled={saving}
                      className="py-3 px-6 rounded-2xl bg-gold-gradient text-slate-950 font-extrabold text-xs shadow-gold hover:opacity-95 transition-all flex items-center justify-center space-x-2"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Compass className="w-4 h-4" />
                      )}
                      <span>Submit to Google Maps</span>
                    </button>
                  </div>

                  {errorMsg && (
                    <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300 flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {saveSuccessMsg && (
                    <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-300 flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                      <span>{saveSuccessMsg}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Map Preview & Validation Results Side */}
              <div className="lg:col-span-6 space-y-6">
                {/* Draggable Map Preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                    <span className="font-bold text-amber-300 uppercase tracking-wider text-[11px]">
                      Interactive Satellite Map Preview
                    </span>
                    <span className="font-mono">
                      {coordinates.lat.toFixed(5)}, {coordinates.lng.toFixed(5)}
                    </span>
                  </div>

                  <div className="h-[420px]">
                    <GoogleMapPreview
                      apiKey={apiKey}
                      lat={coordinates.lat}
                      lng={coordinates.lng}
                      title={buildingName || addressLine1}
                      formattedAddress={currentFormattedString}
                      draggable={true}
                      onPositionChange={(pos) => setCoordinates(pos)}
                    />
                  </div>
                </div>

                {/* Validation Verdict Display */}
                {validationResult?.result && (
                  <div className="p-5 rounded-3xl bg-navy-900/90 border border-gold/30 shadow-lg space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <h4 className="font-bold text-sm text-white">
                          Google Address Validation Verdict
                        </h4>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-gold-gradient text-slate-950">
                        {validationResult.result.verdict?.validationGranularity || 'PREMISE'}
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-navy-800/80 border border-slate-800 text-xs space-y-1">
                      <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                        Standardized Formatted Result
                      </span>
                      <p className="font-semibold text-white">
                        {validationResult.result.address?.formattedAddress}
                      </p>
                    </div>

                    {/* Component Verification Progress Bar */}
                    {(() => {
                      const components = validationResult.result.address?.addressComponents || [];
                      const totalComponents = components.length;
                      const confirmedCount = components.filter(
                        (c: any) => c.confirmationLevel === 'CONFIRMED'
                      ).length;
                      const unconfirmedCount = totalComponents - confirmedCount;
                      const pctConfirmed = totalComponents > 0 ? Math.round((confirmedCount / totalComponents) * 100) : 0;

                      return (
                        <div className="p-3 rounded-2xl bg-navy-800/60 border border-gold/20 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-amber-300 flex items-center space-x-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                              <span>Component Verification Progress</span>
                            </span>
                            <span className="font-mono font-bold text-white text-[11px]">
                              {pctConfirmed}% Verified
                            </span>
                          </div>

                          {/* Progress Track */}
                          <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden flex">
                            <div
                              style={{ width: `${pctConfirmed}%` }}
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                              title={`${confirmedCount} Confirmed Components`}
                            />
                            {unconfirmedCount > 0 && (
                              <div
                                style={{ width: `${100 - pctConfirmed}%` }}
                                className="h-full bg-amber-500/80 transition-all duration-500"
                                title={`${unconfirmedCount} Pending / Unconfirmed`}
                              />
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[11px] pt-0.5">
                            <span className="flex items-center space-x-1.5 text-emerald-400 font-medium">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                              <span>{confirmedCount} Confirmed Components</span>
                            </span>
                            <span className="flex items-center space-x-1.5 text-amber-400 font-medium">
                              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
                              <span>{unconfirmedCount} Pending / Inferred</span>
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {validationResult.result.address?.addressComponents && (
                      <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-800 divide-y divide-slate-800/60 text-xs">
                        {validationResult.result.address.addressComponents.map(
                          (comp: any, idx: number) => (
                            <div key={idx} className="p-2 flex justify-between items-center">
                              <div>
                                <span className="font-medium text-slate-200">
                                  {comp.componentName?.text}
                                </span>
                                <span className="text-[10px] text-slate-500 block">
                                  {comp.componentType}
                                </span>
                              </div>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                                  comp.confirmationLevel === 'CONFIRMED'
                                    ? 'bg-emerald-950 text-emerald-300'
                                    : 'bg-amber-950 text-amber-300'
                                }`}
                              >
                                {comp.confirmationLevel}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SAVED ADDRESSES PAGE */}
        {currentTab === 'saved' && (
          <SavedAddressesView
            currentUser={currentUser}
            onAddNew={() => setCurrentTab('add-address')}
            onSelectAddress={(item) => {
              setCoordinates({ lat: item.lat, lng: item.lng });
              setBuildingName(item.name || '');
              if (item.addressLines && item.addressLines.length > 0) {
                setAddressLine1(item.addressLines[0]);
                setAddressLine2(item.addressLines.slice(1).join(', '));
              }
              setCurrentTab('add-address');
            }}
            onShare={(item) => setActiveShareItem(item)}
          />
        )}

        {/* TAB 4: ADMIN DASHBOARD */}
        {currentTab === 'admin' && (
          <AdminView
            currentUser={currentUser}
            onSelectAddress={(sub) => {
              setCoordinates({ lat: sub.lat, lng: sub.lng });
              setBuildingName(sub.formattedAddress);
              setCurrentTab('add-address');
            }}
          />
        )}

        {/* TAB 5: AI TOOLS, MEET & LIVE VOICE */}
        {currentTab === 'ai-tools' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-2xl font-extrabold text-white flex items-center space-x-2">
                  <span>Gemini Address Intelligence &amp; Google Meet</span>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gold-gradient text-slate-950 shadow-gold">
                    Multi-Turn &amp; Live Voice
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Deliverability audits, Google Maps &amp; Search Grounding, Google Meet conferences, and real-time voice streaming.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-6">
                <ChatDrawer
                  addressContext={{
                    currentAddress: currentFormattedString,
                    coordinates,
                    buildingName
                  }}
                />
              </div>

              <div className="lg:col-span-5 space-y-6">
                <GoogleMeetPanel
                  currentAddress={currentFormattedString}
                  user={currentUser}
                />

                <VoiceAssistant />

                <AiAssistant
                  currentAddress={currentFormattedString}
                  validationData={validationResult?.result}
                  lat={coordinates.lat}
                  lng={coordinates.lng}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Share / PDF / QR Modal */}
      {activeShareItem && (
        <ShareModal item={activeShareItem} onClose={() => setActiveShareItem(null)} />
      )}

      {/* Official Google Submission Workflow Modal */}
      {activeWorkflowItem && (
        <SubmissionWorkflowModal
          item={activeWorkflowItem}
          onClose={() => setActiveWorkflowItem(null)}
          onConfirmedSubmission={(updated) => {
            saveAddressToFirestore(updated);
          }}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={(user) => setCurrentUser(user)}
      />
    </div>
  );
}
