import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Trilha de auditoria da secao 8.2 da documentacao: toda acao de consulta,
 * exportacao ou transbordo gera um registro com IP de origem, identificacao do
 * ator, timestamp e acao executada.
 *
 * O registro e imutavel por convencao: o servico so expoe insercao e leitura,
 * nunca update nem delete.
 */
export type AcaoAuditada =
  | 'LOGIN_SUCESSO'
  | 'LOGIN_FALHA'
  | 'CONSULTA_METRICAS'
  | 'CONSULTA_SESSOES'
  | 'CONSULTA_OPERADORES'
  | 'CONSULTA_AUDITORIA'
  | 'TRANSBORDO_ENFILEIRADO'
  | 'ATENDIMENTO_ASSUMIDO'
  | 'ATENDIMENTO_ENCERRADO'
  | 'AVALIACAO_CSAT'
  | 'ENTRADA_SUSPEITA'
  | 'CURADORIA_ALTERADA';

@Entity('registro_auditoria')
export class RegistroAuditoria {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  acao: AcaoAuditada;

  /** Nome ou e-mail do operador; SISTEMA quando a acao parte do orquestrador. */
  @Column()
  ator: string;

  @Column({ nullable: true })
  papel: string;

  @Column({ nullable: true })
  ip_origem: string;

  /** Recurso tocado: protocolo, id de sessao, rota consultada. */
  @Column({ nullable: true })
  recurso: string;

  /** Contexto adicional, sem dado pessoal em claro. */
  @Column({ type: 'simple-json', nullable: true })
  detalhe: Record<string, unknown>;

  @Index()
  @CreateDateColumn()
  timestamp: Date;
}
