"use client"
import React from 'react'
import { useSelector } from 'react-redux'
import { formatPrice, getLocaleForLanguage, DEFAULT_CURRENCY } from '@/lib/utils/currency'
import useExchangeRate from '@/lib/hooks/useExchangeRate'

export default function CurrencyAmount({ amount = 0, className = '' }) {
  const selectedCurrency = useSelector((state) => state.preferences.selectedCurrency)
  const selectedLanguage = useSelector((state) => state.preferences.selectedLanguage)
  const locale = getLocaleForLanguage(selectedLanguage)
  const { rate } = useExchangeRate(DEFAULT_CURRENCY, selectedCurrency)

  if (amount == null) return <span className={className}></span>

  const num = Number(amount)
  // Canonical amount is USD. Convert for display only; the backend always
  // recalculates authoritative totals from canonical prices.
  const converted = rate != null ? num * rate : num

  return <span className={className}>{formatPrice(converted, selectedCurrency, locale)}</span>
}
