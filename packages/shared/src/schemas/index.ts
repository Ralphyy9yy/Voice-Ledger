import { z } from 'zod';

export const transactionTypeSchema = z.enum(['sale', 'expense']);
export const moneyCentavosSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const lineItemInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  quantity: z.number().int().positive().max(100_000),
  unitPriceCentavos: moneyCentavosSchema,
  sourceExcerpt: z.string().max(500).optional()
});
export const extractionSchema = z.object({
  type: transactionTypeSchema.nullable(),
  items: z.array(lineItemInputSchema.extend({
    name: z.string().trim().max(160),
    quantity: lineItemInputSchema.shape.quantity.nullable(),
    unitPriceCentavos: moneyCentavosSchema.nullable()
  })).max(50),
  note: z.string().trim().max(1000).nullable().optional(),
  statedTotalCentavos: moneyCentavosSchema.nullable().optional(),
  missingFields: z.array(z.enum(['type', 'item', 'quantity', 'unitPrice'])).default([]),
  ambiguities: z.array(z.string().max(300)).default([]),
  sourceExcerpts: z.array(z.string().max(500)).default([])
});
export const extractRequestSchema = z.object({ text: z.string().trim().min(1).max(10_000) });
export const reportQuerySchema = z.object({from:z.string().date(),to:z.string().date()}).refine(
 ({from,to})=>from<=to&&Date.parse(to)-Date.parse(from)<=365*86400000,
 {message:'Choose an ordered date range of at most 366 days.',path:['to']}
);
export type ReportDay={date:string;salesCentavos:number;expensesCentavos:number;netCentavos:number;count:number};
export type Report={from:string;to:string;totals:Omit<ReportDay,'date'>;days:ReportDay[]};
export const createTransactionSchema = z.object({
  idempotencyKey: z.string().uuid(), type: transactionTypeSchema,
  items: z.array(lineItemInputSchema.omit({sourceExcerpt:true})).min(1).max(50),
  note: z.string().trim().max(1000).optional(), transcript: z.string().max(10_000).optional(),
  statedTotalCentavos: moneyCentavosSchema.optional()
});
export const listTransactionQuerySchema = z.object({
  search: z.string().max(200).optional(), type: transactionTypeSchema.optional(),
  from: z.string().date().optional(), to: z.string().date().optional(), limit: z.coerce.number().int().min(1).max(200).default(50)
});
export const updateTransactionSchema = createTransactionSchema.omit({idempotencyKey:true}).extend({ reason: z.string().trim().min(1).max(500), expectedUpdatedAt: z.string().datetime() });
export const voidTransactionSchema = z.object({ reason: z.string().trim().min(1).max(500) });

export type Extraction = z.infer<typeof extractionSchema>;
export type CreateTransaction = z.infer<typeof createTransactionSchema>;
export type TransactionType = z.infer<typeof transactionTypeSchema>;
