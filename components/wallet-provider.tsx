"use client"

import type { ReactNode } from "react"

// Simple wrapper component that doesn't use context
export function WalletProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}
