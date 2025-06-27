/**
 * CCIP Utility Functions
 */

import { PublicKey } from "@solana/web3.js"
import { type CCIPMessageConfig, ChainId, getCCIPSVMConfig, getSVMFeeToken } from "./ccip-config"

/**
 * Token transfer configuration
 */
export interface TokenTransfer {
  tokenMint: string
  amount: string
}

/**
 * Script configuration
 */
export interface ScriptConfig {
  computeUnits: number
  minSolRequired: number
  defaultExtraArgs: {
    gasLimit: number
    allowOutOfOrderExecution: boolean
  }
}

/**
 * Command line options
 */
export interface CCIPOptions {
  tokenAmounts?: TokenTransfer[]
  feeToken?: string
  logLevel?: string
  skipPreflight?: boolean
}

/**
 * Executor options
 */
export interface ExecutorOptions {
  scriptName: string
  usageName: string
  messageConfig: CCIPMessageConfig
  scriptConfig: ScriptConfig
  cmdOptions: CCIPOptions
}

/**
 * Validates a Solana public key
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address)
    return true
  } catch {
    return false
  }
}

/**
 * Validates an Ethereum address
 */
export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

/**
 * Formats token amount for display
 */
export function formatTokenAmount(amount: string, decimals = 9): string {
  const numAmount = Number.parseFloat(amount)
  if (isNaN(numAmount)) return "0"

  const divisor = Math.pow(10, decimals)
  const formatted = (numAmount / divisor).toFixed(6)

  // Remove trailing zeros
  return Number.parseFloat(formatted).toString()
}

/**
 * Converts human-readable amount to raw token amount
 */
export function toRawTokenAmount(amount: string, decimals = 9): string {
  const numAmount = Number.parseFloat(amount)
  if (isNaN(numAmount)) return "0"

  const multiplier = Math.pow(10, decimals)
  return Math.floor(numAmount * multiplier).toString()
}

/**
 * Mock CCIP transfer execution
 */
export async function executeCCIPTransfer(config: CCIPMessageConfig): Promise<string> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // Generate mock transaction hash
  const mockTxHash = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")

  return mockTxHash
}

/**
 * Print usage information
 */
export function printUsage(scriptName: string): void {
  console.log(`\nUsage: ${scriptName} [options]\n`)
  console.log("Options:")
  console.log("  --fee-token <token>           Fee token type: native, wrapped-native, link, or custom address")
  console.log("  --token-mint <address>        Token mint address to transfer")
  console.log("  --token-amount <amount>       Amount to transfer in raw units")
  console.log("  --log-level <level>           Log level: TRACE, DEBUG, INFO, WARN, ERROR, SILENT")
  console.log("  --skip-preflight              Skip preflight transaction checks")
  console.log("")
}

/**
 * Parse CCIP arguments (mock implementation)
 */
export function parseCCIPArgs(scriptType: string): CCIPOptions {
  // In a real implementation, this would parse command line arguments
  return {
    feeToken: "native",
    logLevel: "INFO",
    skipPreflight: false,
  }
}

/**
 * Execute CCIP script (mock implementation)
 */
export async function executeCCIPScript(options: ExecutorOptions): Promise<void> {
  console.log(`Executing ${options.scriptName} script...`)

  const config = getCCIPSVMConfig(ChainId.SOLANA_DEVNET)
  const feeToken = getSVMFeeToken(config, options.cmdOptions.feeToken)

  console.log(`Using fee token: ${feeToken.toString()}`)
  console.log(`Destination: ${options.messageConfig.destinationChain}`)
  console.log(`Receiver: ${options.messageConfig.evmReceiverAddress}`)

  // Mock execution
  const txHash = await executeCCIPTransfer(options.messageConfig)
  console.log(`Transaction hash: ${txHash}`)
}
