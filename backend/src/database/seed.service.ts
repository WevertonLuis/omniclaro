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

    this.logger.log(`Seed aplicado: cliente #${cliente.id} (${cliente.nome}) + 3 protocolos`);
    return cliente;
  }
}
