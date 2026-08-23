import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Cliente } from './cliente.entity';

export type StatusProtocolo = 'ABERTO' | 'RESOLVIDO' | 'ESCALADO';

@Entity('protocolo')
export class Protocolo {
  @PrimaryColumn()
  numero_protocolo: string;

  @Column()
  id_cliente: number;

  @ManyToOne(() => Cliente, (c) => c.protocolos)
  @JoinColumn({ name: 'id_cliente' })
  cliente: Cliente;

  @Column({ nullable: true })
  id_sessao: string;

  @Column({ default: 'ABERTO' })
  status: StatusProtocolo;

  /** Rotulo exibido no bloco "Historico Recente" do dashboard. */
  @Column({ nullable: true })
  assunto: string;

  /** Chat | O.S. | App */
  @Column({ nullable: true })
  origem: string;

  @CreateDateColumn()
  data_abertura: Date;
}
