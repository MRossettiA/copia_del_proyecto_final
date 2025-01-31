import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { v4 as uuid } from 'uuid';
import { User } from "./user.entity";
import { VoteCandidate } from "./voteCandidate.entity"; // Cambié a `VoteCandidate`
import { Campaign } from "./campaign.entity";

@Entity({ name: 'candidate' })
export class Candidate {
  @PrimaryGeneratedColumn('uuid')
  id: string = uuid();

  @Column({ type: "varchar", length: 20, nullable: false })
  postulation: string;

  @Column()
  imgUrl: string;

  @Column()
  list: string;

  @Column({ type: 'text', nullable: true })
  proposals: string;

  @OneToMany(() => VoteCandidate, vote => vote.candidate) 
  votes: VoteCandidate[];

  @ManyToOne(() => Campaign, (campaign) => campaign.candidates)
  campaign: Campaign;

  @OneToOne(() => User, user => user.candidate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
