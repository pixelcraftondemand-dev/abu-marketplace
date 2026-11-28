import React from 'react';
import { ShoppingBag, Wrench, Store, Check, type LucideIcon } from 'lucide-react';
import type { VisitorIntent } from '../types';

interface IntentOption {
  id: VisitorIntent;
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export const INTENT_OPTIONS: IntentOption[] = [
  {
    id: 'buyer',
    label: 'Buying',
    title: 'Shop products',
    description: 'Browse verified sellers, compare prices, save favourites and track deliveries.',
    icon: ShoppingBag,
  },
  {
    id: 'service',
    label: 'Services',
    title: 'Hire services',
    description: 'Find certified artisans and technicians, compare rates and book a visit.',
    icon: Wrench,
  },
  {
    id: 'seller',
    label: 'Selling',
    title: 'Sell on ABU',
    description: 'Open a store, list products or offer a service to shoppers across Sierra Leone.',
    icon: Store,
  },
];

/** Compact switcher shown in the page once a visitor has chosen an experience. */
export const IntentSwitcher: React.FC<{
  intent: VisitorIntent;
  onSelect: (intent: VisitorIntent) => void;
}> = ({ intent, onSelect }) => (
  <div className="max-w-[1440px] mx-auto w-full px-3 sm:px-6 pt-2">
    <div
      role="group"
      aria-label="Marketplace experience"
      className="flex items-center gap-1 rounded-lg border border-[#E7ECF0] bg-white px-2 py-1.5 shadow-2xs dark:border-[#1E2E3D] dark:bg-[#111D27]"
    >
      <span className="hidden pl-1 pr-1.5 text-[10px] font-bold uppercase tracking-wider text-[#5A6872] dark:text-slate-400 sm:inline">
        Experience
      </span>
      {INTENT_OPTIONS.map((option) => {
        const Icon = option.icon;
        const isActive = intent === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            aria-pressed={isActive}
            className={`flex h-7 flex-1 items-center justify-center gap-1.5 rounded px-2 text-[11px] font-bold transition-colors cursor-pointer sm:flex-none ${
              isActive
                ? 'bg-[#0B3B60] text-white dark:bg-[#00875A]'
                : 'text-[#5A6872] hover:bg-[#F4F6F8] hover:text-[#1A242D] dark:text-slate-400 dark:hover:bg-[#1E2E3D] dark:hover:text-white'
            }`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {option.label}
          </button>
        );
      })}
      <span className="ml-auto hidden pr-1 text-[10px] text-[#8A98A5] dark:text-slate-500 md:inline">
        Switch anytime
      </span>
    </div>
  </div>
);

/**
 * First-visit chooser. Picking an experience tailors the marketplace: buyers get the
 * shopfront, service seekers land in the artisan directory, and only the selling
 * experience exposes store/listing tools.
 */
export const IntentChooser: React.FC<{
  isOpen: boolean;
  intent: VisitorIntent | null;
  onChoose: (intent: VisitorIntent) => void;
}> = ({ isOpen, intent, onChoose }) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#002541]/60 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="intent-chooser-title"
    >
      <div className="w-full max-w-2xl rounded-xl border border-[#E7ECF0] bg-white p-4 shadow-2xl dark:border-[#1E2E3D] dark:bg-[#111D27] sm:p-6">
        <div className="mb-4 text-center">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#00875A] dark:text-[#8df7c1]">
            Welcome to ABU Marketplace
          </span>
          <h2
            id="intent-chooser-title"
            className="mt-1 text-lg font-extrabold tracking-tight text-[#1A242D] dark:text-white sm:text-xl"
          >
            How do you want to use ABU?
          </h2>
          <p className="mt-1 text-xs text-[#5A6872] dark:text-slate-400">
            Pick an experience to tailor the marketplace. You can switch at any time.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {INTENT_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isCurrent = intent === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onChoose(option.id)}
                className={`group relative flex flex-col items-start gap-2 rounded-lg border p-3.5 text-left transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${
                  isCurrent
                    ? 'border-[#00875A] bg-[#F0FBF6] dark:border-[#00875A] dark:bg-[#0E2A22]'
                    : 'border-[#E7ECF0] bg-white hover:border-[#0B3B60] dark:border-[#1E2E3D] dark:bg-[#0E1720] dark:hover:border-[#38BDF8]'
                }`}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0B3B60] text-white dark:bg-[#00875A]">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-sm font-extrabold text-[#1A242D] dark:text-white">
                  {option.title}
                </span>
                <span className="text-[11px] leading-relaxed text-[#5A6872] dark:text-slate-400">
                  {option.description}
                </span>
                {isCurrent && (
                  <Check
                    className="absolute right-2.5 top-2.5 h-4 w-4 text-[#00875A] dark:text-[#8df7c1]"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-center text-[10px] text-[#8A98A5] dark:text-slate-500">
          Selling tools appear only in the Selling experience.
        </p>
      </div>
    </div>
  );
};
