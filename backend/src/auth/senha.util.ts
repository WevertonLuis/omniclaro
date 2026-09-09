import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);
const TAMANHO_CHAVE = 64;

/**
 * Hash de senha com scrypt, da biblioteca padrao do Node.
 *
 * Optamos por scrypt em vez de bcrypt/argon2 porque estes exigem compilacao
 * nativa (node-gyp), que quebra a instalacao no Windows sem build tools —
 * o mesmo motivo que levou o projeto a usar sql.js no lugar do sqlite3.
 * scrypt e uma KDF adequada para senhas, com custo de memoria configuravel.
 */
export async function gerarHash(senha: string): Promise<string> {
  const salt = randomBytes(16);
  const derivado = (await scryptAsync(senha, salt, TAMANHO_CHAVE)) as Buffer;
  return `scrypt$${salt.toString('hex')}$${derivado.toString('hex')}`;
}

export async function conferirSenha(senha: string, hashArmazenado: string): Promise<boolean> {
  const partes = (hashArmazenado ?? '').split('$');
  if (partes.length !== 3 || partes[0] !== 'scrypt') return false;

  const salt = Buffer.from(partes[1], 'hex');
  const esperado = Buffer.from(partes[2], 'hex');
  if (esperado.length !== TAMANHO_CHAVE) return false;

  const derivado = (await scryptAsync(senha, salt, TAMANHO_CHAVE)) as Buffer;
  // timingSafeEqual evita vazar informacao pelo tempo de comparacao.
  return timingSafeEqual(derivado, esperado);
}
