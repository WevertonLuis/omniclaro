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

  /** NA_FILA | EM_ATENDIMENTO | ENCERRADO */
  @Column({ default: 'NA_FILA' })
  status: string;

  @Column({ nullable: true })
  id_sessao: string;

  @CreateDateColumn()
  data_entrada_fila: Date;
}
