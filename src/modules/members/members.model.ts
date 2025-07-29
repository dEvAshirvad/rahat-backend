import z from 'zod';
import mongoose, { model, Schema } from 'mongoose';

const zMember = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  departmentSlug: z.string().min(1),
  role: z.string().min(1),
  metadata: z.record(z.string(), z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
});
const zMemberCreate = zMember.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Member = z.infer<typeof zMember>;
export type MemberCreate = z.infer<typeof zMemberCreate>;
