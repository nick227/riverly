import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useSession } from './session'

export type SubscriptionPlan = 'free' | 'premium'
export type BillingCycle = 'monthly' | 'annual'

/** Premium pricing in USD. Annual is billed once a year at the per-month rate x 12. */
export const PREMIUM_PRICE: Record<BillingCycle, { perMonth: number; billed: number }> = {
  monthly: { perMonth: 29, billed: 29 },
  annual: { perMonth: 8, billed: 96 },
}
export const ANNUAL_SAVINGS_PERCENT = Math.round((1 - PREMIUM_PRICE.annual.perMonth / PREMIUM_PRICE.monthly.perMonth) * 100)
export const ANNUAL_SAVINGS_AMOUNT = PREMIUM_PRICE.monthly.perMonth * 12 - PREMIUM_PRICE.annual.billed

export interface PaymentDetails {
  brand: 'visa' | 'mastercard' | 'amex' | 'discover' | 'generic'
  last4: string
  expMonth: string
  expYear: string
  paidAt: string
  amount: number
  currency: string
  stripePaymentIntentId?: string
  receiptEmail?: string
}

export interface SubscriptionState {
  plan: SubscriptionPlan
  billingCycle: BillingCycle
  status: 'active' | 'trialing' | 'canceled'
  paymentDetails: PaymentDetails | null
  isUpgradeModalOpen: boolean
  upgradeModalSource: string
  isPostRegistration: boolean
}

interface SubscriptionContextValue extends SubscriptionState {
  isPremium: boolean
  features: {
    crm: boolean
    emailServices: boolean
    aiAutomations: boolean
    dataReports: boolean
    liveBroadcasting: boolean
  }
  openUpgradeModal: (source?: string, isPostReg?: boolean) => void
  closeUpgradeModal: () => void
  upgradeToPremium: (payment: PaymentDetails, cycle?: BillingCycle) => void
  downgradeToFree: () => void
  setBillingCycle: (cycle: BillingCycle) => void
}

const STORAGE_PREFIX = 'riverly_subscription_'

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null)

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { me, org } = useSession()
  const storageKey = org?.id ? `${STORAGE_PREFIX}${org.id}` : me?.id ? `${STORAGE_PREFIX}${me.id}` : 'riverly_subscription_default'

  const [state, setState] = useState<SubscriptionState>(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        return {
          plan: parsed.plan ?? 'free',
          billingCycle: parsed.billingCycle ?? 'annual',
          status: parsed.status ?? 'active',
          paymentDetails: parsed.paymentDetails ?? null,
          isUpgradeModalOpen: false,
          upgradeModalSource: 'default',
          isPostRegistration: false,
        }
      }
    } catch (e) {
      console.warn('Failed to parse subscription from storage', e)
    }
    return {
      plan: 'free',
      billingCycle: 'annual',
      status: 'active',
      paymentDetails: null,
      isUpgradeModalOpen: false,
      upgradeModalSource: 'default',
      isPostRegistration: false,
    }
  })

  // Re-sync if organization changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        setState((prev) => ({
          ...prev,
          plan: parsed.plan ?? 'free',
          billingCycle: parsed.billingCycle ?? 'annual',
          status: parsed.status ?? 'active',
          paymentDetails: parsed.paymentDetails ?? null,
        }))
      }
    } catch {
      // ignore
    }
  }, [storageKey])

  // Save changes to localStorage
  const persistState = (newState: Partial<SubscriptionState>) => {
    setState((prev) => {
      const updated = { ...prev, ...newState }
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            plan: updated.plan,
            billingCycle: updated.billingCycle,
            status: updated.status,
            paymentDetails: updated.paymentDetails,
          }),
        )
      } catch (err) {
        console.warn('Could not persist subscription', err)
      }
      return updated
    })
  }

  const openUpgradeModal = (source = 'direct', isPostReg = false) => {
    setState((prev) => ({
      ...prev,
      isUpgradeModalOpen: true,
      upgradeModalSource: source,
      isPostRegistration: isPostReg,
    }))
  }

  const closeUpgradeModal = () => {
    setState((prev) => ({
      ...prev,
      isUpgradeModalOpen: false,
      isPostRegistration: false,
    }))
  }

  const upgradeToPremium = (payment: PaymentDetails, cycle?: BillingCycle) => {
    persistState({
      plan: 'premium',
      status: 'active',
      billingCycle: cycle ?? state.billingCycle,
      paymentDetails: payment,
      isUpgradeModalOpen: false,
    })
  }

  const downgradeToFree = () => {
    persistState({
      plan: 'free',
      status: 'active',
      paymentDetails: null,
    })
  }

  const setBillingCycle = (cycle: BillingCycle) => {
    persistState({ billingCycle: cycle })
  }

  const isPremium = state.plan === 'premium'

  const value: SubscriptionContextValue = {
    ...state,
    isPremium,
    features: {
      crm: true, // Free always has CRM
      emailServices: isPremium,
      aiAutomations: isPremium,
      dataReports: isPremium,
      liveBroadcasting: isPremium,
    },
    openUpgradeModal,
    closeUpgradeModal,
    upgradeToPremium,
    downgradeToFree,
    setBillingCycle,
  }

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
}

const DEFAULT_SUBSCRIPTION_VALUE: SubscriptionContextValue = {
  plan: 'free',
  billingCycle: 'annual',
  status: 'active',
  paymentDetails: null,
  isUpgradeModalOpen: false,
  upgradeModalSource: 'default',
  isPostRegistration: false,
  isPremium: false,
  features: {
    crm: true,
    emailServices: false,
    aiAutomations: false,
    dataReports: false,
    liveBroadcasting: false,
  },
  openUpgradeModal: () => {},
  closeUpgradeModal: () => {},
  upgradeToPremium: () => {},
  downgradeToFree: () => {},
  setBillingCycle: () => {},
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext)
  return ctx ?? DEFAULT_SUBSCRIPTION_VALUE
}
