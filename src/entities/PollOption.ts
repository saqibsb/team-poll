// src/entities/PollOption.ts

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import { Poll } from "./Poll";
import { Vote } from "./Vote";

@Entity("poll_options")
export class PollOption {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255 })
  text: string;

  @Column({ type: "int", default: 0 })
  count: number;

  @ManyToOne(() => Poll, poll => poll.options, { onDelete: "CASCADE" })
  @JoinColumn({ name: "poll_id" })
  poll: Poll;

  @Column({ name: "poll_id" })
  pollId: string;

  @OneToMany(() => Vote, vote => vote.option)
  votes: Vote[];
}