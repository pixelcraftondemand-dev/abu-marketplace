'use client'
import { Truck, ShieldCheck, RotateCcw, CreditCard } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import CurrencyAmount from '@/components/CurrencyAmount'
import { FREE_DELIVERY_THRESHOLD } from '@/lib/paymentOptions'

const TrustStrip = () => {
  const { t } = useTranslation()

  const items = [
    {
      icon: Truck,
      title: t('trust.freeDelivery'),
      subtitle: `${t('trust.over')} ${FREE_DELIVERY_THRESHOLD}`,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      icon: ShieldCheck,
      title: t('trust.qualitySellers'),
      subtitle: t('trust.qualitySellersText'),
      color: 'text-green-600 bg-green-50',
    },
    {
      icon: RotateCcw,
      title: t('trust.easyReturns'),
      subtitle: t('trust.easyReturnsText'),
      color: 'text-amber-600 bg-amber-50',
    },
    {
      icon: CreditCard,
      title: t('trust.securePayment'),
      subtitle: t('trust.securePaymentText'),
      color: 'text-purple-600 bg-purple-50',
    },
  ]

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
      <div className="flex items-center justify-center gap-1 sm:gap-2 lg:gap-4 overflow-x-auto no-scrollbar">
        {items.map((item, i) => (
          <div
            key={item.title}
            className="group flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-200 cursor-default shrink-0"
          >
            <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${item.color} transition-transform duration-200 group-hover:scale-110`}>
              <item.icon size={17} strokeWidth={2} />
            </span>
            <div>
              <p className="font-semibold text-[12px] text-gray-800 leading-tight">{item.title}</p>
              <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{item.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default TrustStrip
