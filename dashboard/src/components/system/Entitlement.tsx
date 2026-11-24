'use client'

/**
 * Who the reader is, for every signed-in workspace.
 *
 * These facts used to live inside the old terminal shell, which is why the
 * one route that needed them could not move to the workbench: porting the page
 * meant either losing the session gate or duplicating it. Neither is
 * acceptable, so the concern is extracted instead.
 *
 * It carries only what genuinely depends on the session:
 *
 *  - the gate that waits for the identity provider to resolve, so a research
 *    run is never sent before its session token exists
 *  - the profile sync that runs once per browser session on first login
 *  - notifications
 *
 * Everything else the old shell carried — header, navigation, keyboard,
 * palette — already exists once in the workbench, and is deliberately not
 * recreated here.
 *
 * The gate is not a spinner over the whole application. A workspace that does
 * not read entitlement renders immediately; only a consumer of `useEntitlement`
 * sees `resolved: false`, and it is that consumer's job to say so honestly
 * rather than guess.
 */

import { useAuth, useUser } from '@clerk/nextjs'
import {
  createContext, useContext, useEffect, useMemo,
  type ReactNode,
} from 'react'

import Toasts from '@/components/ui/Toasts'
import { clearAuthSession, configureAuthSession, syncProfile } from '@/lib/persistence'

export interface EntitlementValue {
  /**
   * False while the identity provider is still resolving. Research waits for
   * it, because every run is an authenticated request.
   *
   * Every feature is open to every signed-in reader: there is no paid tier,
   * no daily limit and nothing here to upgrade.
   */
  resolved: boolean
}

const Ctx = createContext<EntitlementValue | null>(null)

export function EntitlementProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser()
  const {
    getToken,
    isLoaded: isAuthLoaded,
    isSignedIn,
    sessionId,
    userId,
  } = useAuth()
  // API modules cannot call React hooks. Register Clerk's supported token
  // accessor once it has resolved. authFetch waits for this registration, so
  // a child effect cannot race Clerk. This removes the old dependency on an
  // undocumented window.Clerk global.
  useEffect(() => {
    if (!isAuthLoaded) return
    configureAuthSession({
      scope: sessionId ?? userId ?? null,
      getToken: isSignedIn ? getToken : async () => null,
    })
    return () => {
      clearAuthSession()
    }
  }, [getToken, isAuthLoaded, isSignedIn, sessionId, userId])

  // Best-effort, once per browser session. A failure here changes nothing the
  // reader can see, so it is not surfaced.
  useEffect(() => {
    if (!isLoaded || !user) return
    try {
      if (sessionStorage.getItem('omni-profile-synced')) return
      sessionStorage.setItem('omni-profile-synced', '1')
    } catch {
      /* private mode: sync every visit, which is a harmless upsert */
    }
    void syncProfile({
      email: user.primaryEmailAddress?.emailAddress ?? undefined,
      full_name: user.fullName ?? undefined,
      avatar_url: user.imageUrl ?? undefined,
    })
  }, [isLoaded, user])

  const value = useMemo<EntitlementValue>(() => ({ resolved: isLoaded }), [isLoaded])

  return (
    <Ctx.Provider value={value}>
      <Toasts />
      {children}
    </Ctx.Provider>
  )
}

/**
 * Outside a provider this reports unresolved rather than throwing. A workspace
 * rendered in isolation — a test, a story — should not crash, and reporting
 * `resolved: false` is the honest description of a page that cannot see a
 * session at all.
 */
export function useEntitlement(): EntitlementValue {
  return useContext(Ctx) ?? { resolved: false }
}
