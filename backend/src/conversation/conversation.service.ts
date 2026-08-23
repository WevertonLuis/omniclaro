import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { gerarProtocolo } from '../common/protocolo.util';
import {
  CanalOrigem,
  Cliente,
  IntencaoExtraida,
  Mensagem,
  Protocolo,
  Remetente,
  Sessao,
  StatusSessao,
} from '../database/entities';
import { IntencaoDetectada } from '../nlu/nlu.types';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    @InjectRepository(Cliente) private readonly clientes: Repository<Cliente>,
    @InjectRepository(Sessao) private readonly sessoes: Repository<Sessao>,
    @InjectRepository(Mensagem) private readonly mensagens: Repository<Mensagem>,
    @InjectRepository(IntencaoExtraida) private readonly intencoes: Repository<IntencaoExtraida>,
    @InjectRepository(Protocolo) private readonly protocolos: Repository<Protocolo>,
  ) {}

  // ----------------------------- Cliente -----------------------------

  /** Resolve o cliente pelo identificador do canal. Cria um registro leve se for numero novo. */
  async resolverCliente(params: { clienteId?: number; telefone?: string; cpf?: string }): Promise<Cliente> {
    if (params.clienteId) {
      const porId = await this.clientes.findOne({ where: { id: params.clienteId } });
      if (porId) return porId;
    }

    if (params.cpf) {
      const porCpf = await this.clientes.findOne({ where: { cpf_cnpj: params.cpf.replace(/\D/g, '') } });
      if (porCpf) return porCpf;
    }

    if (params.telefone) {
      const digitos = params.telefone.replace(/\D/g, '');
      const todos = await this.clientes.find();
      const porTelefone = todos.find((c) => c.telefone.replace(/\D/g, '').endsWith(digitos.slice(-9)));
      if (porTelefone) return porTelefone;

      return this.clientes.save(
        this.clientes.create({
          cpf_cnpj: `NAO-IDENTIFICADO-${digitos}`,
          nome: 'Cliente nao identificado',
          telefone: params.telefone,
          tipo_contrato: 'RESIDENCIAL',
          plano_ativo: 'Nao identificado',
          status_conta: 'REGULAR',
        }),
      );
    }

    // Fallback de demonstracao: primeiro cliente do seed.
    const primeiro = await this.clientes.find({ order: { id: 'ASC' }, take: 1 });
    if (primeiro.length) return primeiro[0];
    throw new Error('Nenhum cliente cadastrado. Rode `npm run seed`.');
  }

  async buscarCliente(id: number) {
    return this.clientes.findOne({ where: { id } });
  }

  // ----------------------------- Sessao ------------------------------

  async criarSessao(clienteId: number, canal: CanalOrigem): Promise<Sessao> {
    return this.sessoes.save(this.sessoes.create({ id_cliente: clienteId, canal_origem: canal, status_sessao: 'ATIVA' }));
  }

  async atualizarStatusSessao(sessionId: string, status: StatusSessao) {
    await this.sessoes.update(
      { id: sessionId },
      { status_sessao: status, ...(status === 'ENCERRADA' ? { data_fim: new Date() } : {}) },
    );
  }

  // ---------------------------- Mensagem -----------------------------

  async registrarMensagem(sessionId: string, remetente: Remetente, texto: string): Promise<Mensagem> {
    return this.mensagens.save(
      this.mensagens.create({ id_sessao: sessionId, remetente, conteudo_texto: texto }),
    );
  }

  async historico(sessionId: string): Promise<Mensagem[]> {
    return this.mensagens.find({ where: { id_sessao: sessionId }, order: { timestamp: 'ASC' } });
  }

  // --------------------------- Intencoes -----------------------------

  async registrarIntencoes(mensagemId: string, detectadas: IntencaoDetectada[]) {
    if (!detectadas.length) return [];
    return this.intencoes.save(
      detectadas.map((i) =>
        this.intencoes.create({
          id_mensagem: mensagemId,
          nome_intencao: i.nome,
          score_confianca: i.confianca,
          payload_entidades: i.entidades ?? {},
        }),
      ),
    );
  }

  // --------------------------- Protocolo -----------------------------

  async abrirProtocolo(clienteId: number, sessionId: string, assunto: string, origem = 'Chat'): Promise<Protocolo> {
    const protocolo = this.protocolos.create({
      numero_protocolo: gerarProtocolo(),
      id_cliente: clienteId,
      id_sessao: sessionId,
      status: 'ABERTO',
      assunto,
      origem,
    });
    const salvo = await this.protocolos.save(protocolo);
    this.logger.log(`Protocolo ${salvo.numero_protocolo} aberto para cliente ${clienteId}`);
    return salvo;
  }

  async atualizarStatusProtocolo(numero: string, status: 'ABERTO' | 'RESOLVIDO' | 'ESCALADO') {
    await this.protocolos.update({ numero_protocolo: numero }, { status });
  }

  async historicoProtocolos(clienteId: number, limite = 5): Promise<Protocolo[]> {
    return this.protocolos.find({
      where: { id_cliente: clienteId },
      order: { data_abertura: 'DESC' },
      take: limite,
    });
  }
}
