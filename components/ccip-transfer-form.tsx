"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { ArrowRight, AlertTriangle, Info, ExternalLink, Copy, CheckCircle, Loader2 } from "lucide-react"
import { ChainId, FeeTokenType, getCCIPSVMConfig, CHAIN_SELECTORS, type CCIPMessageConfig } from "@/lib/ccip-config"
import { isValidEthereumAddress, toRawTokenAmount } from "@/lib/ccip-utils"
import {
  executeRealCCIPTransfer,
  validateWalletBalance,
  calculateCCIPFee,
  type CCIPTransferResult,
} from "@/lib/ccip-client"

// CCIP Configuration based on the provided script
const CCIP_CONFIG = {
  sourceChain: "Solana Devnet",
  destinationChain: "Ethereum Sepolia",
  destinationChainSelector: CHAIN_SELECTORS[ChainId.ETHEREUM_SEPOLIA].toString(),
  bnmTokenMint: "3PjyGzj1jGVgHSKS4VR1Hr1memm63PmN8L9rtPDKwzZ6",
  minSolRequired: 0.005,
  computeUnits: 1_400_000,
}

const FEE_TOKEN_OPTIONS = [
  { value: FeeTokenType.NATIVE, label: "SOL (Native)", description: "Use SOL for transaction fees" },
  { value: FeeTokenType.WRAPPED_NATIVE, label: "Wrapped SOL", description: "Use wrapped SOL for fees" },
  { value: FeeTokenType.LINK, label: "LINK Token", description: "Use LINK token for fees" },
]

const DESTINATION_CHAINS = [
  { id: ChainId.ETHEREUM_SEPOLIA, name: "Ethereum Sepolia", selector: CHAIN_SELECTORS[ChainId.ETHEREUM_SEPOLIA] },
  { id: ChainId.BASE_SEPOLIA, name: "Base Sepolia", selector: CHAIN_SELECTORS[ChainId.BASE_SEPOLIA] },
  { id: ChainId.ARBITRUM_SEPOLIA, name: "Arbitrum Sepolia", selector: CHAIN_SELECTORS[ChainId.ARBITRUM_SEPOLIA] },
]

export function CCIPTransferForm() {
  const { publicKey, connected, signTransaction } = useWallet()
  const { connection } = useConnection()
  const { toast } = useToast()

  // Form state
  const [destinationChain, setDestinationChain] = useState(ChainId.ETHEREUM_SEPOLIA)
  const [receiverAddress, setReceiverAddress] = useState("0x9d087fC03ae39b088326b67fA3C788236645b717")
  const [tokenAmount, setTokenAmount] = useState("0.01")
  const [feeToken, setFeeToken] = useState(FeeTokenType.NATIVE)
  const [gasLimit, setGasLimit] = useState("0")
  const [allowOutOfOrder, setAllowOutOfOrder] = useState(true)
  const [messageData, setMessageData] = useState("")

  // Wallet state
  const [solBalance, setSolBalance] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [transferResult, setTransferResult] = useState<CCIPTransferResult | null>(null)
  const [estimatedFee, setEstimatedFee] = useState<number | null>(null)

  // Validation state
  const [addressError, setAddressError] = useState<string | null>(null)

  // Fetch SOL balance
  useEffect(() => {
    if (connected && publicKey && connection) {
      const fetchBalance = async () => {
        try {
          const { balance } = await validateWalletBalance(connection, publicKey, CCIP_CONFIG.minSolRequired)
          setSolBalance(balance)
        } catch (error) {
          console.error("Error fetching balance:", error)
        }
      }
      fetchBalance()
    }
  }, [connected, publicKey, connection])

  // Calculate estimated fee when form changes
  useEffect(() => {
    if (receiverAddress && tokenAmount && !addressError) {
      const calculateFee = async () => {
        try {
          const config = getCCIPSVMConfig(ChainId.SOLANA_DEVNET)
          const messageConfig: CCIPMessageConfig = {
            destinationChain,
            destinationChainSelector: CHAIN_SELECTORS[destinationChain].toString(),
            evmReceiverAddress: receiverAddress,
            tokenAmounts: [
              {
                tokenMint: config.bnmTokenMint.toString(),
                amount: toRawTokenAmount(tokenAmount, 9),
              },
            ],
            feeToken,
            messageData: messageData || "",
            extraArgs: {
              gasLimit: Number.parseInt(gasLimit) || 0,
              allowOutOfOrderExecution: allowOutOfOrder,
            },
          }

          const { feeInSol } = await calculateCCIPFee(messageConfig)
          setEstimatedFee(feeInSol)
        } catch (error) {
          console.error("Error calculating fee:", error)
          setEstimatedFee(null)
        }
      }

      calculateFee()
    }
  }, [destinationChain, receiverAddress, tokenAmount, feeToken, gasLimit, allowOutOfOrder, messageData, addressError])

  // Validate receiver address
  useEffect(() => {
    if (receiverAddress) {
      if (!isValidEthereumAddress(receiverAddress)) {
        setAddressError("Invalid Ethereum address format")
      } else {
        setAddressError(null)
      }
    }
  }, [receiverAddress])

  const handleTransfer = async () => {
    if (!connected || !publicKey || !signTransaction) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your Solana wallet first",
        variant: "destructive",
      })
      return
    }

    if (!receiverAddress || !tokenAmount || addressError) {
      toast({
        title: "Invalid Input",
        description: "Please check all fields and fix any errors",
        variant: "destructive",
      })
      return
    }

    if (solBalance !== null && solBalance < CCIP_CONFIG.minSolRequired) {
      toast({
        title: "Insufficient SOL",
        description: `You need at least ${CCIP_CONFIG.minSolRequired} SOL for transaction fees`,
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setTransferResult(null)

    try {
      // Get Solana config
      const config = getCCIPSVMConfig(ChainId.SOLANA_DEVNET)

      // Prepare CCIP message configuration
      const messageConfig: CCIPMessageConfig = {
        destinationChain,
        destinationChainSelector: CHAIN_SELECTORS[destinationChain].toString(),
        evmReceiverAddress: receiverAddress,
        tokenAmounts: [
          {
            tokenMint: config.bnmTokenMint.toString(),
            amount: toRawTokenAmount(tokenAmount, 9), // BnM has 9 decimals
          },
        ],
        feeToken,
        messageData: messageData || "",
        extraArgs: {
          gasLimit: Number.parseInt(gasLimit) || 0,
          allowOutOfOrderExecution: allowOutOfOrder,
        },
      }

      // Execute the real CCIP transfer
      const result = await executeRealCCIPTransfer({
        connection,
        wallet: { publicKey, signTransaction },
        config: messageConfig,
        computeUnits: CCIP_CONFIG.computeUnits,
      })

      setTransferResult(result)

      toast({
        title: "Transfer Initiated",
        description: `Cross-chain transfer of ${tokenAmount} BnM tokens initiated successfully`,
      })

      // Reset form
      setTokenAmount("0.01")
      setMessageData("")

      // Refresh balance
      if (publicKey) {
        const { balance } = await validateWalletBalance(connection, publicKey, CCIP_CONFIG.minSolRequired)
        setSolBalance(balance)
      }
    } catch (error) {
      console.error("Transfer error:", error)
      toast({
        title: "Transfer Failed",
        description: error instanceof Error ? error.message : "An error occurred while processing the transfer",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({
        title: "Copied",
        description: "Copied to clipboard",
      })
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  const selectedDestination = DESTINATION_CHAINS.find((chain) => chain.id === destinationChain)

  return (
    <div className="space-y-6">
      {/* Wallet Connection */}
      <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            Solana Wallet Connection
            {connected && (
              <Badge variant="outline" className="border-green-500 text-green-400">
                Connected
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <WalletMultiButton className="!bg-teal-600 hover:!bg-teal-700 !rounded-lg" />
            {connected && publicKey && (
              <div className="text-right">
                <div className="text-sm text-gray-400">Wallet Address</div>
                <div className="flex items-center space-x-2">
                  <span className="text-white font-mono text-sm">
                    {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(publicKey.toString())}
                    className="p-1 h-auto"
                  >
                    {copied ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {connected && solBalance !== null && (
            <div className="p-3 bg-slate-700/50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">SOL Balance</span>
                <span className="text-white font-medium">{solBalance.toFixed(4)} SOL</span>
              </div>
              {estimatedFee && (
                <div className="flex justify-between items-center mt-1">
                  <span className="text-gray-400">Estimated Fee</span>
                  <span className="text-yellow-400">{estimatedFee.toFixed(6)} SOL</span>
                </div>
              )}
              {solBalance < CCIP_CONFIG.minSolRequired && (
                <Alert className="mt-2 border-yellow-500 bg-yellow-500/10">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <AlertDescription className="text-yellow-200">
                    Insufficient SOL for transaction fees. You need at least {CCIP_CONFIG.minSolRequired} SOL.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transfer Configuration */}
      <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Cross-Chain Transfer Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Chain Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-700/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white font-medium">Source Chain</h4>
                <Badge variant="outline" className="border-teal-500 text-teal-400">
                  {CCIP_CONFIG.sourceChain}
                </Badge>
              </div>
              <div className="text-sm text-gray-400">Token: BnM Token</div>
              <div className="text-xs text-gray-500 font-mono">{CCIP_CONFIG.bnmTokenMint}</div>
            </div>

            <div className="p-4 bg-slate-700/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white font-medium">Destination Chain</h4>
                <Badge variant="outline" className="border-orange-500 text-orange-400">
                  {selectedDestination?.name}
                </Badge>
              </div>
              <div className="text-sm text-gray-400">Chain Selector: {selectedDestination?.selector.toString()}</div>
            </div>
          </div>

          {/* Destination Chain Selection */}
          <div className="space-y-2">
            <Label className="text-gray-300">Destination Chain</Label>
            <Select value={destinationChain} onValueChange={(value) => setDestinationChain(value as ChainId)}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                {DESTINATION_CHAINS.map((chain) => (
                  <SelectItem key={chain.id} value={chain.id} className="text-white hover:bg-slate-600">
                    <div>
                      <div>{chain.name}</div>
                      <div className="text-xs text-gray-400">Selector: {chain.selector.toString()}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Receiver Address */}
          <div className="space-y-2">
            <Label className="text-gray-300">Receiver Address</Label>
            <Input
              placeholder="0x..."
              value={receiverAddress}
              onChange={(e) => setReceiverAddress(e.target.value)}
              className={`bg-slate-700 border-slate-600 text-white font-mono ${addressError ? "border-red-500" : ""}`}
            />
            {addressError && <p className="text-sm text-red-400">{addressError}</p>}
            <p className="text-sm text-gray-400">The address that will receive the tokens on the destination chain</p>
          </div>

          {/* Token Amount */}
          <div className="space-y-2">
            <Label className="text-gray-300">Token Amount (BnM)</Label>
            <Input
              type="number"
              step="0.000001"
              placeholder="0.01"
              value={tokenAmount}
              onChange={(e) => setTokenAmount(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
            />
            <p className="text-sm text-gray-400">
              Amount of BnM tokens to transfer (Raw amount: {toRawTokenAmount(tokenAmount, 9)})
            </p>
          </div>

          {/* Fee Token Selection */}
          <div className="space-y-2">
            <Label className="text-gray-300">Fee Token</Label>
            <Select value={feeToken} onValueChange={(value) => setFeeToken(value as FeeTokenType)}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                {FEE_TOKEN_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-white hover:bg-slate-600">
                    <div>
                      <div>{option.label}</div>
                      <div className="text-xs text-gray-400">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Advanced Options */}
          <div className="space-y-4">
            <h4 className="text-white font-medium">Advanced Options</h4>

            <div className="space-y-2">
              <Label className="text-gray-300">Gas Limit (0 for token transfers)</Label>
              <Input
                type="number"
                placeholder="0"
                value={gasLimit}
                onChange={(e) => setGasLimit(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Message Data (Optional)</Label>
              <Input
                placeholder="Custom message data (hex)"
                value={messageData}
                onChange={(e) => setMessageData(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white font-mono"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="allowOutOfOrder"
                checked={allowOutOfOrder}
                onChange={(e) => setAllowOutOfOrder(e.target.checked)}
                className="rounded border-slate-600 bg-slate-700"
              />
              <Label htmlFor="allowOutOfOrder" className="text-gray-300">
                Allow out-of-order execution
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Summary */}
      {connected && receiverAddress && tokenAmount && !addressError && (
        <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Transaction Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-white font-bold">S</span>
                  </div>
                  <div className="text-sm text-gray-400">Solana Devnet</div>
                </div>
                <ArrowRight className="text-gray-500" />
                <div className="text-center">
                  <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-white font-bold">E</span>
                  </div>
                  <div className="text-sm text-gray-400">{selectedDestination?.name}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Sending</span>
                  <span className="text-white">{tokenAmount} BnM</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Fee Token</span>
                  <span className="text-white">{FEE_TOKEN_OPTIONS.find((opt) => opt.value === feeToken)?.label}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">To Address</span>
                  <span className="text-white font-mono">
                    {receiverAddress.slice(0, 6)}...{receiverAddress.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Estimated Fee</span>
                  <span className="text-white">
                    {estimatedFee ? `${estimatedFee.toFixed(6)} SOL` : "Calculating..."}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction Result */}
      {transferResult && (
        <Card className="bg-green-500/10 border-green-500/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-green-400 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              Transfer Successful
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Transaction Hash:</span>
                <div className="flex items-center space-x-2">
                  <span className="text-white font-mono text-sm">
                    {transferResult.signature.slice(0, 8)}...{transferResult.signature.slice(-8)}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(transferResult.signature)}
                    className="p-1 h-auto"
                  >
                    <Copy className="w-4 h-4 text-gray-400" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(transferResult.explorerUrl, "_blank")}
                    className="p-1 h-auto"
                  >
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </Button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-300">Message ID:</span>
                <div className="flex items-center space-x-2">
                  <span className="text-white font-mono text-sm">
                    {transferResult.messageId.slice(0, 10)}...{transferResult.messageId.slice(-8)}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(transferResult.messageId)}
                    className="p-1 h-auto"
                  >
                    <Copy className="w-4 h-4 text-gray-400" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(transferResult.ccipExplorerUrl, "_blank")}
                    className="p-1 h-auto"
                  >
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </Button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(transferResult.ccipExplorerUrl, "_blank")}
                  className="w-full border-green-500 text-green-400 hover:bg-green-500/10"
                >
                  View on CCIP Explorer
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Information Alert */}
      <Alert className="border-blue-500 bg-blue-500/10">
        <Info className="h-4 w-4 text-blue-400" />
        <AlertDescription className="text-blue-200">
          <div className="space-y-2">
            <p>
              <strong>Note:</strong> This interface uses wallet signing and simulates the CCIP transfer process. To
              enable real transfers, integrate with the actual CCIP Solana SDK.
            </p>
            <div className="flex items-center space-x-2">
              <span>Learn more about CCIP:</span>
              <Button
                variant="link"
                size="sm"
                className="text-blue-400 hover:text-blue-300 p-0 h-auto"
                onClick={() => window.open("https://docs.chain.link/ccip", "_blank")}
              >
                Documentation
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Transfer Button */}
      <Button
        onClick={handleTransfer}
        disabled={!connected || isLoading || !receiverAddress || !tokenAmount || !!addressError}
        className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold py-4 text-lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 w-5 h-5 animate-spin" />
            Processing Transfer...
          </>
        ) : (
          <>
            Initiate Cross-Chain Transfer
            <ArrowRight className="ml-2 w-5 h-5" />
          </>
        )}
      </Button>
    </div>
  )
}
