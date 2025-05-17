// src/entities/Vote.ts

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index, Unique } from "typeorm";
import { Poll } from "./Poll";
import { PollOption } from "./PollOption";

@Entity("votes")
@Unique(["userId", "pollId"]) // Ensure one vote per user per poll (idempotent)
@Index(["pollId"]) // Index for querying votes by poll
export class Vote {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255 })
  userId: string;

  @ManyToOne(() => Poll, poll => poll.votes, { onDelete: "CASCADE" })
  @JoinColumn({ name: "poll_id" })
  poll: Poll;

  @Column({ name: "poll_id" })
  pollId: string;

  @ManyToOne(() => PollOption, option => option.votes, { onDelete: "CASCADE" })
  @JoinColumn({ name: "option_id" })
  option: PollOption;

  @Column({ name: "option_id" })
  optionId: string;

  @CreateDateColumn()
  createdAt: Date;
}