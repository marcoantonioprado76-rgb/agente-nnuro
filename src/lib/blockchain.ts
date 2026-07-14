import { ethers } from 'ethers'

const BSC_RPC = process.env.BSC_RPC_URL ?? 'https://bsc-dataseed1.binance.org'
const USDT_CONTRACT = '0x55d398326f99059fF775485246999027B3197955'
const PAYMENT_RECEIVER = (process.env.PAYMENT_RECEIVER ?? '').toLowerCase()

// ERC-20 Transfer event ABI
const TRANSFER_TOPIC = ethers.id('Transfer(address,address,uint256)')

export interface VerifyResult {
  success: boolean
  error?: string
  blockNumber?: bigint
  amountUsdt?: number
}

/**
 * Verifica una transacción USDT-BEP20 en BSC.
 * NUNCA confíes en el frontend — esta función siempre re-verifica en el nodo RPC.
 */
export async function verifyBscTransaction(
  txHash: string,
  expectedAmountUsdt: number,
  requiredConfirmations = 3,
): Promise<VerifyResult> {
  if (!PAYMENT_RECEIVER) {
    return { success: false, error: 'PAYMENT_RECEIVER no configurado en env' }
  }

  try {
    const provider = new ethers.JsonRpcProvider(BSC_RPC)

    const [receipt, currentBlock] = await Promise.all([
      provider.getTransactionReceipt(txHash),
      provider.getBlockNumber(),
    ])

    if (!receipt) {
      return { success: false, error: 'Transacción no encontrada en la red' }
    }

    // 1. Verificar que la tx fue exitosa
    if (receipt.status !== 1) {
      return { success: false, error: 'La transacción falló on-chain' }
    }

    // 2. Verificar que el contrato destino sea USDT
    if (receipt.to?.toLowerCase() !== USDT_CONTRACT.toLowerCase()) {
      return { success: false, error: 'La transacción no es al contrato USDT-BEP20' }
    }

    // 3. Buscar el log del evento Transfer
    const transferLog = receipt.logs.find(
      log =>
        log.address.toLowerCase() === USDT_CONTRACT.toLowerCase() &&
        log.topics[0] === TRANSFER_TOPIC &&
        log.topics.length === 3,
    )

    if (!transferLog) {
      return { success: false, error: 'No se encontró evento Transfer en la transacción' }
    }

    // 4. Verificar destinatario
    const toAddress = '0x' + transferLog.topics[2].slice(26)
    if (toAddress.toLowerCase() !== PAYMENT_RECEIVER) {
      return { success: false, error: 'El destinatario no es la wallet de pago configurada' }
    }

    // 5. Verificar monto (USDT-BEP20 tiene 18 decimales)
    const rawAmount = BigInt(transferLog.data)
    const amountUsdt = Number(ethers.formatUnits(rawAmount, 18))
    const tolerance = 0.5
    if (amountUsdt < expectedAmountUsdt - tolerance) {
      return {
        success: false,
        error: `Monto insuficiente: se recibió ${amountUsdt.toFixed(2)} USDT, se esperaba ${expectedAmountUsdt} USDT`,
      }
    }

    // 6. Verificar confirmaciones
    const confirmations = currentBlock - Number(receipt.blockNumber)
    if (confirmations < requiredConfirmations) {
      return {
        success: false,
        error: `Confirmaciones insuficientes: ${confirmations}/${requiredConfirmations}`,
      }
    }

    return {
      success: true,
      blockNumber: BigInt(receipt.blockNumber),
      amountUsdt,
    }
  } catch (err: any) {
    console.error('[verifyBscTransaction]', err)
    return { success: false, error: err?.message ?? 'Error al verificar en BSC' }
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/**
 * getLogs por tramos + reintentos. Los RPC públicos de BSC limitan el rango/resultados
 * de eth_getLogs y aplican rate-limit; pedir todo en una sola llamada puede fallar y
 * hacer que un pago no se detecte. Troceamos en ventanas seguras con backoff.
 */
async function getLogsChunked(
  provider: ethers.JsonRpcProvider,
  filter: { address: string; topics: (string | null)[] },
  fromBlock: number,
  toBlock: number,
  chunk = 800,
): Promise<ethers.Log[]> {
  const out: ethers.Log[] = []
  for (let start = fromBlock; start <= toBlock; start += chunk + 1) {
    const end = Math.min(start + chunk, toBlock)
    let attempt = 0
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const logs = await provider.getLogs({ ...filter, fromBlock: start, toBlock: end })
        out.push(...logs)
        break
      } catch (e) {
        attempt++
        if (attempt >= 3) throw e
        await sleep(300 * attempt)
      }
    }
  }
  return out
}

/**
 * Auto-detección SIN pegar hash (crypto-B): busca un pago USDT entrante a la dirección
 * única (PAYMENT_RECEIVER) que matchee EXACTAMENTE el monto esperado (con sus 4 decimales
 * únicos). Como cada compra pendiente tiene un monto único, un pago con ese monto exacto
 * es inequívocamente de esa compra.
 *
 * Comparación de montos en BigInt (sin pérdida de precisión de float64) y atribución
 * ESTRICTA por timestamp del bloque (el pago debe ser posterior al inicio de la compra),
 * para que un pago huérfano de una compra vencida que reusó el monto no se acredite a otra.
 */
export async function findIncomingUsdtByAmount(
  expectedAmountUsdt: number,
  opts: { lookbackBlocks?: number; requiredConfirmations?: number; notBefore?: Date } = {},
): Promise<{ txHash: string; amount: number; confirmations: number; blockNumber: number } | null> {
  if (!PAYMENT_RECEIVER) return null
  const lookback = opts.lookbackBlocks ?? 2400      // ~2h en BSC (3s/bloque)
  const requiredConfs = opts.requiredConfirmations ?? 3
  try {
    const provider = new ethers.JsonRpcProvider(BSC_RPC)
    const current = await provider.getBlockNumber()
    let fromBlock = Math.max(0, current - lookback)
    // Solo considerar pagos hechos DESPUÉS de iniciar la compra (evita matchear un pago
    // viejo de otra compra vencida que reusó el mismo monto).
    if (opts.notBefore) {
      const ageBlocks = Math.ceil((Date.now() - opts.notBefore.getTime()) / 3000)
      fromBlock = Math.max(fromBlock, current - ageBlocks - 20) // pequeño margen por variación de bloque
    }
    // topic del destinatario (address indexado → 32 bytes)
    const toTopic = '0x' + '0'.repeat(24) + PAYMENT_RECEIVER.slice(2)
    // USDT-BEP20: 18 decimales. Comparación exacta en BigInt (sin literales `n` por el target TS).
    const SCALE_14 = BigInt('100000000000000')                 // 10^14 (monto tiene 4 decimales → 18-4)
    const expectedRaw = BigInt(Math.round(expectedAmountUsdt * 10000)) * SCALE_14
    const tolRaw = BigInt('50000000000000')                    // 0.00005 USDT (mitad del delta único 0.0001)

    const logs = await getLogsChunked(
      provider,
      { address: USDT_CONTRACT, topics: [TRANSFER_TOPIC, null, toTopic] },
      fromBlock, current,
    )

    // candidatos: monto exacto + confirmaciones, más recientes primero
    const candidates = logs
      .filter(log => {
        const raw = BigInt(log.data)
        const diff = raw > expectedRaw ? raw - expectedRaw : expectedRaw - raw
        return diff <= tolRaw
      })
      .filter(log => current - log.blockNumber >= requiredConfs)
      .sort((a, b) => b.blockNumber - a.blockNumber)

    for (const log of candidates) {
      // Atribución estricta: verificar por timestamp que el pago es posterior al inicio.
      if (opts.notBefore) {
        const block = await provider.getBlock(log.blockNumber)
        if (block && block.timestamp * 1000 < opts.notBefore.getTime() - 60_000) continue
      }
      return {
        txHash: log.transactionHash,
        amount: Number(ethers.formatUnits(BigInt(log.data), 18)),
        confirmations: current - log.blockNumber,
        blockNumber: log.blockNumber,
      }
    }
    return null // consulta on-chain OK: no hay pago con ese monto (aún)
  } catch (err) {
    // Propagamos el error de RPC en vez de devolver null: así el caller distingue
    // "no se pudo consultar" (NO rechazar el pago) de "consultado OK sin pago" (null).
    // Un outage del RPC no debe rechazar un pago que el usuario sí hizo.
    console.error('[findIncomingUsdtByAmount]', err)
    throw err instanceof Error ? err : new Error('RPC error')
  }
}
