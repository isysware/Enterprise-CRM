import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useCRM } from '../../context/CRMContext';
import { Lead, Proposal, ProposalItem, PaymentMilestone } from '../../types';
import { formatPKR } from '../../utils/formatters';
import {
  X,
  FileSignature,
  Download,
  Share2,
  Save,
  Plus,
  Trash2,
  Printer,
  Sparkles,
  Calendar,
  Building2,
  User as UserIcon,
  Phone,
  Mail,
  Receipt,
  Eye,
  CheckCircle2,
  FileText,
  DollarSign,
  Layers,
  ArrowRight,
  MessageCircle,
  Copy,
  Sliders,
  Check
} from 'lucide-react';

interface ProposalBuilderModalProps {
  lead: Lead | null;
  existingProposal?: Proposal | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (proposal: Proposal) => void;
}

export const ProposalBuilderModal: React.FC<ProposalBuilderModalProps> = ({
  lead,
  existingProposal,
  isOpen,
  onClose,
  onSaved
}) => {
  const { settings, users, services, addProposal, updateProposal, currentUser } = useCRM();

  const assignedRep = useMemo(() => {
    if (!lead) return currentUser;
    return users.find(u => u.id === lead.assignedToId) || currentUser;
  }, [users, lead?.assignedToId, currentUser]);

  // Active View Tab: 'builder' | 'preview'
  const [activeTab, setActiveTab] = useState<'builder' | 'preview'>('builder');

  // Proposal Meta State
  const [refNumber, setRefNumber] = useState(
    existingProposal?.refNumber || `PROP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [title, setTitle] = useState(
    existingProposal?.title || `Commercial Quotation & Proposal for ${lead?.businessName || lead?.name || 'Client'}`
  );
  const [issueDate, setIssueDate] = useState(
    existingProposal?.issueDate || new Date().toISOString().split('T')[0]
  );
  const [validityDays, setValidityDays] = useState(existingProposal?.validityDays || 14);
  const [status, setStatus] = useState<Proposal['status']>(existingProposal?.status || 'Draft');

  // Client Details (Editable)
  const [clientName, setClientName] = useState(existingProposal?.clientName || lead?.name || '');
  const [businessName, setBusinessName] = useState(existingProposal?.businessName || lead?.businessName || '');
  const [clientEmail, setClientEmail] = useState(existingProposal?.clientEmail || lead?.email || '');
  const [clientPhone, setClientPhone] = useState(existingProposal?.clientPhone || lead?.phone || '');
  const [clientAddress, setClientAddress] = useState(
    existingProposal?.clientAddress || (lead?.city ? `${lead.city}, Pakistan` : 'Karachi, Pakistan')
  );

  // Scope of Work / Overview
  const [scopeOfWork, setScopeOfWork] = useState(
    existingProposal?.scopeOfWork ||
      `1. Executive Summary: Provisioning and full-cycle implementation of ${
        lead?.servicesOfInterest && lead.servicesOfInterest.length > 0
          ? lead.servicesOfInterest.join(', ')
          : 'Enterprise Software & Automation Suite'
      }.\n2. Implementation Scope: Deployment of dedicated high-availability environment, user role administration, custom pipeline configuration, staff training, and data onboarding.\n3. SLA & Support: 99.9% uptime SLA with dedicated direct escalation channel and automated database backups.`
  );

  // Line Items
  const [items, setItems] = useState<ProposalItem[]>(() => {
    if (existingProposal?.items && existingProposal.items.length > 0) {
      return existingProposal.items;
    }
    // Auto-prepopulate from Lead's services of interest
    if (lead?.servicesOfInterest && lead.servicesOfInterest.length > 0) {
      return lead.servicesOfInterest.map((serviceName, idx) => {
        const matchedService = services.find(s => s.name.toLowerCase() === serviceName.toLowerCase());
        const price = matchedService ? matchedService.basePricePKR : 45000;
        return {
          id: `item-${Date.now()}-${idx}`,
          title: serviceName,
          description: matchedService?.description || `Professional implementation and configuration of ${serviceName}`,
          quantity: 1,
          unitPrice: price,
          discount: 0,
          total: price
        };
      });
    }
    // Default initial single item
    return [
      {
        id: `item-${Date.now()}-0`,
        title: 'Enterprise Software Implementation',
        description: 'Complete system deployment, configuration, employee training & cloud hosting setup',
        quantity: 1,
        unitPrice: 65000,
        discount: 0,
        total: 65000
      }
    ];
  });

  // Tax and Discount Rates
  const [taxRate, setTaxRate] = useState<number>(existingProposal?.taxRate || 0);

  // Payment Milestones
  const [milestones, setMilestones] = useState<PaymentMilestone[]>(() => {
    if (existingProposal?.paymentMilestones && existingProposal.paymentMilestones.length > 0) {
      return existingProposal.paymentMilestones;
    }
    return [
      {
        id: 'ms-1',
        title: '1. Advance Milestone (Contract Signing & Kickoff)',
        percentage: 40,
        amount: 0,
        dueDate: 'Upon Agreement Signing'
      },
      {
        id: 'ms-2',
        title: '2. Beta Prototype & Core Module Approval',
        percentage: 30,
        amount: 0,
        dueDate: 'Within 14 Days of Kickoff'
      },
      {
        id: 'ms-3',
        title: '3. Final Deployment & Complete Handover',
        percentage: 30,
        amount: 0,
        dueDate: 'Upon Production Launch'
      }
    ];
  });

  // Terms & Conditions
  const [termsAndConditions, setTermsAndConditions] = useState(
    existingProposal?.termsAndConditions ||
      settings.defaultProposalTerms ||
      `1. Validity: This commercial quotation is valid for 14 calendar days from the date of issuance.\n2. Payment Terms: 40% advance milestone on contract signing, 30% on beta milestone preview, and 30% upon final delivery & handover.\n3. Taxes: Quoted prices are in Pakistani Rupees (PKR) and exclusive of applicable provincial sales tax (GST/PST) unless explicitly itemized.\n4. Support & Warranty: 3 months of complimentary technical bug-fixing and cloud maintenance support is included post-launch.\n5. Intellectual Property: Complete source code ownership and database rights will be transferred upon settlement of final invoice.`
  );

  // Authorized Signatory
  const [signatoryName, setSignatoryName] = useState(
    existingProposal?.authorizedSignatureName || settings.authorizedSignatureName || 'Abdur Rehman Arain'
  );
  const [signatoryTitle, setSignatoryTitle] = useState(
    existingProposal?.authorizedSignatureTitle || settings.authorizedSignatureTitle || 'Director of Enterprise Solutions'
  );
  const [signatoryImg, setSignatoryImg] = useState(
    existingProposal?.authorizedSignatureImg || settings.authorizedSignatureImg || ''
  );

  // Sync state whenever modal is opened or target lead/proposal changes
  useEffect(() => {
    if (!isOpen || !lead) return;

    if (existingProposal) {
      setRefNumber(existingProposal.refNumber || `PROP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
      setTitle(existingProposal.title || `Commercial Quotation & Proposal for ${existingProposal.businessName || existingProposal.clientName || lead.businessName || lead.name}`);
      setIssueDate(existingProposal.issueDate || new Date().toISOString().split('T')[0]);
      setValidityDays(existingProposal.validityDays || 14);
      setStatus(existingProposal.status || 'Draft');
      setClientName(existingProposal.clientName || lead.name || '');
      setBusinessName(existingProposal.businessName || lead.businessName || '');
      setClientEmail(existingProposal.clientEmail || lead.email || '');
      setClientPhone(existingProposal.clientPhone || lead.phone || '');
      setClientAddress(existingProposal.clientAddress || (lead.city ? `${lead.city}, Pakistan` : 'Karachi, Pakistan'));
      setScopeOfWork(existingProposal.scopeOfWork || '');
      if (existingProposal.items && existingProposal.items.length > 0) {
        setItems(existingProposal.items);
      }
      setTaxRate(existingProposal.taxRate || 0);
      if (existingProposal.paymentMilestones && existingProposal.paymentMilestones.length > 0) {
        setMilestones(existingProposal.paymentMilestones);
      }
      setTermsAndConditions(existingProposal.termsAndConditions || settings.defaultProposalTerms || '');
      setSignatoryName(existingProposal.authorizedSignatureName || settings.authorizedSignatureName || 'Abdur Rehman Arain');
      setSignatoryTitle(existingProposal.authorizedSignatureTitle || settings.authorizedSignatureTitle || 'Director of Enterprise Solutions');
      setSignatoryImg(existingProposal.authorizedSignatureImg || settings.authorizedSignatureImg || '');
    } else {
      setRefNumber(`PROP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
      setTitle(`Commercial Quotation & Proposal for ${lead.businessName || lead.name}`);
      setIssueDate(new Date().toISOString().split('T')[0]);
      setValidityDays(14);
      setStatus('Draft');
      setClientName(lead.name || '');
      setBusinessName(lead.businessName || '');
      setClientEmail(lead.email || '');
      setClientPhone(lead.phone || '');
      setClientAddress(lead.city ? `${lead.city}, Pakistan` : 'Karachi, Pakistan');
      setScopeOfWork(
        `1. Executive Summary: Provisioning and full-cycle implementation of ${
          lead.servicesOfInterest && lead.servicesOfInterest.length > 0
            ? lead.servicesOfInterest.join(', ')
            : 'Enterprise Software & Automation Suite'
        }.\n2. Implementation Scope: Deployment of dedicated high-availability environment, user role administration, custom pipeline configuration, staff training, and data onboarding.\n3. SLA & Support: 99.9% uptime SLA with dedicated direct escalation channel and automated database backups.`
      );
      if (lead.servicesOfInterest && lead.servicesOfInterest.length > 0) {
        setItems(
          lead.servicesOfInterest.map((serviceName, idx) => {
            const matchedService = services.find(s => s.name.toLowerCase() === serviceName.toLowerCase());
            const price = matchedService ? matchedService.basePricePKR : 45000;
            return {
              id: `item-${Date.now()}-${idx}`,
              title: serviceName,
              description: matchedService?.description || `Professional implementation and configuration of ${serviceName}`,
              quantity: 1,
              unitPrice: price,
              discount: 0,
              total: price
            };
          })
        );
      } else {
        setItems([
          {
            id: `item-${Date.now()}-0`,
            title: 'Enterprise Software Implementation',
            description: 'Complete system deployment, configuration, employee training & cloud hosting setup',
            quantity: 1,
            unitPrice: 65000,
            discount: 0,
            total: 65000
          }
        ]);
      }
      setTaxRate(0);
      setMilestones([
        {
          id: 'ms-1',
          title: '1. Advance Milestone (Contract Signing & Kickoff)',
          percentage: 40,
          amount: 0,
          dueDate: 'Upon Agreement Signing'
        },
        {
          id: 'ms-2',
          title: '2. Beta Prototype & Core Module Approval',
          percentage: 30,
          amount: 0,
          dueDate: 'Within 14 Days of Kickoff'
        },
        {
          id: 'ms-3',
          title: '3. Final Deployment & Complete Handover',
          percentage: 30,
          amount: 0,
          dueDate: 'Upon Production Launch'
        }
      ]);
      setTermsAndConditions(
        settings.defaultProposalTerms ||
          `1. Validity: This commercial quotation is valid for 14 calendar days from the date of issuance.\n2. Payment Terms: 40% advance milestone on contract signing, 30% on beta milestone preview, and 30% upon final delivery & handover.\n3. Taxes: Quoted prices are in Pakistani Rupees (PKR) and exclusive of applicable provincial sales tax (GST/PST) unless explicitly itemized.\n4. Support & Warranty: 3 months of complimentary technical bug-fixing and cloud maintenance support is included post-launch.\n5. Intellectual Property: Complete source code ownership and database rights will be transferred upon settlement of final invoice.`
      );
      setSignatoryName(settings.authorizedSignatureName || 'Abdur Rehman Arain');
      setSignatoryTitle(settings.authorizedSignatureTitle || 'Director of Enterprise Solutions');
      setSignatoryImg(settings.authorizedSignatureImg || '');
    }
  }, [isOpen, lead, existingProposal, services, settings]);

  // Letterhead Background Toggle in Preview
  const [showLetterheadBg, setShowLetterheadBg] = useState(true);

  // Feedback State
  const [isCopied, setIsCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Print ref
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }, [items]);

  const totalDiscount = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.discount || 0), 0);
  }, [items]);

  const taxableAmount = Math.max(0, subtotal - totalDiscount);
  const taxAmount = (taxableAmount * (taxRate || 0)) / 100;
  const grandTotal = taxableAmount + taxAmount;

  // Expiry Date calculation
  const expiryDate = useMemo(() => {
    try {
      const d = new Date(issueDate);
      d.setDate(d.getDate() + Number(validityDays || 14));
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }, [issueDate, validityDays]);

  // Recalculate milestone amounts whenever grandTotal changes
  const computedMilestones = useMemo(() => {
    return milestones.map(m => ({
      ...m,
      amount: Math.round((grandTotal * (m.percentage || 0)) / 100)
    }));
  }, [milestones, grandTotal]);

  // Handle Item Modifications
  const handleItemChange = (id: string, field: keyof ProposalItem, value: any) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        const q = Number(updated.quantity) || 1;
        const up = Number(updated.unitPrice) || 0;
        const disc = Number(updated.discount) || 0;
        updated.total = Math.max(0, q * up - disc);
        return updated;
      })
    );
  };

  const handleAddItem = () => {
    const newItem: ProposalItem = {
      id: `item-${Date.now()}-${items.length}`,
      title: 'New Service Item / Deliverable',
      description: 'Scope and deliverable specifications',
      quantity: 1,
      unitPrice: 15000,
      discount: 0,
      total: 15000
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleAddCatalogService = (serviceId: string) => {
    const s = services.find(srv => srv.id === serviceId);
    if (!s) return;
    const newItem: ProposalItem = {
      id: `item-${Date.now()}-${items.length}`,
      title: s.name,
      description: s.description || `${s.category} Service Deliverable`,
      quantity: 1,
      unitPrice: s.basePricePKR,
      discount: 0,
      total: s.basePricePKR
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      return;
    }
    setItems(prev => prev.filter(i => i.id !== id));
  };

  // Milestone Actions
  const handleMilestoneChange = (id: string, field: keyof PaymentMilestone, value: any) => {
    setMilestones(prev =>
      prev.map(m => {
        if (m.id !== id) return m;
        return { ...m, [field]: value };
      })
    );
  };

  const handleAddMilestone = () => {
    const newMs: PaymentMilestone = {
      id: `ms-${Date.now()}`,
      title: `${milestones.length + 1}. Milestone Phase`,
      percentage: 0,
      amount: 0,
      dueDate: 'Upon Milestone Delivery'
    };
    setMilestones(prev => [...prev, newMs]);
  };

  const handleRemoveMilestone = (id: string) => {
    setMilestones(prev => prev.filter(m => m.id !== id));
  };

  // Save Proposal
  const handleSaveProposal = () => {
    if (isSaving || !lead) return;
    setIsSaving(true);
    const proposalPayload: Omit<Proposal, 'id' | 'createdAt'> = {
      leadId: lead.id,
      refNumber,
      title,
      clientName: clientName.trim() || lead.name,
      businessName: businessName.trim() || lead.businessName,
      clientEmail: clientEmail.trim() || lead.email,
      clientPhone: clientPhone.trim() || lead.phone,
      clientAddress: clientAddress.trim(),
      issueDate,
      validityDays: Number(validityDays) || 14,
      status,
      scopeOfWork,
      items,
      subtotal,
      totalDiscount,
      taxRate: Number(taxRate) || 0,
      taxAmount,
      grandTotal,
      currency: settings.currency || 'PKR',
      currencySymbol: settings.currencySymbol || 'Rs.',
      paymentMilestones: computedMilestones,
      termsAndConditions,
      letterheadBg: settings.proposalLetterheadBg || '',
      companyName: settings.companyName || 'iSysware',
      companyAddress: settings.companyAddress || '',
      companyTaxId: settings.companyTaxId || '',
      companyPhone: settings.companyPhone || '',
      companyEmail: settings.companyEmail || '',
      companyWebsite: settings.companyWebsite || '',
      companyLogo: settings.companyLogo || '',
      authorizedSignatureName: signatoryName,
      authorizedSignatureTitle: signatoryTitle,
      authorizedSignatureImg: signatoryImg,
      assignedRepName: assignedRep?.name || currentUser?.name || 'Sales Representative'
    };

    let savedItem: Proposal;
    if (existingProposal?.id) {
      savedItem = {
        ...proposalPayload,
        id: existingProposal.id,
        createdAt: existingProposal.createdAt
      };
      updateProposal(savedItem);
    } else {
      savedItem = addProposal(proposalPayload);
    }

    setSaveSuccess(true);
    if (onSaved) onSaved(savedItem);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsSaving(false);
      onClose();
    }, 1200);
  };

  // Trigger Print Dialog
  const handlePrint = () => {
    window.print();
  };

  // WhatsApp Share Link
  const handleShareWhatsApp = () => {
    const cleanPhone = clientPhone.replace(/[^0-9]/g, '');
    const message = `*COMMERCIAL PROPOSAL - ${settings.companyName || 'iSysware'}*\n\nDear ${clientName || 'Client'},\n\nWe are pleased to share our commercial proposal *${refNumber}* for *${title}*.\n\n*Key Highlights:*\n- Total Project Value: *${settings.currencySymbol || 'Rs.'} ${(grandTotal || 0).toLocaleString()}*\n- Items Included: ${items.map(i => i.title).join(', ')}\n- Proposal Validity: ${validityDays} Days (Valid until ${expiryDate})\n- Prepared by: ${assignedRep?.name || 'Representative'}\n\nPlease let us know if you have any questions or require adjustments. We look forward to working with you!\n\nBest Regards,\n*${settings.companyName || 'iSysware Enterprise'}*`;

    const encoded = encodeURIComponent(message);
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Copy Summary to Clipboard
  const handleCopySummary = () => {
    const summaryText = `Proposal: ${refNumber}\nClient: ${clientName} (${businessName})\nTotal: PKR ${(grandTotal || 0).toLocaleString()}\nItems: ${items.length}\nValid Until: ${expiryDate}`;
    navigator.clipboard.writeText(summaryText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!isOpen || !lead) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-slate-900 rounded-2xl border border-slate-700/80 shadow-2xl w-full max-w-6xl h-[94vh] flex flex-col overflow-hidden text-slate-100">
        {/* MODAL HEADER */}
        <div className="p-4 sm:px-6 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center justify-center font-bold">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-medium text-white tracking-tight">
                  Commercial Proposal &amp; Quotation Builder
                </h2>
                <span className="text-[10px] font-mono font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                  {refNumber}
                </span>
                <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  Lead: {lead.name}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Generate itemized commercial quotations, milestones, custom letterhead branding, and A4 PDF exports.
              </p>
            </div>
          </div>

          {/* Action Tabs & Close */}
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab('builder')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'builder'
                    ? 'bg-[#2563EB] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Builder &amp; Pricing</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-[#2563EB] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>A4 Live Preview &amp; Export</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL MAIN CONTENT */}
        <div className="flex-1 overflow-y-auto bg-slate-900 p-4 sm:p-6">
          {activeTab === 'builder' ? (
            <div className="space-y-6 max-w-5xl mx-auto">
              {/* SECTION 1: HEADER & CLIENT META */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#2563EB]" />
                    <h3 className="font-bold text-sm text-white">Proposal Identification &amp; Client Details</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Proposal Status:</span>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value as Proposal['status'])}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-bold cursor-pointer"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Sent">Sent</option>
                      <option value="Accepted">Accepted</option>
                      <option value="Revised">Revised</option>
                      <option value="Declined">Declined</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Proposal Ref #</label>
                    <input
                      type="text"
                      value={refNumber}
                      onChange={e => setRefNumber(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Issue Date</label>
                    <input
                      type="date"
                      value={issueDate}
                      onChange={e => setIssueDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      Validity Period (Days) - Expires {expiryDate}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={90}
                        value={validityDays}
                        onChange={e => setValidityDays(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium font-mono"
                      />
                      <span className="text-slate-400 font-medium">Days</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1 text-xs">Proposal Project Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Commercial Quotation for Enterprise CRM & Custom SaaS Automation"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white font-bold"
                  />
                </div>

                {/* Client Details Row */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-400 mb-1">Client Contact Name</label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={e => setClientName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-400 mb-1">Company / Business</label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={e => setBusinessName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-400 mb-1">Phone / WhatsApp</label>
                    <input
                      type="text"
                      value={clientPhone}
                      onChange={e => setClientPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-400 mb-1">Official Email</label>
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={e => setClientEmail(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: SCOPE OF WORK / EXECUTIVE SUMMARY */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-bold text-sm text-white">Project Scope of Work &amp; Deliverables Overview</h3>
                </div>
                <textarea
                  rows={4}
                  value={scopeOfWork}
                  onChange={e => setScopeOfWork(e.target.value)}
                  placeholder="Outline the deliverables, system features, modules, and service level commitments included in this proposal..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 font-mono leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              {/* SECTION 3: ITEMIZED SERVICES & PRICING TABLE */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-400" />
                    <div>
                      <h3 className="font-bold text-sm text-white">
                        Itemized Pricing &amp; Service Quotation Table
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Add services from your organization catalog or define custom scope deliverables.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Fast Insert from Organization Catalog */}
                    {services && services.length > 0 && (
                      <select
                        onChange={e => {
                          if (e.target.value) {
                            handleAddCatalogService(e.target.value);
                            e.target.value = '';
                          }
                        }}
                        defaultValue=""
                        className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-blue-300 font-bold cursor-pointer"
                      >
                        <option value="" disabled>
                          + Insert From Catalog...
                        </option>
                        {services.map(s => {
                          const price = s.defaultPricePKR ?? s.basePricePKR ?? 0;
                          return (
                            <option key={s.id} value={s.id}>
                              {s.name} ({settings.currencySymbol || 'Rs.'} {price.toLocaleString()})
                            </option>
                          );
                        })}
                      </select>
                    )}

                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs transition-colors cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Item</span>
                    </button>
                  </div>
                </div>

                {/* Items Table */}
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-400">#{idx + 1} Line Item</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={items.length <= 1}
                          className="text-slate-500 hover:text-rose-400 disabled:opacity-30 disabled:cursor-not-allowed p-1 transition-colors cursor-pointer"
                          title={items.length <= 1 ? 'At least one item is required' : 'Remove Line Item'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                        <div className="sm:col-span-4">
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                            Service / Deliverable Title
                          </label>
                          <input
                            type="text"
                            value={item.title}
                            onChange={e => handleItemChange(item.id, 'title', e.target.value)}
                            placeholder="e.g. Enterprise CRM SaaS License"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                            Unit Price ({settings.currencySymbol || 'PKR'})
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={item.unitPrice}
                            onChange={e => handleItemChange(item.id, 'unitPrice', Number(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-medium"
                          />
                        </div>

                        <div className="sm:col-span-1">
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Qty</label>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={e => handleItemChange(item.id, 'quantity', Number(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-white font-mono font-medium text-center"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Discount (PKR)</label>
                          <input
                            type="number"
                            min={0}
                            value={item.discount || 0}
                            onChange={e => handleItemChange(item.id, 'discount', Number(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Line Total</label>
                          <div className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-emerald-400 font-mono font-medium text-right truncate">
                            {settings.currencySymbol || 'Rs.'} {(item.total || 0).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div>
                        <input
                          type="text"
                          value={item.description || ''}
                          onChange={e => handleItemChange(item.id, 'description', e.target.value)}
                          placeholder="Detailed specifications, modules included, or service level details..."
                          className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-1.5 text-[11px] text-slate-300 placeholder-slate-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subtotal & Calculations Summary */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-3 text-xs">
                    <label className="font-semibold text-slate-400">Applicable Sales Tax / GST Rate (%):</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={taxRate}
                      onChange={e => setTaxRate(Number(e.target.value))}
                      className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono font-medium"
                    />
                    <span className="text-slate-500 text-[11px]">(e.g. 0% for IT export, 13% for Sindh PST)</span>
                  </div>

                  <div className="text-right space-y-1 text-xs w-full sm:w-auto">
                    <div className="flex justify-between sm:justify-end gap-6 text-slate-400">
                      <span>Subtotal:</span>
                      <span className="font-mono text-white">{settings.currencySymbol || 'Rs.'} {(subtotal || 0).toLocaleString()}</span>
                    </div>
                    {totalDiscount > 0 && (
                      <div className="flex justify-between sm:justify-end gap-6 text-rose-400">
                        <span>Total Discounts:</span>
                        <span className="font-mono">- {settings.currencySymbol || 'Rs.'} {(totalDiscount || 0).toLocaleString()}</span>
                      </div>
                    )}
                    {taxAmount > 0 && (
                      <div className="flex justify-between sm:justify-end gap-6 text-slate-400">
                        <span>Sales Tax ({taxRate}%):</span>
                        <span className="font-mono text-white">{settings.currencySymbol || 'Rs.'} {(Math.round(taxAmount || 0)).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between sm:justify-end gap-6 text-sm font-medium text-emerald-400 pt-1 border-t border-slate-800">
                      <span>Grand Total:</span>
                      <span className="font-mono text-base">{settings.currencySymbol || 'Rs.'} {(grandTotal || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: PAYMENT SCHEDULE & MILESTONES */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <div>
                      <h3 className="font-bold text-sm text-white">Payment Milestones &amp; Billing Schedule</h3>
                      <p className="text-[11px] text-slate-400">
                        Set structured percentage payments tied to project deliverables.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddMilestone}
                    className="inline-flex items-center gap-1 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Milestone</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {milestones.map(ms => {
                    const computedAmount = Math.round((grandTotal * (ms.percentage || 0)) / 100);
                    return (
                      <div
                        key={ms.id}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800 items-center text-xs"
                      >
                        <div className="sm:col-span-5">
                          <input
                            type="text"
                            value={ms.title}
                            onChange={e => handleMilestoneChange(ms.id, 'title', e.target.value)}
                            placeholder="Milestone Description"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-medium"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={ms.percentage}
                              onChange={e => handleMilestoneChange(ms.id, 'percentage', Number(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono font-medium text-center"
                            />
                            <span className="text-slate-400 font-bold">%</span>
                          </div>
                        </div>

                        <div className="sm:col-span-2">
                          <div className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-emerald-400 font-mono font-medium text-right truncate">
                            {settings.currencySymbol || 'Rs.'} {(computedAmount || 0).toLocaleString()}
                          </div>
                        </div>

                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            value={ms.dueDate || ''}
                            onChange={e => handleMilestoneChange(ms.id, 'dueDate', e.target.value)}
                            placeholder="e.g. On Contract"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                          />
                        </div>

                        <div className="sm:col-span-1 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveMilestone(ms.id)}
                            className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 5: TERMS & SIGNATURE */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                    <FileSignature className="w-4 h-4 text-[#2563EB]" />
                    <h3 className="font-bold text-sm text-white">Commercial Terms &amp; Conditions</h3>
                  </div>
                  <textarea
                    rows={6}
                    value={termsAndConditions}
                    onChange={e => setTermsAndConditions(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-300 font-mono leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                    <UserIcon className="w-4 h-4 text-[#2563EB]" />
                    <h3 className="font-bold text-sm text-white">Authorized Signatory &amp; Representative</h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-400 mb-1">Signatory Name</label>
                      <input
                        type="text"
                        value={signatoryName}
                        onChange={e => setSignatoryName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-400 mb-1">Executive Title</label>
                      <input
                        type="text"
                        value={signatoryTitle}
                        onChange={e => setSignatoryTitle(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-400 mb-1">Assigned Sales Representative</label>
                      <input
                        type="text"
                        readOnly
                        value={assignedRep?.name || 'Sales Representative'}
                        className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 font-semibold"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* A4 LIVE PREVIEW & EXPORT VIEW */
            <div className="space-y-5 max-w-4xl mx-auto">
              {/* Preview Controls Bar */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30 shadow-lg">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-[#2563EB]" />
                    <span>A4 Document Preview</span>
                  </span>

                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 cursor-pointer pl-3 border-l border-slate-800">
                    <input
                      type="checkbox"
                      checked={showLetterheadBg}
                      onChange={e => setShowLetterheadBg(e.target.checked)}
                      className="rounded text-[#2563EB] w-4 h-4"
                    />
                    <span>Render Letterhead Background</span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="inline-flex items-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Copied' : 'Copy Summary'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Send via WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs transition-colors cursor-pointer shadow-md"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print / Save as PDF</span>
                  </button>
                </div>
              </div>

              {/* A4 PRINTABLE DOCUMENT CONTAINER */}
              <div
                ref={printAreaRef}
                id="printable-proposal-document"
                className="bg-white text-slate-900 rounded-xl shadow-2xl p-8 sm:p-12 relative overflow-hidden transition-all print:p-0 print:shadow-none print:rounded-none min-h-[1100px] flex flex-col justify-between"
              >
                {/* Background Graphic Layer */}
                {showLetterheadBg && settings.proposalLetterheadBg && (
                  <div
                    className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-90 print:opacity-100"
                    style={{ backgroundImage: `url(${settings.proposalLetterheadBg})` }}
                  />
                )}

                {/* PROPOSAL HEADER */}
                <div className="relative z-10 space-y-4 pb-6 border-b-2 border-slate-900">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        {settings.companyLogo ? (
                          <img
                            src={settings.companyLogo}
                            alt="Logo"
                            className="h-12 w-auto object-contain"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-[#2563EB] text-white flex items-center justify-center font-medium text-lg">
                            {settings.companyName ? settings.companyName.substring(0, 2).toUpperCase() : 'CRM'}
                          </div>
                        )}
                        <div>
                          <h1 className="text-xl font-medium text-slate-950 tracking-tight leading-none uppercase">
                            {settings.companyName || 'iSysware Enterprise'}
                          </h1>
                          <p className="text-xs font-bold text-[#2563EB] mt-1 uppercase tracking-widest">
                            Enterprise Software &amp; Digital Solutions
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-slate-600 leading-relaxed max-w-md">
                        <p>{settings.companyAddress || 'Suite #402, Business Center, Shahrah-e-Faisal, Karachi'}</p>
                        <p className="font-semibold text-slate-800">{settings.companyTaxId || 'NTN: 8294719-4'}</p>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <div className="inline-block bg-slate-950 text-white px-3 py-1 text-xs font-medium tracking-widest uppercase rounded">
                        COMMERCIAL QUOTATION
                      </div>
                      <p className="font-mono font-medium text-sm text-slate-900">{refNumber}</p>
                      <p className="text-xs text-slate-600 font-medium">Date: {issueDate}</p>
                      <p className="text-xs text-emerald-700 font-bold">Valid Until: {expiryDate}</p>
                    </div>
                  </div>

                  {/* BILL TO & PREPARED BY GRID */}
                  <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200">
                    <div className="space-y-1">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                        PROPOSAL PREPARED FOR:
                      </span>
                      <p className="font-medium text-slate-950 text-sm">{businessName || clientName}</p>
                      <p className="text-xs font-bold text-slate-700">Attn: {clientName}</p>
                      <p className="text-xs text-slate-600">{clientPhone} | {clientEmail}</p>
                      <p className="text-xs text-slate-600">{clientAddress}</p>
                    </div>

                    <div className="space-y-1 text-right">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                        ISSUED BY:
                      </span>
                      <p className="font-medium text-slate-950 text-sm">
                        {assignedRep?.name || currentUser?.name || 'Account Director'}
                      </p>
                      <p className="text-xs text-slate-700">{assignedRep?.email || settings.companyEmail}</p>
                      <p className="text-xs text-slate-600">{settings.companyPhone}</p>
                      <p className="text-xs text-[#2563EB] font-semibold">{settings.companyWebsite}</p>
                    </div>
                  </div>
                </div>

                {/* PROPOSAL BODY CONTENT */}
                <div className="relative z-10 space-y-6 my-6 flex-1">
                  {/* PROJECT TITLE */}
                  <div>
                    <h2 className="text-base font-medium text-slate-900 uppercase tracking-tight">
                      Project: {title}
                    </h2>
                  </div>

                  {/* SCOPE OF WORK */}
                  {scopeOfWork && (
                    <div className="space-y-1.5">
                      <h3 className="text-xs font-medium uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                        1. Scope of Work &amp; System Deliverables
                      </h3>
                      <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed pl-1 font-sans">
                        {scopeOfWork}
                      </div>
                    </div>
                  )}

                  {/* ITEMIZATION TABLE */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-medium uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                      2. Commercial Investment &amp; Itemized Quotation
                    </h3>
                    <div className="border border-slate-300 rounded overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-900 font-medium border-b border-slate-300 uppercase tracking-wider">
                            <th className="py-2.5 px-3 w-8">#</th>
                            <th className="py-2.5 px-3">Service / Deliverable</th>
                            <th className="py-2.5 px-3 text-center w-12">Qty</th>
                            <th className="py-2.5 px-3 text-right w-28">Unit Price ({settings.currency || 'PKR'})</th>
                            <th className="py-2.5 px-3 text-right w-24">Disc.</th>
                            <th className="py-2.5 px-3 text-right w-32">Total ({settings.currency || 'PKR'})</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {items.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 font-bold text-slate-500">{idx + 1}</td>
                              <td className="py-2.5 px-3">
                                <span className="font-medium text-slate-950 block">{item.title}</span>
                                {item.description && (
                                  <span className="text-[11px] text-slate-600 block mt-0.5">{item.description}</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-medium text-center">{item.quantity}</td>
                              <td className="py-2.5 px-3 font-mono text-right">{(item.unitPrice || 0).toLocaleString()}</td>
                              <td className="py-2.5 px-3 font-mono text-right text-rose-600">
                                {item.discount ? `-${(item.discount || 0).toLocaleString()}` : '-'}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-medium text-slate-950 text-right">
                                {(item.total || 0).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-50 border-t border-slate-300">
                            <td colSpan={4} className="py-2 px-3 text-right font-bold text-slate-700">Subtotal:</td>
                            <td colSpan={2} className="py-2 px-3 text-right font-mono font-medium text-slate-900">
                              {settings.currencySymbol || 'Rs.'} {(subtotal || 0).toLocaleString()}
                            </td>
                          </tr>
                          {totalDiscount > 0 && (
                            <tr className="bg-slate-50">
                              <td colSpan={4} className="py-1 px-3 text-right font-bold text-rose-600">Discount:</td>
                              <td colSpan={2} className="py-1 px-3 text-right font-mono font-medium text-rose-600">
                                - {settings.currencySymbol || 'Rs.'} {(totalDiscount || 0).toLocaleString()}
                              </td>
                            </tr>
                          )}
                          {taxAmount > 0 && (
                            <tr className="bg-slate-50">
                              <td colSpan={4} className="py-1 px-3 text-right font-bold text-slate-700">Sales Tax ({taxRate}%):</td>
                              <td colSpan={2} className="py-1 px-3 text-right font-mono font-medium text-slate-900">
                                {settings.currencySymbol || 'Rs.'} {(Math.round(taxAmount || 0)).toLocaleString()}
                              </td>
                            </tr>
                          )}
                          <tr className="bg-slate-900 text-white font-medium text-sm">
                            <td colSpan={4} className="py-2.5 px-3 text-right uppercase tracking-wider">
                              Grand Total Payable ({settings.currency || 'PKR'}):
                            </td>
                            <td colSpan={2} className="py-2.5 px-3 text-right font-mono text-base text-emerald-400">
                              {settings.currencySymbol || 'Rs.'} {(grandTotal || 0).toLocaleString()}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* MILESTONE SCHEDULE */}
                  {computedMilestones && computedMilestones.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-medium uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                        3. Payment Milestones &amp; Delivery Schedule
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {computedMilestones.map(ms => (
                          <div key={ms.id} className="p-2.5 rounded border border-slate-300 bg-slate-50/70 text-xs">
                            <p className="font-medium text-slate-900">{ms.title}</p>
                            <div className="flex justify-between items-baseline mt-1">
                              <span className="font-medium text-[#2563EB] font-mono text-xs">
                                {settings.currencySymbol || 'Rs.'} {(ms.amount || 0).toLocaleString()}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500">{ms.percentage}%</span>
                            </div>
                            {ms.dueDate && (
                              <p className="text-[10px] text-slate-500 mt-1 italic">{ms.dueDate}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TERMS & CONDITIONS */}
                  {termsAndConditions && (
                    <div className="space-y-1">
                      <h3 className="text-xs font-medium uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                        4. Commercial Terms &amp; Conditions
                      </h3>
                      <div className="text-[10px] text-slate-600 whitespace-pre-line leading-relaxed pl-1 font-mono">
                        {termsAndConditions}
                      </div>
                    </div>
                  )}
                </div>

                {/* PROPOSAL FOOTER & SIGNATURE SECTION */}
                <div className="relative z-10 pt-6 border-t-2 border-slate-900 grid grid-cols-2 gap-8 items-end">
                  {/* Client Acceptance Signature */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 block">
                      CLIENT ACCEPTANCE &amp; SIGN-OFF:
                    </span>
                    <div className="h-10 border-b-2 border-dashed border-slate-400" />
                    <div className="text-xs text-slate-700 space-y-0.5">
                      <p className="font-bold">Authorized Signature / Stamp</p>
                      <p className="text-[11px]">For: {businessName || clientName}</p>
                      <p className="text-[10px] text-slate-500">Date: ________________________</p>
                    </div>
                  </div>

                  {/* Company Authorized Signatory */}
                  <div className="space-y-2 text-right">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 block">
                      AUTHORIZED BY {settings.companyName?.toUpperCase() || 'ISYSWARE'}:
                    </span>
                    {signatoryImg ? (
                      <img
                        src={signatoryImg}
                        alt="Signature"
                        className="h-10 object-contain ml-auto"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-10 border-b-2 border-slate-400 w-40 ml-auto" />
                    )}
                    <div className="text-xs text-slate-900">
                      <p className="font-medium">{signatoryName}</p>
                      <p className="text-[11px] text-slate-600 font-semibold">{signatoryTitle}</p>
                      <p className="text-[10px] text-[#2563EB] font-bold">{settings.companyName}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER ACTIONS */}
        <div className="p-4 sm:px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Grand Total:</span>
            <span className="text-base font-mono font-medium text-emerald-400">
              {settings.currencySymbol || 'Rs.'} {(grandTotal || 0).toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 font-mono">({items.length} items)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveProposal}
              disabled={isSaving}
              className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs shadow-md active:scale-98 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Proposal Saved &amp; Logged!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Proposal to Lead</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
