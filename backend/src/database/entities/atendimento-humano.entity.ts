import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('atendimento_humano')
export class AtendimentoHumano {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  numero_protocolo: string;

  @Column({ nullable: true })
  id_operador: string;

  @Column({ type: 'text' })
  resumo_cognitivo_ia: string;

  @Column({ type: 'int', default: 0 })
  tempo_espera_segundos: number;

  /** CSAT de 1 a 5, coletado apos o encerramento (secao 7.1 da documentacao). */
  @Column({ type: 'int', nullable: true })
  avaliacao_csat: number | null;

  /** NA_FILA | EM_ATENDIMENTO | ENCERRADO */
  @Column({ default: 'NA_FILA' })
  status: string;

  @Column({ nullable: true })
  id_sessao: string;

  @CreateDateColumn()
  data_entrada_fila: Date;
}
