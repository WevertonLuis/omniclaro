/** Gera protocolo no formato AAAA-NNNNN usado pela Claro (ex.: 2026-08841). */
export function gerarProtocolo(): string {
  const ano = new Date().getFullYear();
  const seq = Math.floor(10000 + Math.random() * 89999);
  return `${ano}-${String(seq).padStart(5, '0')}`;
}
