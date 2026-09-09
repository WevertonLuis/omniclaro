import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Papeis do RBAC descrito na secao 8.2 da documentacao tecnica.
 * ROLE_NLU_ENGINEER fica fora do escopo do prototipo por nao ter tela propria.
 */
export type PapelOperador = 'OPERADOR' | 'SUPERVISOR';

@Entity('operador')
export class Operador {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  nome: string;

  /** Formato: scrypt$<salt hex>$<derivado hex>. Nunca guarda a senha em claro. */
  @Column()
  senha_hash: string;

  @Column({ default: 'OPERADOR' })
  papel: PapelOperador;

  @Column({ nullable: true })
  turno: string;

  @Column({ default: true })
  ativo: boolean;

  @CreateDateColumn()
  data_criacao: Date;
}
