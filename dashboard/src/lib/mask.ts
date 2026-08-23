/**
 * Mascaramento de CPF no painel do atendente.
 *
 * Correcao de conformidade em relacao ao mockup original: o Figma exibia o CPF
 * integral (412.763.088-94). A politica de LGPD descrita na documentacao exige
 * mascaramento de dados pessoais na camada de atendimento, entao o painel
 * renderiza ***.763.088-** — o suficiente para o atendente conferir a
 * titularidade com o cliente sem expor o documento completo na tela.
 *
 * O backend ja entrega o valor mascarado; esta funcao e a segunda barreira,
 * aplicada a qualquer CPF que chegue integral por outra rota.
 */
export function maskCpf(valor: string | null | undefined): string {
  if (!valor) return '-';
  if (valor.includes('*')) return valor;

  const d = valor.replace(/\D/g, '');
  if (d.length !== 11) {
    if (d.length <= 4) return '*'.repeat(d.length);
    return `${'*'.repeat(d.length - 4)}${d.slice(-4)}`;
  }
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

/** "Lucas Henrique Ferreira" -> "Lucas Ferreira" (primeiro + ultimo, como no mockup). */
export function nomeCurto(nomeCompleto: string): string {
  const partes = (nomeCompleto ?? '').trim().split(/\s+/).filter(Boolean);
  if (partes.length <= 2) return partes.join(' ');
  return `${partes[0]} ${partes[partes.length - 1]}`;
}

export function horaCurta(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function duracao(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
