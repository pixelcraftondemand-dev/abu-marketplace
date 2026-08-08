import { redirect } from 'next/navigation'
import { defaultLocale } from '@/lib/utils/locale'

export default function HomeRedirect() {
  redirect(`/${defaultLocale}`)
}
