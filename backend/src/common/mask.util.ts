/**
 * Mascaramento de dados pessoais (LGPD, art. 6 - principio da necessidade).
 * O orquestrador nunca entrega o CPF completo para a camada de atendimento:
 * o painel do operador recebe apenas a forma mascarada.
 *
 * 412.763.088-94  ->  ***.763.088-**
 */
export function maskCpf(cpfCnpj: string): string {
  if (!cpfCnpj) return '';
  const digits = cpfCnpj.replace(/\D/g, '');
  if (digits.length !== 11) return maskGeneric(cpfCnpj);
  const bloco2 = digits.slice(3, 6);
  const bloco3 = digits.slice(6, 9);
  return `***.${bloco2}.${bloco3}-**`;
}

function maskGeneric(valor: string): string {
  const digits = valor.replace(/\D/g, '');
  if (digits.length <= 4) return '*'.repeat(digits.length);
  return `${'*'.repeat(digits.length - 4)}${digits.slice(-4)}`;
}

/** +5511992314872 -> +55 (11) 99231-4872 */
export function formatTelefone(telefone: string): string {
  const d = (telefone ?? '').replace(/\D/g, '');
  if (d.length < 12) return telefone;
  return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9, 13)}`;
}
