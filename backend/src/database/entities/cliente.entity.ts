import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Sessao } from './sessao.entity';
import { Protocolo } from './protocolo.entity';

@Entity('cliente')
export class Cliente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  cpf_cnpj: string;

  @Column()
  nome: string;

  @Column()
  telefone: string;

  @Column({ nullable: true })
  email: string;

  /** RESIDENCIAL | EMPRESARIAL */
  @Column({ default: 'RESIDENCIAL' })
  tipo_contrato: string;

  // --- Campos de perfil exibidos no AI Context Panel do OmniDashboard ---
  @Column({ nullable: true })
  plano_ativo: string;

  @Column({ nullable: true })
  endereco: string;

  @Column({ nullable: true })
  cliente_desde: string;

  @Column({ nullable: true })
  ultima_os: string;

  /** REGULAR | INADIMPLENTE */
  @Column({ default: 'REGULAR' })
  status_conta: string;

  @CreateDateColumn()
  data_criacao: Date;

  @OneToMany(() => Sessao, (s) => s.cliente)
  sessoes: Sessao[];

  @OneToMany(() => Protocolo, (p) => p.cliente)
  protocolos: Protocolo[];
}
