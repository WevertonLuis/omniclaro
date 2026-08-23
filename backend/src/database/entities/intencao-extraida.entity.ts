import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Mensagem } from './mensagem.entity';

@Entity('intencao_extraida')
export class IntencaoExtraida {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  id_mensagem: string;

  @ManyToOne(() => Mensagem, (m) => m.intencoes)
  @JoinColumn({ name: 'id_mensagem' })
  mensagem: Mensagem;

  @Column()
  nome_intencao: string;

  @Column({ type: 'real' })
  score_confianca: number;

  /** simple-json: portavel entre SQLite (TEXT) e Postgres (TEXT serializado) */
  @Column({ type: 'simple-json', nullable: true })
  payload_entidades: Record<string, unknown>;
}
