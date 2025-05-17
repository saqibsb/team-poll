// src/entities/Poll.ts

import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";
import { PollOption } from "./PollOption";
import { Vote } from "./Vote";

@Entity("polls")
export class Poll {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 500 })
  question: string;

  @Index()
  @Column({ type: "timestamp" })
  expiresAt: Date;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "int", default: 0 })
  totalVotes: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => PollOption, option => option.poll, { 
    cascade: true,
    eager: true
  })
  options: PollOption[];

  @OneToMany(() => Vote, vote => vote.poll)
  votes: Vote[];

  /**
   * Check if the poll is expired
   */
  isExpired(): boolean {
    return new Date() >= this.expiresAt;
  }

  /**
   * Check if the poll is still open for voting
   */
  isOpen(): boolean {
    return this.isActive && !this.isExpired();
  }

  /**
   * Convert to public-safe object
   */
  toPublic(): Record<string, any> {
    return {
      id: this.id,
      question: this.question,
      options: this.options.map(option => ({
        id: option.id,
        text: option.text,
        count: option.count
      })),
      expiresAt: this.expiresAt,
      isActive: this.isActive && !this.isExpired(),
      totalVotes: this.totalVotes,
      createdAt: this.createdAt
    };
  }
}