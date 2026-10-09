import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Regra de curadoria de NLU (secao 7.2: curadoria e ajuste fino).
 *
 * Permite corrigir classificacao sem mexer no codigo nem reimplantar:
 *  - SINONIMO: o termo passa a indicar a intencao alvo. Resolve gíria regional
 *    e jargao que o modelo nao associa ("tá mudo" = sem conexao).
 *  - BLOQUEIO: o termo impede a intencao alvo. Corrige falso positivo
 *    recorrente ("conta" puxando CONSULTA_FATURA quando era conta de acesso).
 */
export type TipoRegra = 'SINONIMO' | 'BLOQUEIO';

@Entity('regra_curadoria')
export class RegraCuradoria {
  @PrimaryGeneratedColumn()
  id: number;

  /** Termo ou expressao, ja normalizado (minusculo, sem acento). */
  @Column()
  termo: string;

  @Column()
  intencao_alvo: string;

  @Column({ default: 'SINONIMO' })
  tipo: TipoRegra;

  @Column({ default: true })
  ativo: boolean;

  @Column({ nullable: true })
  criado_por: string;

  /** Protocolo que motivou a regra, quando veio de um erro observado. */
  @Column({ nullable: true })
  origem_protocolo: string;

  /** Quantas vezes a regra ja atuou. Mede se ela esta valendo a pena. */
  @Column({ type: 'int', default: 0 })
  acionamentos: number;

  @CreateDateColumn()
  data_criacao: Date;
}
