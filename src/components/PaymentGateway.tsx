'use client'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useAppKit, useAppKitAccount, useAppKitProvider, useDisconnect } from '@reown/appkit/react'

const USDT_CONTRACT = '0x55d398326f99059fF775485246999027B3197955'
const DEFAULT_RECEIVER = process.env.NEXT_PUBLIC_PAYMENT_RECEIVER ?? ''

const USDT_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
]

type Step = 'connect' | 'pay' | 'processing' | 'success' | 'error'

interface PaymentGatewayProps {
  /** Identificador del producto (BASIC/PRO/ELITE para planes, o cualquier string para otros productos). */
  plan: string
  /** Precio en USD (== USDT en la verificación on-chain). */
  price: number
  /** Etiqueta legible mostrada al usuario. Si se omite, se usa el mapeo BASIC/PRO/ELITE; sino el propio `plan`. */
  productLabel?: string
  receiverAddress?: string
  /**
   * Callback que se ejecuta cuando el usuario confirma el pago en su wallet y se obtiene un txHash.
   * Si se omite, el componente llama directamente a POST /api/pack-requests (flujo de planes).
   * Para otros productos (créditos IA, cursos, etc.) pasá esta prop con tu propio endpoint.
   */
  onSubmitPayment?: (txHash: string) => Promise<'approved' | 'pending_verification'>
  onSuccess?: (status: 'approved' | 'pending_verification') => void
  onCancel?: () => void
}

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function formatBalance(balance: number): string {
  if (balance === 0) return '0.00'
  if (balance >= 1) return balance.toFixed(2)
  // Para centavos, mostrar hasta 6 decimales sin ceros al final
  return parseFloat(balance.toFixed(6)).toString()
}

export function PaymentGateway({
  plan,
  price,
  productLabel,
  receiverAddress: receiverProp,
  onSubmitPayment,
  onSuccess,
  onCancel,
}: PaymentGatewayProps) {
  const receiverAddress = (receiverProp ?? DEFAULT_RECEIVER).toLowerCase()

  const { open } = useAppKit()
  const { disconnect } = useDisconnect()
  const { address, isConnected } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider('eip155')

  const [step, setStep] = useState<Step>('connect')
  const [usdtBalance, setUsdtBalance] = useState<number | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [loadingBalance, setLoadingBalance] = useState(false)

  useEffect(() => {
    if (isConnected && address && step === 'connect') {
      setStep('pay')
      fetchBalance(address)
    }
    if (!isConnected && step === 'pay') {
      setStep('connect')
      setUsdtBalance(null)
    }
  }, [isConnected, address, step])

  async function fetchBalance(addr: string) {
    setLoadingBalance(true)
    try {
      const provider = new ethers.JsonRpcProvider('https://bsc-dataseed1.binance.org')
      const contract = new ethers.Contract(USDT_CONTRACT, USDT_ABI, provider)
      const [raw, decimals] = await Promise.all([
        contract.balanceOf(addr),
        contract.decimals(),
      ])
      setUsdtBalance(Number(ethers.formatUnits(raw, decimals)))
    } catch {
      setUsdtBalance(null)
    } finally {
      setLoadingBalance(false)
    }
  }

  async function handleDisconnect() {
    await disconnect()
    setStep('connect')
    setUsdtBalance(null)
    setTxHash(null)
    setErrorMsg('')
  }

  async function sendPayment() {
    if (!walletProvider || !address) return
    if (!receiverAddress) {
      setErrorMsg('Dirección receptora no configurada. Contacta al administrador.')
      setStep('error')
      return
    }
    try {
      setStep('processing')
      const provider = new ethers.BrowserProvider(walletProvider as any)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(USDT_CONTRACT, USDT_ABI, signer)

      const amount = ethers.parseUnits(price.toFixed(2), 18)
      const tx = await contract.transfer(receiverAddress, amount)
      setTxHash(tx.hash)

      let status: 'approved' | 'pending_verification'
      if (onSubmitPayment) {
        status = await onSubmitPayment(tx.hash)
      } else {
        const res = await fetch('/api/pack-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan, paymentMethod: 'CRYPTO', txHash: tx.hash }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al registrar el pago')
        status = data.status === 'approved' ? 'approved' : 'pending_verification'
      }

      setStep('success')
      onSuccess?.(status)
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Error al procesar el pago')
      setStep('error')
    }
  }

  const planLabel = productLabel ?? ({ BASIC: 'Pack Básico', PRO: 'Pack Pro', ELITE: 'Pack Elite' }[plan] ?? plan)
  const hasEnough = !loadingBalance && (usdtBalance === null || usdtBalance >= price)

  return (
    <div className="flex flex-col gap-4">

      {/* ── Resumen del pago ── */}
      <div className="bg-gradient-to-r from-yellow-500/15 to-yellow-600/5 border border-yellow-500/30 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-xl">₮</div>
          <div className="flex-1">
            <p className="text-white font-bold">{planLabel}</p>
            <p className="text-yellow-400 font-black text-xl">{price.toFixed(2)} USDT</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-dark-400">Red</p>
            <p className="text-xs text-yellow-500 font-semibold">BEP-20</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-yellow-500/10 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <p className="text-xs text-dark-400">BNB Smart Chain · USDT-BEP20</p>
        </div>
      </div>

      {/* ── Step: Conectar ── */}
      {step === 'connect' && (
        <div className="flex flex-col gap-3">
          <div className="bg-white/3 border border-white/8 rounded-2xl p-4 flex flex-col gap-3">
            <p className="text-sm text-white font-semibold text-center">Conecta tu wallet</p>

            <div className="grid grid-cols-2 gap-2 text-xs text-dark-400">
              <div className="bg-white/5 rounded-xl p-3 flex flex-col items-center gap-1">
                <span className="text-lg">📱</span>
                <span className="font-medium text-dark-300">Móvil</span>
                <span className="text-center">Escanea el QR con Trust Wallet, MetaMask o Binance</span>
              </div>
              <div className="bg-white/5 rounded-xl p-3 flex flex-col items-center gap-1">
                <span className="text-lg">💻</span>
                <span className="font-medium text-dark-300">PC</span>
                <span className="text-center">Usa tu extensión MetaMask o cualquier wallet</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => open()}
            className="w-full py-3.5 rounded-xl font-bold text-sm bg-yellow-500 hover:bg-yellow-400 text-black transition-all flex items-center justify-center gap-2"
          >
            🔗 Conectar Wallet
          </button>

          {onCancel && (
            <button onClick={onCancel} className="w-full py-3 rounded-xl font-bold text-sm bg-white/5 text-dark-400 hover:bg-white/10 transition-all">
              Cancelar
            </button>
          )}
        </div>
      )}

      {/* ── Step: Pagar ── */}
      {step === 'pay' && address && (
        <div className="flex flex-col gap-3">

          {/* Wallet info */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                <span className="text-xs font-semibold text-green-400">Wallet conectada</span>
              </div>
              <button
                onClick={handleDisconnect}
                className="text-xs text-dark-400 hover:text-red-400 transition-colors underline"
              >
                Desconectar
              </button>
            </div>

            <div className="bg-black/20 rounded-xl p-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-dark-400 mb-0.5">Dirección</p>
                <p className="text-sm text-white font-mono">{shortAddress(address)}</p>
                <p className="text-xs text-dark-500 font-mono mt-0.5 hidden sm:block">{address}</p>
              </div>
              <a
                href={`https://bscscan.com/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-yellow-500 hover:text-yellow-400 shrink-0"
              >
                Ver ↗
              </a>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-black/20 rounded-xl p-3">
                <p className="text-xs text-dark-400 mb-1">Balance USDT</p>
                {loadingBalance ? (
                  <div className="w-16 h-4 bg-white/10 rounded animate-pulse" />
                ) : (
                  <p className={`text-sm font-bold ${usdtBalance !== null && usdtBalance < price ? 'text-red-400' : 'text-white'}`}>
                    {usdtBalance !== null ? `${formatBalance(usdtBalance)} USDT` : '—'}
                  </p>
                )}
              </div>
              <div className="bg-black/20 rounded-xl p-3">
                <p className="text-xs text-dark-400 mb-1">A pagar</p>
                <p className="text-sm font-bold text-yellow-400">{price.toFixed(2)} USDT</p>
              </div>
            </div>

            {usdtBalance !== null && usdtBalance < price && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400 text-center">
                ⚠️ Balance insuficiente. Necesitas {(price - usdtBalance).toFixed(2)} USDT más.
              </div>
            )}
          </div>

          <button
            onClick={sendPayment}
            disabled={!hasEnough}
            className="w-full py-3.5 rounded-xl font-bold text-sm bg-yellow-500 hover:bg-yellow-400 text-black transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            ₮ Confirmar pago de {price.toFixed(2)} USDT
          </button>

          {onCancel && (
            <button onClick={onCancel} className="w-full py-3 rounded-xl font-bold text-sm bg-white/5 text-dark-400 hover:bg-white/10 transition-all">
              Cancelar
            </button>
          )}
        </div>
      )}

      {/* ── Step: Procesando ── */}
      {step === 'processing' && (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="relative">
            <div className="w-14 h-14 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin" />
            <span className="absolute inset-0 flex items-center justify-center text-lg">₮</span>
          </div>
          <div className="text-center">
            <p className="text-white font-semibold">
              {txHash ? 'Verificando en blockchain...' : 'Esperando confirmación en tu wallet...'}
            </p>
            <p className="text-xs text-dark-400 mt-1">No cierres esta ventana</p>
          </div>
          {txHash && (
            <div className="bg-white/5 rounded-xl p-3 w-full text-center">
              <p className="text-xs text-dark-400 mb-1">Hash de transacción</p>
              <p className="text-xs text-white font-mono truncate">{shortAddress(txHash)}</p>
              <a
                href={`https://bscscan.com/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-yellow-400 underline mt-1 inline-block"
              >
                Ver en BSCScan ↗
              </a>
            </div>
          )}
        </div>
      )}

      {/* ── Step: Éxito ── */}
      {step === 'success' && (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center text-3xl">✅</div>
          <div className="text-center">
            <p className="text-white font-bold text-lg">¡Pago enviado!</p>
            <p className="text-xs text-dark-400 mt-1 max-w-xs">
              Tu pago fue registrado. Se activará en minutos una vez confirmado en la red.
            </p>
          </div>
          {txHash && (
            <div className="bg-white/5 rounded-xl p-3 w-full text-center">
              <p className="text-xs text-dark-400 mb-1">Transacción</p>
              <p className="text-xs text-white font-mono truncate">{shortAddress(txHash)}</p>
              <a
                href={`https://bscscan.com/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-yellow-400 underline mt-1 inline-block"
              >
                Ver en BSCScan ↗
              </a>
            </div>
          )}
        </div>
      )}

      {/* ── Step: Error ── */}
      {step === 'error' && (
        <div className="flex flex-col gap-3">
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
            <span className="text-3xl">❌</span>
            <p className="text-red-400 text-sm mt-2">{errorMsg}</p>
          </div>
          <button
            onClick={() => { setStep(isConnected ? 'pay' : 'connect'); setErrorMsg('') }}
            className="w-full py-3 rounded-xl font-bold text-sm bg-white/5 text-dark-300 hover:bg-white/10 transition-all"
          >
            Reintentar
          </button>
          {onCancel && (
            <button onClick={onCancel} className="w-full py-3 rounded-xl font-bold text-sm bg-white/5 text-dark-400 hover:bg-white/10 transition-all">
              Cancelar
            </button>
          )}
        </div>
      )}
    </div>
  )
}
