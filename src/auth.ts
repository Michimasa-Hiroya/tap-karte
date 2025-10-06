// 認証関連のユーティリティ
import { sign, verify } from 'hono/jwt'
import bcrypt from 'bcryptjs'

// JWT設定
export const JWT_EXPIRES_IN = 60 * 60 * 24 * 7 // 7日間

// ユーザー型定義
export interface User {
  id: number
  email: string
  display_name: string
  profile_image?: string
  auth_provider: 'email' | 'google'
  google_id?: string
  email_verified: boolean
  created_at: string
  last_login_at?: string
}

export interface CreateUserData {
  email: string
  password?: string
  display_name: string
  profile_image?: string
  auth_provider: 'email' | 'google'
  google_id?: string
  email_verified?: boolean
}

// JWT ペイロード型
export interface JwtPayload {
  userId: number
  email: string
  exp: number
  iat: number
}

// パスワードハッシュ化
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return await bcrypt.hash(password, saltRounds)
}

// パスワード検証
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword)
}

// JWTトークン生成
export async function generateJWT(user: User, secret?: string): Promise<string> {
  const jwtSecret = secret || 'fallback-jwt-secret'
  console.log('[JWT] Generating token with secret length:', jwtSecret.length)
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + JWT_EXPIRES_IN,
    iat: Math.floor(Date.now() / 1000)
  }
  
  const token = await sign(payload, jwtSecret)
  console.log('[JWT] Token generated with length:', token.length)
  return token
}

// JWTトークン検証
export async function verifyJWT(token: string, secret?: string): Promise<JwtPayload | null> {
  try {
    const jwtSecret = secret || 'fallback-jwt-secret'
    console.log('[JWT] Verifying with secret length:', jwtSecret.length, 'token length:', token.length)
    const payload = await verify(token, jwtSecret) as JwtPayload
    
    console.log('[JWT] Token verified successfully:', payload.userId)
    
    // トークンの有効期限チェック
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      console.log('[JWT] Token expired')
      return null
    }
    
    return payload
  } catch (error) {
    console.error('[JWT] JWT verification failed:', error)
    return null
  }
}

// メールアドレス検証
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// パスワード強度検証
export function isValidPassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'パスワードは8文字以上である必要があります' }
  }
  
  if (!/[A-Za-z]/.test(password)) {
    return { valid: false, message: 'パスワードには英字を含める必要があります' }
  }
  
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'パスワードには数字を含める必要があります' }
  }
  
  return { valid: true }
}

// セッション管理用のヘルパー
export interface SessionInfo {
  userId: number
  email: string
  displayName: string
  isAuthenticated: boolean
}

// リクエストからセッション情報を取得
export async function getSessionFromRequest(c: any, secret?: string): Promise<SessionInfo | null> {
  try {
    // Authorizationヘッダーからトークンを取得
    const authHeader = c.req.header('Authorization')
    
    let token: string | null = null
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7)
    }
    
    console.log('[AUTH] Token check - authHeader:', !!authHeader, 'token:', !!token)
    
    if (!token) {
      console.log('[AUTH] No token found')
      return null
    }
    
    const payload = await verifyJWT(token, secret)
    if (!payload) {
      console.log('[AUTH] Token verification failed')
      return null
    }
    
    console.log('[AUTH] Token verified successfully for userId:', payload.userId)
    
    // データベースからユーザー情報を取得（後で実装）
    // 現在は仮のデータを返す
    return {
      userId: payload.userId,
      email: payload.email,
      displayName: payload.email.split('@')[0], // 仮実装
      isAuthenticated: true
    }
    
  } catch (error) {
    console.error('Session validation error:', error)
    return null
  }
}

// Google OAuth検証（後で実装）
export interface GoogleTokenInfo {
  sub: string // Google user ID
  email: string
  name: string
  picture?: string
  email_verified: boolean
}

export async function verifyGoogleToken(token: string): Promise<GoogleTokenInfo | null> {
  try {
    // Google Token Info APIを使用してトークンを検証
    const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`)
    
    if (!response.ok) {
      return null
    }
    
    const tokenInfo = await response.json()
    
    // 必要な情報が含まれているか確認
    if (!tokenInfo.sub || !tokenInfo.email) {
      return null
    }
    
    return {
      sub: tokenInfo.sub,
      email: tokenInfo.email,
      name: tokenInfo.name || tokenInfo.email.split('@')[0],
      picture: tokenInfo.picture,
      email_verified: tokenInfo.email_verified === 'true'
    }
    
  } catch (error) {
    console.error('Google token verification failed:', error)
    return null
  }
}