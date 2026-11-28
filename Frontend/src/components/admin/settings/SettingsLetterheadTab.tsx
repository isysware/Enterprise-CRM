import React, { useState, useRef, useEffect } from 'react';
import { useCRM } from '../../../context/CRMContext';
import { formatDate, getLocalDateString } from '../../../utils/formatters';
import {
  FileSignature,
  FileText,
  Save,
  CheckCircle2,
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
  Trash2,
  Sparkles,
  AlertCircle,
  Eye,
  Check,
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  PenTool,
  Receipt,
  FileCheck,
  Calendar,
  Layers
} from 'lucide-react';

interface SettingsLetterheadTabProps {
  onSaveSuccess: (message: string) => void;
}

const PRESET_LETTERHEADS = [
  {
    name: 'Modern Blue Minimalist',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    description: 'Crisp geometric top accent with subtle corporate footer'
  },
  {
    name: 'Executive Navy Blue',
    url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&auto=format&fit=crop&q=80',
    description: 'Corporate formal header with watermark border'
  },
  {
    name: 'Emerald Tech Clean',
    url: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=800&auto=format&fit=crop&q=80',
    description: 'Contemporary tech vibe with clean layout'
  }
];

const PRESET_TERMS_TEMPLATES = [
  {
    title: 'Standard Software & SaaS Contract',
    content: `1. Validity: This commercial quotation is valid for 14 calendar days from the date of issuance.
2. Payment Terms: 40% advance milestone on contract signing, 30% on beta milestone preview, and 30% upon final delivery & handover.
3. Taxes: Quoted prices are in Pakistani Rupees (PKR) and exclusive of applicable provincial sales tax (GST/PST) unless explicitly itemized.
4. Support & Warranty: 3 months of complimentary technical bug-fixing and cloud maintenance support is included post-launch.
5. Intellectual Property: Complete source code ownership and database rights will be transferred upon settlement of final invoice.`
  },
  {
    title: 'Monthly Retainer & Cloud Support',
    content: `1. Validity: Offer valid for 30 days from proposal date.
2. Billing Cycle: Invoiced monthly in advance on the 1st calendar day of each operating month.
3. SLA Commitments: 99.9% application uptime guarantee with 2-hour emergency bug turnaround time.
4. Scope: Includes up to 40 dedicated engineering hours per month; additional hours billed at standard blended rate.
5. Termination: Either party may terminate with a 30-day written advance notice.`
  },
  {
    title: 'Enterprise Turnkey Milestone Agreement',
    content: `1. Validity: 14 business days from date of submission.
2. Deliverables & Acceptance: Detailed acceptance testing period of 10 business days for each delivery milestone.
3. Payment Schedule: 25% Advance, 25% Design & Architecture, 25% Core Integration, 25% Deployment & Training.
4. Warranty: 12 months comprehensive enterprise warranty covering all standard security updates.`
  }
];

export const SettingsLetterheadTab: React.FC<SettingsLetterheadTabProps> = ({ onSaveSuccess }) => {
  const { settings, updateSettings } = useCRM();

  // Form State
  const [proposalLetterheadBg, setProposalLetterheadBg] = useState(settings.proposalLetterheadBg || '');
  const [companyAddress, setCompanyAddress] = useState(
    settings.companyAddress || 'Suite #402, Business Executive Center, Main Shahrah-e-Faisal, Karachi, Pakistan'
  );
  const [companyTaxId, setCompanyTaxId] = useState(settings.companyTaxId || 'NTN: 8294719-4 | STRN: 3277876123456');
  const [companyPhone, setCompanyPhone] = useState(settings.companyPhone || '+92 300 1234567');
  const [companyEmail, setCompanyEmail] = useState(settings.companyEmail || 'proposals@isysware.com');
  const [companyWebsite, setCompanyWebsite] = useState(settings.companyWebsite || 'https://isysware.com');
  const [defaultProposalValidityDays, setDefaultProposalValidityDays] = useState(settings.defaultProposalValidityDays || 14);
  const [defaultProposalTerms, setDefaultProposalTerms] = useState(
    settings.defaultProposalTerms || PRESET_TERMS_TEMPLATES[0].content
  );
  const [authorizedSignatureName, setAuthorizedSignatureName] = useState(
    settings.authorizedSignatureName || 'Abdur Rehman Arain'
  );
  const [authorizedSignatureTitle, setAuthorizedSignatureTitle] = useState(
    settings.authorizedSignatureTitle || 'Director of Enterprise Solutions'
  );
  const [authorizedSignatureImg, setAuthorizedSignatureImg] = useState(settings.authorizedSignatureImg || '');

  // UI helpers
  const [letterheadInputTab, setLetterheadInputTab] = useState<'upload' | 'preset' | 'url'>('upload');
  const [letterheadUrl, setLetterheadUrl] = useState('');
  const [letterheadError, setLetterheadError] = useState<string | null>(null);
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const letterheadFileInputRef = useRef<HTMLInputElement>(null);
  const signatureFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProposalLetterheadBg(settings.proposalLetterheadBg || '');
    setCompanyAddress(settings.companyAddress || 'Suite #402, Business Executive Center, Main Shahrah-e-Faisal, Karachi, Pakistan');
    setCompanyTaxId(settings.companyTaxId || 'NTN: 8294719-4 | STRN: 3277876123456');
    setCompanyPhone(settings.companyPhone || '+92 300 1234567');
    setCompanyEmail(settings.companyEmail || 'proposals@isysware.com');
    setCompanyWebsite(settings.companyWebsite || 'https://isysware.com');
    setDefaultProposalValidityDays(settings.defaultProposalValidityDays || 14);
    setDefaultProposalTerms(settings.defaultProposalTerms || PRESET_TERMS_TEMPLATES[0].content);
    setAuthorizedSignatureName(settings.authorizedSignatureName || 'Abdur Rehman Arain');
    setAuthorizedSignatureTitle(settings.authorizedSignatureTitle || 'Director of Enterprise Solutions');
    setAuthorizedSignatureImg(settings.authorizedSignatureImg || '');
  }, [settings]);

  // Handle Letterhead Background File Upload
  const handleLetterheadFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setLetterheadError(null);
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLetterheadError('Please upload a valid image file (PNG, JPG, SVG).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLetterheadError('Letterhead image exceeds 5MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProposalLetterheadBg(reader.result);
      }
    };
    reader.onerror = () => {
      setLetterheadError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  // Handle Authorized Signature File Upload
  const handleSignatureFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setSignatureError(null);
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSignatureError('Please upload a valid image file (PNG, JPG).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setSignatureError('Signature image exceeds 2MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAuthorizedSignatureImg(reader.result);
      }
    };
    reader.onerror = () => {
      setSignatureError('Failed to read signature image.');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const letterheadData = {
      proposalLetterheadBg,
      companyAddress: companyAddress.trim(),
      companyTaxId: companyTaxId.trim(),
      companyPhone: companyPhone.trim(),
      companyEmail: companyEmail.trim(),
      companyWebsite: companyWebsite.trim(),
      defaultProposalValidityDays: Number(defaultProposalValidityDays) || 14,
      defaultProposalTerms: defaultProposalTerms.trim(),
      authorizedSignatureName: authorizedSignatureName.trim(),
      authorizedSignatureTitle: authorizedSignatureTitle.trim(),
      authorizedSignatureImg
    };

    updateSettings(letterheadData, 'letterhead', 'Proposal Letterhead & PDF Settings');

    setTimeout(() => {
      setIsSaving(false);
      setIsSaved(true);
      onSaveSuccess('Proposal Letterhead, Corporate Identity & PDF settings saved successfully!');
      setTimeout(() => setIsSaved(false), 3000);
    }, 400);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Top Header info */}
      <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5EAF1] dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-[#2563EB] dark:text-blue-400">
              <FileSignature className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#0F172A] dark:text-white">
                Proposal Letterhead, Corporate Identity &amp; PDF Builder
              </h3>
              <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                Manage commercial quotation header data, NTN tax registrations, A4 background template, and authorized signature.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowLivePreview(prev => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Eye className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>{showLivePreview ? 'Hide A4 Preview' : 'Show A4 Preview'}</span>
          </button>
        </div>

        {/* SECTION 1: CORPORATE IDENTITY DETAILS */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 mb-3 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Official Corporate Identity &amp; Tax Credentials</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-[#0F172A] dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#64748B]" />
                <span>Official Registered Office Address</span>
              </label>
              <input
                type="text"
                value={companyAddress}
                onChange={e => setCompanyAddress(e.target.value)}
                placeholder="Suite #, Building, Street, City, Country"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5EAF1] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white placeholder-slate-400 focus:ring-1 focus:ring-[#2563EB] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-[#64748B]" />
                <span>NTN / Tax Registration / STRN</span>
              </label>
              <input
                type="text"
                value={companyTaxId}
                onChange={e => setCompanyTaxId(e.target.value)}
                placeholder="e.g. NTN: 8294719-4 | STRN: 3277876..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5EAF1] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white placeholder-slate-400 focus:ring-1 focus:ring-[#2563EB] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#64748B]" />
                <span>Official Support / Inquiry Phone</span>
              </label>
              <input
                type="text"
                value={companyPhone}
                onChange={e => setCompanyPhone(e.target.value)}
                placeholder="+92 300 1234567 / +92 21 34567890"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5EAF1] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white placeholder-slate-400 focus:ring-1 focus:ring-[#2563EB] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#64748B]" />
                <span>Proposals &amp; Inquiries Email</span>
              </label>
              <input
                type="email"
                value={companyEmail}
                onChange={e => setCompanyEmail(e.target.value)}
                placeholder="proposals@isysware.com"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5EAF1] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white placeholder-slate-400 focus:ring-1 focus:ring-[#2563EB] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#64748B]" />
                <span>Official Website URL</span>
              </label>
              <input
                type="url"
                value={companyWebsite}
                onChange={e => setCompanyWebsite(e.target.value)}
                placeholder="https://isysware.com"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5EAF1] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white placeholder-slate-400 focus:ring-1 focus:ring-[#2563EB] focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: PROPOSAL LETTERHEAD CANVAS / A4 BACKGROUND */}
        <div className="pt-4 border-t border-[#E5EAF1] dark:border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 mb-3 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Proposal Letterhead Canvas &amp; Background Image</span>
          </h4>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 space-y-3">
              <p className="text-xs text-[#64748B] dark:text-slate-400">
                Upload a custom A4 graphical background template (company stationery, watermark, header graphic, footer). If left empty, the CRM generates a clean digital CSS letterhead automatically.
              </p>

              {/* Upload vs URL vs Preset */}
              <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setLetterheadInputTab('upload')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    letterheadInputTab === 'upload'
                      ? 'bg-white dark:bg-slate-900 text-[#2563EB] dark:text-blue-400 shadow-xs'
                      : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload A4 File</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLetterheadInputTab('url')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    letterheadInputTab === 'url'
                      ? 'bg-white dark:bg-slate-900 text-[#2563EB] dark:text-blue-400 shadow-xs'
                      : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>Template URL</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLetterheadInputTab('preset')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    letterheadInputTab === 'preset'
                      ? 'bg-white dark:bg-slate-900 text-[#2563EB] dark:text-blue-400 shadow-xs'
                      : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Presets</span>
                </button>
              </div>

              {letterheadInputTab === 'upload' && (
                <div>
                  <input
                    ref={letterheadFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLetterheadFileUpload}
                    className="hidden"
                    id="letterhead-bg-upload-input"
                  />
                  <label
                    htmlFor="letterhead-bg-upload-input"
                    className="w-full flex flex-col items-center justify-center p-5 border-2 border-dashed border-[#E5EAF1] dark:border-slate-700 hover:border-[#2563EB] rounded-xl cursor-pointer bg-[#F7F9FC] dark:bg-slate-800/30 transition-all text-center group"
                  >
                    <Upload className="w-6 h-6 text-[#64748B] group-hover:text-[#2563EB] dark:group-hover:text-blue-400 mb-1.5 transition-colors" />
                    <span className="text-xs font-bold text-[#0F172A] dark:text-slate-300 group-hover:text-[#2563EB] dark:group-hover:text-blue-400">
                      Click to upload A4 Background Template
                    </span>
                    <span className="text-[10px] text-[#64748B] mt-0.5">
                      JPEG, PNG or WEBP background template
                    </span>
                  </label>
                </div>
              )}

              {letterheadInputTab === 'url' && (
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/a4-stationery.png"
                    value={letterheadUrl}
                    onChange={e => setLetterheadUrl(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-[#E5EAF1] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white placeholder-slate-400 focus:ring-1 focus:ring-[#2563EB] focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (letterheadUrl.trim()) {
                        setProposalLetterheadBg(letterheadUrl.trim());
                        setLetterheadUrl('');
                      }
                    }}
                    className="px-3 py-2 bg-[#2563EB] text-white text-xs font-bold rounded-xl hover:bg-[#1D4ED8] transition-colors shrink-0 cursor-pointer shadow-xs shadow-blue-500/20"
                  >
                    Apply
                  </button>
                </div>
              )}

              {letterheadInputTab === 'preset' && (
                <div className="space-y-2">
                  {PRESET_LETTERHEADS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setProposalLetterheadBg(p.url)}
                      className={`w-full p-2.5 rounded-xl border flex items-center gap-3 text-left transition-all cursor-pointer ${
                        proposalLetterheadBg === p.url
                          ? 'border-[#2563EB] bg-blue-50 dark:bg-blue-950/40'
                          : 'border-[#E5EAF1] dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <img
                        src={p.url}
                        alt={p.name}
                        className="w-10 h-14 rounded object-cover border border-[#E5EAF1] dark:border-slate-600 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#0F172A] dark:text-slate-200 truncate">
                          {p.name}
                        </p>
                        <p className="text-[10px] text-[#64748B] dark:text-slate-400">
                          {p.description}
                        </p>
                      </div>
                      {proposalLetterheadBg === p.url && (
                        <Check className="w-4 h-4 text-[#2563EB] dark:text-blue-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {proposalLetterheadBg && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F7F9FC] dark:bg-slate-800 border border-[#E5EAF1] dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-[#0F172A] dark:text-slate-300">
                      Local Preview Active (In-Memory)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setProposalLetterheadBg('');
                      if (letterheadFileInputRef.current) letterheadFileInputRef.current.value = '';
                    }}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Background</span>
                  </button>
                </div>
              )}

              {letterheadError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{letterheadError}</span>
                </div>
              )}
            </div>

            {/* Right: Signature Uploader & Authorized Details */}
            <div className="lg:col-span-6 space-y-3">
              <h5 className="text-xs font-bold text-[#0F172A] dark:text-slate-200 flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Authorized Signatory &amp; Stamp</span>
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                    Signatory Full Name
                  </label>
                  <input
                    type="text"
                    value={authorizedSignatureName}
                    onChange={e => setAuthorizedSignatureName(e.target.value)}
                    placeholder="e.g. Abdur Rehman Arain"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5EAF1] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white placeholder-slate-400 focus:ring-1 focus:ring-[#2563EB] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                    Official Designation / Title
                  </label>
                  <input
                    type="text"
                    value={authorizedSignatureTitle}
                    onChange={e => setAuthorizedSignatureTitle(e.target.value)}
                    placeholder="e.g. Director of Solutions"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5EAF1] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white placeholder-slate-400 focus:ring-1 focus:ring-[#2563EB] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Signature Image Uploader */}
              <div className="p-3.5 rounded-xl bg-[#F7F9FC] dark:bg-slate-800/50 border border-[#E5EAF1] dark:border-slate-700 space-y-2">
                <label className="block text-xs font-bold text-[#0F172A] dark:text-slate-300">
                  Signature Image / Stamp Asset
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-28 h-14 rounded-lg bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-600 flex items-center justify-center overflow-hidden p-1">
                    {authorizedSignatureImg ? (
                      <img
                        src={authorizedSignatureImg}
                        alt="Signature"
                        className="max-h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-[10px] text-[#64748B] font-mono italic">No Signature</span>
                    )}
                  </div>

                  <div className="flex-1 space-y-1">
                    <input
                      ref={signatureFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleSignatureFileUpload}
                      className="hidden"
                      id="signature-img-upload-input"
                    />
                    <label
                      htmlFor="signature-img-upload-input"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-[#E5EAF1] dark:border-slate-600 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-[#2563EB] cursor-pointer transition-colors shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span>{authorizedSignatureImg ? 'Change Signature' : 'Upload Signature'}</span>
                    </label>

                    {authorizedSignatureImg && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthorizedSignatureImg('');
                          if (signatureFileInputRef.current) signatureFileInputRef.current.value = '';
                        }}
                        className="block text-[10px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer pt-0.5"
                      >
                        Remove Signature
                      </button>
                    )}
                  </div>
                </div>
                {signatureError && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400">{signatureError}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: PROPOSAL DEFAULTS & TERMS EDITOR */}
        <div className="pt-4 border-t border-[#E5EAF1] dark:border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Standard Proposal Validity &amp; Terms &amp; Conditions</span>
            </h4>

            {/* Quick Templates Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#64748B]">Quick Template:</span>
              <div className="flex gap-1">
                {PRESET_TERMS_TEMPLATES.map((t, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setDefaultProposalTerms(t.content)}
                    className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-[#2563EB] transition-colors cursor-pointer"
                  >
                    Preset {idx + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-[#0F172A] dark:text-slate-300 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
                <span>Default Validity (Days)</span>
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={defaultProposalValidityDays}
                onChange={e => setDefaultProposalValidityDays(Number(e.target.value) || 14)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5EAF1] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white placeholder-slate-400 focus:ring-1 focus:ring-[#2563EB] focus:outline-hidden"
              />
              <p className="text-[10px] text-[#64748B] mt-1">
                Automatically calculates proposal expiry date on generation.
              </p>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-[#0F172A] dark:text-slate-300 mb-1.5">
                Standard Commercial Terms &amp; Conditions (Clauses)
              </label>
              <textarea
                rows={5}
                value={defaultProposalTerms}
                onChange={e => setDefaultProposalTerms(e.target.value)}
                placeholder="Enter standard clauses (milestones, warranty, payment terms, IP)..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5EAF1] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white font-mono placeholder-slate-400 focus:ring-1 focus:ring-[#2563EB] focus:outline-hidden leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* INTERACTIVE A4 LIVE PREVIEW SHEET */}
        {showLivePreview && (
          <div className="pt-4 border-t border-[#E5EAF1] dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#0F172A] dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-[#2563EB]" />
                Interactive A4 Proposal Sheet Preview
              </span>
              <span className="text-[11px] font-normal text-[#64748B]">
                Shows exact layout generated for clients
              </span>
            </div>

            {/* A4 Paper Container */}
            <div className="p-4 sm:p-8 rounded-2xl bg-slate-200/70 dark:bg-slate-950 flex items-center justify-center overflow-x-auto">
              <div
                className="w-full max-w-[540px] aspect-[1/1.414] bg-white text-slate-900 rounded-lg shadow-xl p-6 relative flex flex-col justify-between overflow-hidden border border-slate-300"
                style={
                  proposalLetterheadBg
                    ? {
                        backgroundImage: `url(${proposalLetterheadBg})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }
                    : {}
                }
              >
                {/* Proposal Header */}
                <div className="space-y-3 relative z-10">
                  <div className="flex items-start justify-between border-b pb-3 border-slate-200">
                    <div>
                      <h2 className="text-base font-medium text-slate-900 uppercase tracking-tight">
                        {settings.companyName || 'Enterprise CRM'}
                      </h2>
                      <p className="text-[9px] text-slate-500 max-w-[240px] leading-tight mt-0.5">
                        {companyAddress}
                      </p>
                      <p className="text-[8px] text-slate-400 font-mono mt-0.5">
                        {companyTaxId}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-blue-50 text-[#2563EB] border border-blue-200">
                        COMMERCIAL PROPOSAL
                      </span>
                      <p className="text-[9px] font-bold text-slate-800 mt-1">
                        Ref: PROP-2026-0042
                      </p>
                      <p className="text-[8px] text-slate-500">
                        Valid: {defaultProposalValidityDays} Days
                      </p>
                    </div>
                  </div>

                  {/* Sample Client Info Box */}
                  <div className="grid grid-cols-2 gap-2 text-[9px] p-2 bg-slate-50/80 rounded border border-slate-200">
                    <div>
                      <span className="text-slate-400 font-bold block">PREPARED FOR:</span>
                      <span className="font-bold text-slate-800">Al-Falah Textiles Ltd</span>
                      <span className="text-slate-500 block">Tariq Mahmood (COO)</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 font-bold block">DATE &amp; CURRENCY:</span>
                      <span className="font-bold text-slate-800">{formatDate(getLocalDateString())}</span>
                      <span className="text-[#2563EB] font-bold block">PKR (Pakistani Rupee)</span>
                    </div>
                  </div>

                  {/* Sample Quotation Table */}
                  <div className="border border-slate-200 rounded overflow-hidden text-[8px]">
                    <div className="bg-slate-100 font-bold p-1.5 grid grid-cols-12 text-slate-700">
                      <span className="col-span-7">Scope Deliverable</span>
                      <span className="col-span-2 text-center">Type</span>
                      <span className="col-span-3 text-right">Investment</span>
                    </div>
                    <div className="p-1.5 grid grid-cols-12 border-t border-slate-100 bg-white">
                      <span className="col-span-7 font-medium">Enterprise CRM Core Deployment</span>
                      <span className="col-span-2 text-center text-slate-500">SaaS</span>
                      <span className="col-span-3 text-right font-bold text-slate-800">Rs. 120,000</span>
                    </div>
                  </div>
                </div>

                {/* Proposal Footer & Signature */}
                <div className="relative z-10 pt-2 border-t border-slate-200 mt-auto space-y-2">
                  <div className="text-[7.5px] text-slate-500 line-clamp-2 leading-tight">
                    <span className="font-bold text-slate-700">Terms Summary: </span>
                    {defaultProposalTerms}
                  </div>

                  <div className="flex items-end justify-between pt-2">
                    <div className="text-[8px] text-slate-500">
                      <span>{companyEmail}</span> • <span>{companyPhone}</span>
                    </div>

                    <div className="text-right min-w-[120px]">
                      {authorizedSignatureImg && (
                        <img
                          src={authorizedSignatureImg}
                          alt="Signature"
                          className="h-7 object-contain ml-auto mb-0.5"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className="border-t border-slate-400 pt-0.5">
                        <p className="text-[8px] font-bold text-slate-800">
                          {authorizedSignatureName}
                        </p>
                        <p className="text-[7px] text-slate-500">
                          {authorizedSignatureTitle}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Save Action Bar */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="text-xs text-[#64748B] dark:text-slate-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          <span>Configuration: Connected to PostgreSQL Database</span>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl shadow-xs shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : isSaved ? (
            <Check className="w-4 h-4 text-emerald-300" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{isSaved ? 'Letterhead Saved!' : 'Save Letterhead & Template Settings'}</span>
        </button>
      </div>
    </form>
  );
};
