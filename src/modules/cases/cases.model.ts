import z from 'zod';
import mongoose, { model, Schema } from 'mongoose';

// Zod schemas for validation
const zVictim = z.object({
  name: z.string().min(1, 'Name is required'),
  dob: z.date(),
  dod: z.date(),
  address: z.string().min(1, 'Address is required'),
  contact: z.string().min(1, 'Contact is required'),
  description: z.string().min(1, 'Description is required'),
});

const zRemark = z.object({
  stage: z.number().min(1).max(8),
  remark: z.string(),
  userId: z.string(),
  date: z.date().default(() => new Date()),
});

const zCaseDocument = z.object({
  url: z.string(),
  type: z.string(),
  uploadedAt: z.string(),
});

const zPayment = z.object({
  status: z.enum(['completed', 'pending', 'failed']).default('completed'),
  amount: z.number().default(150000), // ₹1.5 lakh
  remark: z.string(),
  date: z.date().default(() => new Date()),
  processedBy: z.string(),
});

const zCase = z.object({
  id: z.string(),
  caseId: z.string().min(1),
  victim: zVictim,
  caseSDM: z.string().optional(), // SDM responsible for this case
  status: z
    .enum([
      'created',
      'pendingSDM',
      'pendingRahatShakha',
      'pendingOIC',
      'pendingAdditionalCollector',
      'pendingCollector',
      'pendingAdditionalCollector2',
      'pendingTehsildar',
      'closed',
      'rejected',
    ])
    .default('created'),
  stage: z.number().min(1).max(8).default(1),
  documents: z.array(zCaseDocument).default([]),
  remarks: z.array(zRemark).default([]),
  payment: zPayment.optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const zCaseCreate = zCase.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  documents: true,
  remarks: true,
});

const zDocument = z.object({
  id: z.string(),
  caseId: z.string().min(1),
  filename: z.string().min(1),
  fileId: z.string(),
  uploadedBy: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const zDocumentCreate = zDocument.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// TypeScript types
export type Victim = z.infer<typeof zVictim>;
export type Remark = z.infer<typeof zRemark>;
export type Payment = z.infer<typeof zPayment>;
export type Case = z.infer<typeof zCase>;
export type CaseCreate = z.infer<typeof zCaseCreate>;
export type CaseDocument = z.infer<typeof zCaseDocument>;
export type Document = z.infer<typeof zDocument>;
export type DocumentCreate = z.infer<typeof zDocumentCreate>;

// Mongoose schemas
const victimSchema = new Schema<Victim>({
  name: { type: String, required: true },
  dob: { type: Date, required: true },
  dod: { type: Date, required: true },
  address: { type: String, required: true },
  contact: { type: String, required: true },
  description: { type: String, required: true },
});

const remarkSchema = new Schema<Remark>({
  stage: { type: Number, required: true, min: 1, max: 10 },
  remark: { type: String, required: true },
  userId: { type: String, required: true },
  date: { type: Date, default: Date.now },
});

const caseDocumentSchema = new Schema({
  url: { type: String, required: true },
  type: { type: String, required: true },
  uploadedAt: { type: String, required: true },
});

const paymentSchema = new Schema({
  status: {
    type: String,
    default: 'completed',
    enum: ['completed', 'pending', 'failed'],
  },
  amount: { type: Number, default: 150000 }, // ₹1.5 lakh
  remark: { type: String, required: true },
  date: { type: Date, default: Date.now },
  processedBy: { type: String, required: true },
});

const caseSchema = new Schema<Case>(
  {
    caseId: { type: String, unique: true, required: true },
    victim: { type: victimSchema, required: true },
    caseSDM: { type: String }, // SDM responsible for this case
    status: {
      type: String,
      default: 'created',
      enum: [
        'created',
        'pendingSDM',
        'pendingRahatShakha',
        'pendingOIC',
        'pendingAdditionalCollector',
        'pendingCollector',
        'pendingAdditionalCollector2',
        'pendingTehsildar',
        'closed',
        'rejected',
      ],
    },
    stage: { type: Number, default: 1, min: 1, max: 8 },
    documents: [caseDocumentSchema],
    remarks: [remarkSchema],
    payment: paymentSchema,
  },
  {
    timestamps: true,
    collection: 'cases',
  }
);

// Indexes for performance
caseSchema.index({ caseId: 1 });

// Export models
export const CaseModel = model<Case>('tb_cases', caseSchema);

// Export Zod schemas for validation
export { zCase, zCaseCreate, zDocument, zDocumentCreate, zVictim };
