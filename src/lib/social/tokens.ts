// Refresh y validación de tokens de redes sociales.
//
// Problema que resuelve: los access tokens expiran (YouTube/Google ~1h,
// TikTok ~24h, Facebook ~60d) y antes NUNCA se refrescaban → las publicaciones
// (sobre todo programadas) fallaban con "token expirado". Las funciones de
// refresh ya existían (youtube.ts, tiktok.ts) pero no se llamaban.
//
// getValidToken() se llama justo antes de publicar: si el token está vencido o
// por vencer, lo refresca con el refreshToken guardado y persiste el nuevo en
// la conexión. Si no se puede refrescar, devuelve el token actual (mejor intento,
// nunca rompe el flujo existente).

import { prisma } from '@/lib/prisma'
import { refreshTikTokToken } from './tiktok'
import { refreshGoogleToken } from './youtube'

// Margen de seguridad: refrescar si el token vence dentro de los próximos 5 min.
const SKEW_MS = 5 * 60 * 1000
const FB_GRAPH = 'https://graph.facebook.com/v21.0'

export type RefreshableConnection = {
  id: string
  network: string
  accessToken: string
  refreshToken?: string | null
  expiresAt?: Date | string | null
  pageId?: string | null
}

/** Extiende un token de usuario de larga duración de Facebook (fb_exchange_token). */
async function refreshFacebookLongLived(
  currentToken: string,
): Promise<{ accessToken: string; expiresAt: Date } | null> {
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  if (!appId || !appSecret) return null
  const res = await fetch(
    `${FB_GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${currentToken}`,
  )
  const data = await res.json()
  if (!res.ok || data.error || !data.access_token) return null
  const expiresIn = data.expires_in || 5184000 // 60 días por defecto
  return { accessToken: data.access_token as string, expiresAt: new Date(Date.now() + expiresIn * 1000) }
}

/**
 * Obtiene el token de PÁGINA de Facebook a partir del token de usuario.
 * Publicar en una página requiere el token de página (pages_manage_posts),
 * no el de usuario — sin esto, el scheduler fallaba con el error #200.
 */
async function getFacebookPageToken(userToken: string, pageId: string): Promise<string | null> {
  const res = await fetch(`${FB_GRAPH}/${pageId}?fields=access_token&access_token=${userToken}`)
  const data = await res.json()
  if (!res.ok || data.error || !data.access_token) return null
  return data.access_token as string
}

/**
 * Devuelve un access token válido para la conexión.
 * Refresca y persiste si está vencido o por vencer; si no puede, devuelve el actual.
 */
export async function getValidToken(conn: RefreshableConnection): Promise<string> {
  const exp = conn.expiresAt ? new Date(conn.expiresAt).getTime() : null
  const needsRefresh = exp !== null && exp - Date.now() < SKEW_MS

  // FACEBOOK: para publicar en una PÁGINA hace falta el TOKEN DE PÁGINA, no el de
  // usuario (que es el que se guarda en accessToken). Antes el scheduler usaba el de
  // usuario y fallaba con el error #200. Aquí resolvemos SIEMPRE el token de página
  // a partir del de usuario (refrescando el de usuario antes si está por vencer).
  if (conn.network === 'FACEBOOK') {
    let userToken = conn.accessToken
    if (needsRefresh) {
      try {
        const ext = await refreshFacebookLongLived(userToken)
        if (ext) {
          await (prisma as any).socialConnection.update({
            where: { id: conn.id },
            data: { accessToken: ext.accessToken, expiresAt: ext.expiresAt },
          })
          userToken = ext.accessToken
        }
      } catch (e: any) {
        console.error(`[SocialTokens] FB refresh (${conn.id}) failed:`, e?.message)
      }
    }
    if (conn.pageId) {
      try {
        const pageToken = await getFacebookPageToken(userToken, conn.pageId)
        if (pageToken) return pageToken
      } catch (e: any) {
        console.error(`[SocialTokens] FB page token (${conn.id}) failed:`, e?.message)
      }
    }
    return userToken // fallback (probablemente requiera reconectar la página)
  }

  // Resto de redes: si no está por vencer, el token actual sirve.
  if (!needsRefresh) return conn.accessToken

  try {
    if (conn.network === 'YOUTUBE' && conn.refreshToken) {
      const r = await refreshGoogleToken(conn.refreshToken)
      const expiresAt = new Date(Date.now() + (r.expiresIn ?? 3600) * 1000)
      await (prisma as any).socialConnection.update({
        where: { id: conn.id },
        data: { accessToken: r.accessToken, expiresAt },
      })
      return r.accessToken
    }

    if (conn.network === 'TIKTOK' && conn.refreshToken) {
      const r = await refreshTikTokToken(conn.refreshToken)
      const expiresAt = new Date(Date.now() + (r.expiresIn ?? 86400) * 1000)
      await (prisma as any).socialConnection.update({
        where: { id: conn.id },
        data: { accessToken: r.accessToken, refreshToken: r.refreshToken, expiresAt },
      })
      return r.accessToken
    }

    // INSTAGRAM: el token guardado ya es un token de PÁGINA de larga duración
    // (no expira mientras el token de usuario siga vivo) → no se refresca aquí.
  } catch (e: any) {
    console.error(`[SocialTokens] refresh ${conn.network} (${conn.id}) failed:`, e?.message)
  }

  return conn.accessToken // mejor intento: no romper el flujo si el refresh falla
}
