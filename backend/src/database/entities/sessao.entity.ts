import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { DATETIME_TYPE } from '../../config/configuration';
import { Cliente } from './cliente.entity';
import { Mensagem } from './mensagem.entity';

export type StatusSessao = 'ATIVA' | 'HANDOFF' | 'ENCERRADA';
export type CanalOrigem = 'WHATSAPP' | 'APP_MINHA_CLARO' | 'PORTAL_WEB';

@Entity('sessao')
export class Sessao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  id_cliente: number;

  @ManyToOne(() => Cliente, (c) => c.sessoes)
  @JoinColumn({ name: 'id_cliente' })
  cliente: Cliente;

  @Column({ default: 'WHATSAPP' })
  canal_origem: CanalOrigem;

  @Column({ default: 'ATIVA' })
  status_sessao: StatusSessao;

  @CreateDateColumn()
  data_inicio: Date;

  @Column({ type: DATETIME_TYPE as any, nullable: true })
  data_fim: Date | null;

  @OneToMany(() => Mensagem, (m) => m.sessao)
  mensagens: Mensagem[];
}
