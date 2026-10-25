import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
function key() {
  const value = process.env.SLEEPER_TOKEN_ENCRYPTION_KEY || ''
  if (!/^[a-f0-9]{64}$/i.test(value))
    throw new Error('Saved Sleeper connections are not configured.')
  return Buffer.from(value, 'hex')
}
export function encryptToken(token: string, account: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  cipher.setAAD(Buffer.from(account))
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  return JSON.stringify({
    v: 1,
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: encrypted.toString('base64'),
  })
}
export function decryptToken(payload: string, account: string) {
  const value = JSON.parse(payload)
  if (value.v !== 1) throw new Error('Unsupported saved connection.')
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(value.iv, 'base64'))
  decipher.setAAD(Buffer.from(account))
  decipher.setAuthTag(Buffer.from(value.tag, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(value.data, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}
