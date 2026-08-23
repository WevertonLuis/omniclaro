import { Injectable, Logger } from '@nestjs/common';

export interface DiagnosticoRede {
  equipamento: string;
  status_inicial: 'OFFLINE' | 'INSTAVEL' | 'ONLINE';
  status_final: 'ONLINE' | 'INSTAVEL';
  acao_executada: string;
  mensagem: string;
  potencia_sinal_dbm: number;
  latencia_ms: number;
  reset_id: string;
  duracao_diagnostico_ms: number;
}

export interface Oferta {
  id: string;
  nome: string;
  descricao: string;
  preco_mensal: number;
  preco_formatado: string;
  beneficios: string[];
  fidelidade_meses: number;
  elegivel: boolean;
}

/**
 * Mocks dos sistemas legados da Claro (provisionamento de rede e catalogo comercial).
 * Conforme a Matriz de Status do Prototipo, nao ha integracao SOAP nem billing real.
 */
@Injectable()
export class MocksService {
  private readonly logger = new Logger(MocksService.name);

  /** Simula o diagnostico remoto: leva 2-3s, como a chamada real ao sistema de provisionamento. */
  async resetSignal(equipamento = 'modem'): Promise<DiagnosticoRede> {
    const inicio = Date.now();
    const atraso = 2000 + Math.floor(Math.random() * 1000);
    this.logger.log(`Diagnostico remoto iniciado (${equipamento}), latencia simulada ${atraso}ms`);
    await new Promise((r) => setTimeout(r, atraso));

    const duracao = Date.now() - inicio;
    return {
      equipamento,
      status_inicial: 'INSTAVEL',
      status_final: 'ONLINE',
      acao_executada: 'RESET_REMOTO_SINAL',
      mensagem:
        'Reset remoto enviado ao equipamento. Sinal normalizado e sincronizacao restabelecida na porta do cliente.',
      potencia_sinal_dbm: -18,
      latencia_ms: 12,
      reset_id: `RST-${Date.now().toString(36).toUpperCase()}`,
      duracao_diagnostico_ms: duracao,
    };
  }

  /** Catalogo comercial elegivel para o perfil do cliente. */
  async listarOfertas(filtro?: string): Promise<Oferta[]> {
    await new Promise((r) => setTimeout(r, 250));

    const catalogo: Oferta[] = [
      {
        id: 'CLARO_TV_MAIS_HBO',
        nome: 'Claro tv+ com HBO Max',
        descricao: 'Todo o catalogo HBO Max integrado ao Claro tv+, sem aparelho adicional.',
        preco_mensal: 49.9,
        preco_formatado: 'R$ 49,90/mes',
        beneficios: [
          'Catalogo completo HBO Max',
          'Assistir em 2 telas simultaneas',
          'Primeiro mes gratuito',
          'Cobrado na mesma fatura da banda larga',
        ],
        fidelidade_meses: 0,
        elegivel: true,
      },
      {
        id: 'CLARO_TV_MAIS_NETFLIX',
        nome: 'Claro tv+ com Netflix Padrao',
        descricao: 'Netflix Padrao com cobranca unificada na fatura Claro.',
        preco_mensal: 44.9,
        preco_formatado: 'R$ 44,90/mes',
        beneficios: ['Netflix Padrao Full HD', 'Cobranca unificada'],
        fidelidade_meses: 0,
        elegivel: true,
      },
      {
        id: 'COMBO_STREAMING_TOTAL',
        nome: 'Combo Streaming Total',
        descricao: 'HBO Max + Paramount+ + Globoplay em um unico pacote.',
        preco_mensal: 79.9,
        preco_formatado: 'R$ 79,90/mes',
        beneficios: ['3 servicos de streaming', 'Economia de 32% frente a contratacao avulsa'],
        fidelidade_meses: 12,
        elegivel: true,
      },
    ];

    if (!filtro) return catalogo;
    const termo = filtro.toLowerCase();
    const filtrado = catalogo.filter(
      (o) => o.nome.toLowerCase().includes(termo) || o.descricao.toLowerCase().includes(termo),
    );
    return filtrado.length ? filtrado : catalogo;
  }

  /** Melhor oferta para a entidade de servico extraida pelo NLU. */
  async melhorOferta(servico?: string): Promise<Oferta> {
    const ofertas = await this.listarOfertas(servico);
    return ofertas[0];
  }
}
