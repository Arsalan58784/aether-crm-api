import crypto from 'crypto';
import { cookies } from 'next/headers';

const ITERATIONS = 10000;
const KEY_LENGTH = 64;
const ALGORITHM = 'sha512';

// Deriving the 32-byte encryption key safely from process.env.SESSION_SECRET or fallback
const SESSION_SECRET = process.env.SESSION_SECRET || 'aether-crm-deep-space-obsidian-secret-session-key-fallback';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(SESSION_SECRET).digest();

/**
 * Generate a cryptographically secure random salt hex string.
 */
export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Hash a password using PBKDF2 with SHA-512 and a salt.
 */
export function hashPassword(password: string, salt: string): string {
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, ALGORITHM);
  return hash.toString('hex');
}

/**
 * Verify if a password matches its registered salt and hash.
 */
export function verifyPassword(password: string, salt: string, hash: string): boolean {
  const incomingHash = hashPassword(password, salt);
  return incomingHash === hash;
}

/**
 * Encrypt a user session payload into a tamper-proof AES-256-GCM string.
 * Format returned: iv_hex:auth_tag_hex:ciphertext_hex
 */
export function encryptSession(payload: any): string {
  const iv = crypto.randomBytes(12); // 12-byte IV is standard for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  
  let ciphertext = cipher.update(JSON.stringify(payload), 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${ciphertext}`;
}

/**
 * Decrypt an AES-256-GCM session token and verify its integrity.
 * If tampered with, expired, or invalid, returns null.
 */
export function decryptSession(token: string): any {
  try {
    const parts = token.split(':');
    if (parts.length !== 3) return null;
    
    const [ivHex, authTagHex, ciphertextHex] = parts;
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    const payload = JSON.parse(decrypted);
    
    // Check expiration (exp in milliseconds or seconds)
    if (payload.exp && payload.exp < Date.now()) {
      return null; // session expired
    }
    
    return payload;
  } catch (err) {
    // Return null on decryption/parsing error (implies tampering or invalid token)
    return null;
  }
}

/**
 * Helper to fetch and decrypt the authenticated user in Server API contexts.
 */
export async function getAuthenticatedUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return null;
    const session = decryptSession(token);
    if (!session || !session.id) return null;

    // Dynamically retrieve the freshest roles and permissions from the database
    const { roles, permissions } = await getUserRolesAndPermissions(session.id);
    const primaryRole = roles.includes('Admin') ? 'Admin' : roles.includes('Manager') ? 'Manager' : roles[0] || 'Sales Rep';

    return {
      ...session,
      role: primaryRole,
      roles: roles || [],
      permissions: permissions || []
    };
  } catch (err) {
    return null;
  }
}

/**
 * Dynamic runtime lookup for user roles and permissions.
 * Uses dynamic import to completely avoid circular dependency during module initialization.
 */
export async function getUserRolesAndPermissions(userId: number): Promise<{ roles: string[], permissions: string[] }> {
  const { query } = await import('./db');
  
  const rolesRows = await query<any[]>(
    `SELECT r.name FROM roles r 
     JOIN user_roles ur ON ur.role_id = r.id 
     WHERE ur.user_id = ?`, 
    [userId]
  );
  
  const permissionsRows = await query<any[]>(
    `SELECT DISTINCT p.name FROM permissions p 
     JOIN role_permissions rp ON rp.permission_id = p.id 
     JOIN user_roles ur ON ur.role_id = rp.role_id 
     WHERE ur.user_id = ?`, 
    [userId]
  );
  
  const roles = rolesRows.map(r => r.name);
  const permissions = permissionsRows.map(p => p.name);
  
  return { roles, permissions };
}

/**
 * Check if a user has a specific permission.
 */
export async function hasPermission(userId: number, permission: string): Promise<boolean> {
  const { permissions } = await getUserRolesAndPermissions(userId);
  return permissions.includes(permission);
}

