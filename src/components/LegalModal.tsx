import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  FileText, 
  Lock, 
  Database, 
  CheckCircle2, 
  ExternalLink, 
  Building2, 
  Scale, 
  UserCheck,
  ChevronRight,
  Download,
  Eye,
  Info
} from 'lucide-react';
import { LEGAL_DOCS, LegalDocument } from '../data/legal/legalDocs';

interface LegalModalProps {
  isOpen: boolean;
  initialDocId?: string;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  initialDocId = 'terms-of-service',
  onClose
}) => {
  const [selectedDocId, setSelectedDocId] = useState<string>(initialDocId);
  const [copiedNotification, setCopiedNotification] = useState(false);

  if (!isOpen) return null;

  const currentDoc: LegalDocument = LEGAL_DOCS.find(d => d.id === selectedDocId) || LEGAL_DOCS[0];

  const handleDownload = () => {
    const textContent = `
================================================================================
${currentDoc.title}
Effective Date: ${currentDoc.effectiveDate} | Version: ${currentDoc.version}
Jurisdiction: Republic of Sierra Leone
Platform: ABU Marketplace
================================================================================

${currentDoc.sections.map(s => `
[${s.heading}]
${s.content}
${s.bullets ? s.bullets.map(b => `  • ${b}`).join('\n') : ''}
`).join('\n\n')}
    `.trim();

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentDoc.slug}-abu-marketplace.txt`;
    link.click();
    URL.revokeObjectURL(url);

    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="bg-[#002541] px-5 py-4 text-white flex items-center justify-between shrink-0 border-b border-[#144b77]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#082d49] border border-[#144b77] flex items-center justify-center text-[#8df7c1]">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-tight text-white">
                  Legal & Trust Center
                </h3>
                <span className="text-[10px] font-semibold bg-[#8df7c1]/20 text-[#8df7c1] px-2 py-0.5 rounded border border-[#8df7c1]/30">
                  Sierra Leone Standard
                </span>
              </div>
              <p className="text-xs text-[#7fa6d0]">
                Governed under the laws of Sierra Leone · Buyer Inspection Guarantee
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#082d49] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Left Doc Selector + Right Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Navigation Sidebar */}
          <div className="w-full md:w-64 bg-gray-50 border-r border-gray-200 p-3 sm:p-4 shrink-0 overflow-y-auto">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2 px-2">
              Official Documents
            </span>
            <div className="space-y-1">
              {LEGAL_DOCS.map((doc) => {
                const isActive = doc.id === currentDoc.id;
                return (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDocId(doc.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                      isActive 
                        ? 'bg-[#002541] text-white shadow-xs' 
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {doc.category === 'privacy' ? (
                        <Lock className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#8df7c1]' : 'text-gray-400'}`} />
                      ) : doc.category === 'merchant' ? (
                        <Building2 className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#8df7c1]' : 'text-gray-400'}`} />
                      ) : (
                        <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#8df7c1]' : 'text-gray-400'}`} />
                      )}
                      <span className="truncate">{doc.title.split('&')[0].trim()}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#8df7c1] shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Buyer Guarantee Badge Box */}
            <div className="mt-6 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Buyer Inspection Guarantee</span>
              </div>
              <p className="text-[11px] text-emerald-700 mt-1 leading-snug">
                Every order comes with mandatory on-arrival physical inspection before payment.
              </p>
            </div>
          </div>

          {/* Document Content View */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* Header info */}
            <div className="border-b border-gray-200 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 leading-tight">
                    {currentDoc.title}
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    {currentDoc.shortDescription}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-semibold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full border border-gray-200">
                    v{currentDoc.version}
                  </span>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#002541] text-white hover:bg-[#082d49] transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export</span>
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-gray-400 mt-3">
                <span>Effective: {currentDoc.effectiveDate}</span>
                <span>•</span>
                <span>Jurisdiction: Freetown, Sierra Leone</span>
              </div>
            </div>

            {/* Notification */}
            {copiedNotification && (
              <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-lg text-xs border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Legal document downloaded as text format.</span>
              </div>
            )}

            {/* Document Sections */}
            <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
              {currentDoc.sections.map((section, idx) => (
                <section key={idx} className="space-y-2">
                  <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#002541]"></span>
                    {section.heading}
                  </h4>
                  <p className="text-gray-600 text-xs sm:text-sm pl-3.5">
                    {section.content}
                  </p>
                  {section.bullets && section.bullets.length > 0 && (
                    <ul className="list-disc list-inside space-y-1.5 pl-5 text-xs text-gray-600">
                      {section.bullets.map((bullet, bIdx) => (
                        <li key={bIdx} className="leading-relaxed">
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-[#002541]" />
            <span>Open-source standard legal documentation compliant with Sierra Leone commerce law.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#002541] text-white rounded-lg font-semibold hover:bg-[#082d49] transition-colors cursor-pointer"
          >
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
};
