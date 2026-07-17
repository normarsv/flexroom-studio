'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClock, faTag, faChevronDown } from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import { Package } from '@/types'
import { CLASS_TYPE_LABELS } from '@/lib/constants'
import { toast } from 'sonner'

interface Props {
  packages: Package[]
  locale: string
  userId: string | null
}

interface AppliedCoupon {
  id: string
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  description: string | null
}

export default function PackagesList({ packages, locale, userId }: Props) {
  const t = useTranslations('packages')
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function handleBuy(pkg: Package, couponCode?: string) {
    if (!userId) return
    setLoadingId(pkg.id)
    try {
      const res = await fetch('/api/packages/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: pkg.id, locale, couponCode }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error('Error al iniciar pago')
      }
    } catch {
      toast.error('Error al iniciar pago')
    } finally {
      setLoadingId(null)
    }
  }

  // Group packages by category for display
  const singles = packages.filter((p) => p.session_count === 1)
  const multi = packages.filter((p) => p.session_count !== 1 && p.session_count !== null)
  const unlimited = packages.filter((p) => p.session_count === null)

  const PackageCard = ({ pkg }: { pkg: Package }) => {
    const name = locale === 'es' ? pkg.name_es : pkg.name_en
    const desc = locale === 'es' ? pkg.description_es : pkg.description_en
    const isPremium = pkg.session_count === null

    const [showCoupon, setShowCoupon] = useState(false)
    const [couponInput, setCouponInput] = useState('')
    const [couponLoading, setCouponLoading] = useState(false)
    const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null)
    const [couponError, setCouponError] = useState<string | null>(null)

    function computeDiscountedPrice(): number {
      if (!appliedCoupon) return pkg.price_mxn
      if (appliedCoupon.discount_type === 'percentage') {
        return Math.round(pkg.price_mxn * (1 - appliedCoupon.discount_value / 100))
      }
      return Math.max(0, pkg.price_mxn - appliedCoupon.discount_value)
    }

    async function handleApplyCoupon() {
      if (!couponInput.trim()) return
      setCouponLoading(true)
      setCouponError(null)
      setAppliedCoupon(null)
      try {
        const res = await fetch('/api/coupons/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: couponInput.trim(),
            context: 'packages',
            userId,
          }),
        })
        const data = await res.json()
        if (data.valid) {
          setAppliedCoupon(data.coupon)
          toast.success('¡Cupón aplicado!')
        } else {
          setCouponError(data.error || 'Cupón no válido')
        }
      } catch {
        setCouponError('Error al validar el cupón')
      } finally {
        setCouponLoading(false)
      }
    }

    const discountedPrice = computeDiscountedPrice()

    return (
      <div className={`bg-card rounded-2xl border shadow-sm p-6 flex flex-col ${isPremium ? 'border-[#F4EF71] ring-2 ring-[#F4EF71]/30' : 'border-border'}`}>
        {isPremium && (
          <span className="self-start text-xs font-bold uppercase tracking-widest bg-[#F4EF71] text-[#1E1E1E] px-2 py-0.5 rounded-full mb-3">
            Premium
          </span>
        )}
        <h3 className="font-heading font-bold text-foreground text-lg leading-tight mb-1">{name}</h3>

        {appliedCoupon ? (
          <div className="mt-2 mb-1">
            <p className="text-3xl font-extrabold text-foreground">
              ${discountedPrice.toLocaleString('es-MX')}
              <span className="text-sm font-normal text-muted-foreground ml-1">MXN</span>
            </p>
            <p className="text-sm text-muted-foreground line-through">
              ${pkg.price_mxn.toLocaleString('es-MX')} MXN
            </p>
          </div>
        ) : (
          <p className="text-3xl font-extrabold text-foreground mt-2 mb-1">
            ${pkg.price_mxn.toLocaleString('es-MX')}
            <span className="text-sm font-normal text-muted-foreground ml-1">MXN</span>
          </p>
        )}

        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
          <FontAwesomeIcon icon={faClock} className="w-3 h-3" />
          {t('validity', { days: pkg.validity_days })}
        </div>

        <p className="text-sm text-muted-foreground mb-4 flex-1">{desc}</p>

        {pkg.allowed_class_types && pkg.allowed_class_types.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-foreground mb-1">{t('includes')}:</p>
            <div className="flex flex-wrap gap-1">
              {pkg.allowed_class_types.map((type) => (
                <span key={type} className="text-xs bg-secondary text-foreground px-2 py-0.5 rounded-full">
                  {locale === 'es' ? CLASS_TYPE_LABELS[type].es : CLASS_TYPE_LABELS[type].en}
                </span>
              ))}
            </div>
          </div>
        )}

        {userId ? (
          <div className="mt-auto space-y-2">
            <Button
              onClick={() => handleBuy(pkg, appliedCoupon?.code)}
              disabled={loadingId === pkg.id}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loadingId === pkg.id ? 'Procesando...' : t('buy')}
            </Button>

            {/* Coupon section */}
            <button
              onClick={() => setShowCoupon((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center"
            >
              <FontAwesomeIcon icon={faTag} className="w-3 h-3" />
              ¿Tienes un cupón?
              <FontAwesomeIcon
                icon={faChevronDown}
                className={`w-3 h-3 transition-transform ${showCoupon ? 'rotate-180' : ''}`}
              />
            </button>

            {showCoupon && (
              <div className="space-y-2">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-[#F4EF71]/20 border border-[#F4EF71] rounded-lg px-3 py-2">
                    <div>
                      <p className="text-xs font-bold text-foreground">{appliedCoupon.code}</p>
                      <p className="text-xs text-muted-foreground">
                        {appliedCoupon.discount_type === 'percentage'
                          ? `${appliedCoupon.discount_value}% de descuento`
                          : `$${appliedCoupon.discount_value} MXN de descuento`}
                      </p>
                    </div>
                    <button
                      onClick={() => { setAppliedCoupon(null); setCouponInput('') }}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      Quitar
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="CÓDIGO"
                      className="flex-1 px-3 py-1.5 rounded-lg border border-border text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary/30"
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                    />
                    <Button
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponInput.trim()}
                      variant="outline"
                      className="text-sm shrink-0"
                    >
                      {couponLoading ? '...' : 'Aplicar'}
                    </Button>
                  </div>
                )}
                {couponError && (
                  <p className="text-xs text-destructive">{couponError}</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <Link href={`/${locale}/login`}>
            <Button variant="outline" className="w-full mt-auto">
              {t('login_to_buy')}
            </Button>
          </Link>
        )}
      </div>
    )
  }

  const Section = ({ title, pkgs }: { title: string; pkgs: Package[] }) => {
    if (pkgs.length === 0) return null
    return (
      <div className="mb-12">
        <h2 className="font-heading font-extrabold text-xl text-foreground mb-5">{title}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pkgs.map((pkg) => <PackageCard key={pkg.id} pkg={pkg} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-10">
        <h1 className="font-heading font-extrabold text-3xl text-foreground">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
      </div>

      <Section title={locale === 'es' ? 'Sesiones individuales' : 'Single sessions'} pkgs={singles} />
      <Section title={locale === 'es' ? 'Paquetes' : 'Packages'} pkgs={multi} />
      <Section title={locale === 'es' ? 'Acceso ilimitado' : 'Unlimited access'} pkgs={unlimited} />
    </div>
  )
}
