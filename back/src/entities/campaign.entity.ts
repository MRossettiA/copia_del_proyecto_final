import { Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToOne } from 'typeorm';
import { User } from 'src/entities/user.entity';
import { Candidate } from './candidate.entity';
import { VoteUser } from './voteUser.entity';

@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 255 })
  location: string;

  @Column({ type: 'timestamp' })
  date: Date;

  @OneToMany(() => VoteUser, voteUser => voteUser.campaign) // Cambié el nombre a `voteUser`
  votes: VoteUser[];

  @ManyToOne(() => User, (user) => user.campaigns)
  user: User;

  @OneToMany(() => Candidate, (candidate) => candidate.campaign)
  candidates: Candidate[];
}
