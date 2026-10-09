import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Sessao } from './sessao.entity';
import { IntencaoExtraida } from './intencao-extraida.entity';

export type Remetente = 'CLIENTE' | 'BOT' | 'ATENDENTE';

@Entity('mensagem')
export class Mensagem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  id_sessao: string;

  @ManyToOne(() => Sessao, (s) => s.mensagens)
  @JoinColumn({ name: 'id_sessao' })
  sessao: Sessao;

  @Column()
  remetente: Remetente;

  @Column({ type: 'text' })
  conteudo_texto: string;

  /** Latencia ponta a ponta da resposta do bot, em ms. Alimenta o P95. */
  @Column({ type: 'int', nullable: true })
  latencia_ms: number | null;

  @CreateDateColumn()
  timestamp: Date;

  @OneToMany(() => IntencaoExtraida, (i) => i.mensagem)
  intencoes: IntencaoExtraida[];
}
