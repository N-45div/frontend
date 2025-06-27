"use client"

import { SolanaWalletProvider } from "@/components/solana-wallet-provider"
import { CCIPTransferForm } from "@/components/ccip-transfer-form"

export default function CCIPTransferPage() {
  return (
    <SolanaWalletProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">Cross-Chain Token Transfer</h1>
            <p className="text-xl text-gray-300">
              Send tokens from Solana Devnet to Ethereum Sepolia using Chainlink CCIP
            </p>
          </div>
          <CCIPTransferForm />
        </div>
      </div>
    </SolanaWalletProvider>
  )
}
