import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cliente, Protocolo } from './entities';

/**
 * Popula o banco com o cliente e o historico usados na demonstracao da banca.
 * Idempotente: se o CPF ja existe, nao faz nada.
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Cliente) private readonly clientes: Repository<Cliente>,
    @InjectRepository(Protocolo) private readonly protocolos: Repository<Protocolo>,
  ) {}

  async onApplicationBootstrap() {
    await this.run();
  }

  async run() {
    const CPF = '41276308894';
    const existente = await this.clientes.findOne({ where: { cpf_cnpj: CPF } });
    if (existente) {
      this.logger.log(`Seed ja aplicado (cliente #${existente.id} - ${existente.nome})`);
      return existente;
    }

    const cliente = await this.clientes.save(
      this.clientes.create({
        cpf_cnpj: CPF,
        nome: 'Lucas Henrique Ferreira',
        telefone: '+5511992314872',
        email: 'lucas.ferreira@exemplo.com.br',
        tipo_contrato: 'RESIDENCIAL',
        plano_ativo: 'Fibra 600 Mb - Residencial',
        endereco: 'R. das Palmeiras, 342 - SP',
        cliente_desde: 'mar. 2021',
        ultima_os: '12 nov. 2024 - Tecnico',
        status_conta: 'REGULAR',
      }),
    );

    await this.protocolos.save([
      this.protocolos.create({
        numero_protocolo: '2024-11207',
        id_cliente: cliente.id,
        status: 'RESOLVIDO',
        assunto: 'Visita tecnica - substituicao de cabo',
        origem: 'O.S.',
        data_abertura: new Date('2024-11-12T10:00:00'),
      }),
      this.protocolos.create({
        numero_protocolo: '2024-08033',
        id_cliente: cliente.id,
        status: 'RESOLVIDO',
        assunto: 'Solicitacao de 2a via de fatura',
        origem: 'Chat',
        data_abertura: new Date('2024-08-03T14:20:00'),
      }),
      this.protocolos.create({
        numero_protocolo: '2024-05119',
        id_cliente: cliente.id,
        status: 'RESOLVIDO',
        assunto: 'Upgrade de plano - 300 para 600 Mb',
        origem: 'App',
        data_abertura: new Date('2024-05-19T09:05:00'),
      }),
    ]);

    // Carteira de apoio para a demonstracao: sem ela, todo chamado novo cai em
    // "Cliente nao identificado" e a fila fica ilegivel na tela.
    const outros = await this.clientes.save([
      this.clientes.create({
        cpf_cnpj: '28840193077',
        nome: 'Mariana Alves Prado',
        telefone: '+5511955551111',
        email: 'mariana.prado@exemplo.com.br',
        tipo_contrato: 'RESIDENCIAL',
        plano_ativo: 'Fibra 300 Mb - Residencial',
        endereco: 'Av. Sao Joao, 1180 - SP',
        cliente_desde: 'jul. 2023',
        ultima_os: 'sem O.S. registrada',
        status_conta: 'REGULAR',
      }),
      this.clientes.create({
        cpf_cnpj: '63910284055',
        nome: 'Carlos Eduardo Nunes',
        telefone: '+5511944442222',
        email: 'carlos.nunes@exemplo.com.br',
        tipo_contrato: 'RESIDENCIAL',
        plano_ativo: 'Fibra 1 Giga - Residencial',
        endereco: 'R. Vergueiro, 2270 - SP',
        cliente_desde: 'jan. 2019',
        ultima_os: '28 set. 2025 - Tecnico',
        status_conta: 'REGULAR',
      }),
      this.clientes.create({
        cpf_cnpj: '50172936088',
        nome: 'Juliana Ribeiro Matos',
        telefone: '+5511933331111',
        email: 'juliana.matos@exemplo.com.br',
        tipo_contrato: 'RESIDENCIAL',
        plano_ativo: 'Fibra 600 Mb - Residencial',
        endereco: 'R. Harmonia, 95 - SP',
        cliente_desde: 'out. 2024',
        ultima_os: 'sem O.S. registrada',
        status_conta: 'REGULAR',
      }),
      this.clientes.create({
        cpf_cnpj: '71529408022',
        nome: 'Roberto Carvalho Lima',
        telefone: '+5511922220000',
        email: 'roberto.lima@exemplo.com.br',
        tipo_contrato: 'EMPRESARIAL',
        plano_ativo: 'Fibra 1 Giga - Empresarial',
        endereco: 'Al. Santos, 745 - SP',
        cliente_desde: 'fev. 2020',
        ultima_os: '03 jan. 2026 - Tecnico',
        status_conta: 'INADIMPLENTE',
      }),
    ]);

    // Carlos tambem e reincidente: dois chamados anteriores pesam na prioridade.
    const carlos = outros.find((c) => c.nome.startsWith('Carlos'));
    await this.protocolos.save([
      this.protocolos.create({
        numero_protocolo: '2025-09884',
        id_cliente: carlos.id,
        status: 'RESOLVIDO',
        assunto: 'Queda recorrente de sinal - troca de ONT',
        origem: 'O.S.',
        data_abertura: new Date('2025-09-28T11:30:00'),
      }),
      this.protocolos.create({
        numero_protocolo: '2025-07412',
        id_cliente: carlos.id,
        status: 'RESOLVIDO',
        assunto: 'Lentidao no periodo da noite',
        origem: 'Chat',
        data_abertura: new Date('2025-07-14T20:10:00'),
      }),
    ]);

    this.logger.log(
      `Seed aplicado: ${1 + outros.length} clientes (${cliente.nome} + ${outros.length}) e 5 protocolos historicos`,
    );
    return cliente;
  }
}
