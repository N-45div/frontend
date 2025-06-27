/**
 * Unified Configuration Module for CCIP
 * Based on the provided configuration files
 */

import { PublicKey, Connection, SystemProgram } from "@solana/web3.js"
import { NATIVE_MINT } from "@solana/spl-token"

/**
 * Supported Chain IDs for CCIP operations
 */
export enum ChainId {
  ETHEREUM_SEPOLIA = "ethereum-sepolia",
  BASE_SEPOLIA = "base-sepolia",
  OPTIMISM_SEPOLIA = "optimism-sepolia",
  BSC_TESTNET = "bsc-testnet",
  ARBITRUM_SEPOLIA = "arbitrum-sepolia",
  SOLANA_DEVNET = "solana-devnet",
  SONIC_BLAZE = "sonic-blaze",
}

/**
 * Chain selectors used to identify chains in CCIP
 */
export const CHAIN_SELECTORS: Record<ChainId, bigint> = {
  [ChainId.ETHEREUM_SEPOLIA]: BigInt("16015286601757825753"),
  [ChainId.BASE_SEPOLIA]: BigInt("10344971235874465080"),
  [ChainId.OPTIMISM_SEPOLIA]: BigInt("5224473277236331295"),
  [ChainId.BSC_TESTNET]: BigInt("13264668187771770619"),
  [ChainId.ARBITRUM_SEPOLIA]: BigInt("3478487238524512106"),
  [ChainId.SOLANA_DEVNET]: BigInt("16423721717087811551"),
  [ChainId.SONIC_BLAZE]: BigInt("3676871237479449268"),
}

/**
 * Fee token types supported by CCIP
 */
export enum FeeTokenType {
  NATIVE = "native",
  WRAPPED_NATIVE = "wrapped-native",
  LINK = "link",
}

/**
 * Solana Chain Configuration
 */
export interface SVMChainConfig {
  id: ChainId
  name: string
  connection: Connection
  routerProgramId: PublicKey
  feeQuoterProgramId: PublicKey
  rmnRemoteProgramId: PublicKey
  bnmTokenMint: PublicKey
  linkTokenMint: PublicKey
  wrappedNativeMint: PublicKey
  explorerUrl: string
  nativeSol: PublicKey
  systemProgramId: PublicKey
  receiverProgramId: PublicKey
}

const DEFAULT_SOLANA_DEVNET_RPC_URL = "https://api.devnet.solana.com"

/**
 * Solana Chain Configurations
 */
const SVM_CONFIGS: Record<ChainId.SOLANA_DEVNET, SVMChainConfig> = {
  [ChainId.SOLANA_DEVNET]: {
    id: ChainId.SOLANA_DEVNET,
    name: "Solana Devnet",
    connection: new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || DEFAULT_SOLANA_DEVNET_RPC_URL, {
      commitment: "confirmed",
    }),
    routerProgramId: new PublicKey("Ccip842gzYHhvdDkSyi2YVCoAWPbYJoApMFzSxQroE9C"),
    // Correct 32-byte public key from the source config
    feeQuoterProgramId: new PublicKey("FeeQPGkKDeRV1MgoYfMH6L8o3KeuYjwUZrgn4LRKfjHi"),
    rmnRemoteProgramId: new PublicKey("RmnXLft1mSEwDgMKu2okYuHkiazxntFFcZFrrcXxYg7"),
    bnmTokenMint: new PublicKey("3PjyGzj1jGVgHSKS4VR1Hr1memm63PmN8L9rtPDKwzZ6"),
    linkTokenMint: new PublicKey("LinkhB3afbBKb2EQQu7s7umdZceV3wcvAUJhQAfQ23L"),
    wrappedNativeMint: NATIVE_MINT,
    explorerUrl: "https://explorer.solana.com/tx/",
    nativeSol: PublicKey.default,
    systemProgramId: SystemProgram.programId,
    receiverProgramId: new PublicKey("BqmcnLFSbKwyMEgi7VhVeJCis1wW26VySztF34CJrKFq"),
  },
}

/**
 * CCIP Message Configuration
 */
export interface CCIPMessageConfig {
  destinationChain: ChainId
  destinationChainSelector: string
  evmReceiverAddress: string
  tokenAmounts: Array<{
    tokenMint: string
    amount: string
  }>
  feeToken: FeeTokenType
  messageData: string
  extraArgs: {
    gasLimit: number
    allowOutOfOrderExecution: boolean
  }
}

/**
 * Get Solana chain configuration by chain ID
 */
export function getCCIPSVMConfig(chainId: ChainId): SVMChainConfig {
  if (chainId !== ChainId.SOLANA_DEVNET) {
    throw new Error(`Unsupported SVM chain ID: ${chainId}`)
  }
  return SVM_CONFIGS[chainId]
}

/**
 * Get SVM fee token based on config and token type
 */
export function getSVMFeeToken(config: SVMChainConfig, feeTokenType?: string): PublicKey {
  if (!feeTokenType) {
    return PublicKey.default // Default to native SOL
  }

  switch (feeTokenType.toLowerCase()) {
    case FeeTokenType.NATIVE:
      return PublicKey.default
    case FeeTokenType.WRAPPED_NATIVE:
      return config.wrappedNativeMint
    case FeeTokenType.LINK:
      return config.linkTokenMint
    default:
      // Try to parse as a public key
      try {
        return new PublicKey(feeTokenType)
      } catch {
        return PublicKey.default // Default to native SOL if not recognized
      }
  }
}

/**
 * Get explorer URL for a transaction hash
 */
export function getExplorerUrl(chainId: ChainId, txHash: string): string {
  if (chainId === ChainId.SOLANA_DEVNET) {
    const baseUrl = SVM_CONFIGS[ChainId.SOLANA_DEVNET].explorerUrl
    const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
    return `${normalizedBaseUrl}${txHash}?cluster=devnet`
  }
  throw new Error(`No explorer URL available for chain ID: ${chainId}`)
}
