"use client"

import { useState, useEffect } from "react"

export function useWallet() {
  const [isConnected, setIsConnected] = useState(false)
  const [address, setAddress] = useState<string | null>(null)

  const connect = async () => {
    try {
      // Mock wallet connection
      const mockAddress = "0x742d35Cc6634C0532925a3b8D4C9db96590c6C87"
      setAddress(mockAddress)
      setIsConnected(true)
      if (typeof window !== "undefined") {
        localStorage.setItem("wallet_connected", "true")
        localStorage.setItem("wallet_address", mockAddress)
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error)
    }
  }

  const disconnect = () => {
    setIsConnected(false)
    setAddress(null)
    if (typeof window !== "undefined") {
      localStorage.removeItem("wallet_connected")
      localStorage.removeItem("wallet_address")
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      const connected = localStorage.getItem("wallet_connected")
      const savedAddress = localStorage.getItem("wallet_address")
      if (connected && savedAddress) {
        setIsConnected(true)
        setAddress(savedAddress)
      }
    }
  }, [])

  return { isConnected, address, connect, disconnect }
}
