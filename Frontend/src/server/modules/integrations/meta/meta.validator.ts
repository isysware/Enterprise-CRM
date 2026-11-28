import { z } from 'zod';

export const metaConfigureSchema = z.object({
  appId: z.string().min(1, 'App ID required').optional(),
  pageId: z.string().min(1, 'Page ID required'),
  pageName: z.string().optional(),
  webhookVerifyToken: z.string().min(8, 'Verify token must be at least 8 characters'),
  subscribedForms: z.array(z.string()).default([]),
});

export const metaWebhookQuerySchema = z.object({
  'hub.mode': z.string().optional(),
  'hub.challenge': z.string().optional(),
  'hub.verify_token': z.string().optional(),
});

export const metaLeadWebhookEntrySchema = z.object({
  entry: z
    .array(
      z.object({
        id: z.string(),
        time: z.number().optional(),
        changes: z.array(
          z.object({
            field: z.string(),
            value: z.object({
              leadgen_id: z.string(),
              page_id: z.string(),
              form_id: z.string(),
              created_time: z.number().optional(),
              ad_id: z.string().optional(),
              adgroup_id: z.string().optional(),
              campaign_id: z.string().optional(),
              field_data: z
                .array(
                  z.object({
                    name: z.string(),
                    values: z.array(z.string()),
                  })
                )
                .optional(),
            }),
          })
        ),
      })
    )
    .optional(),
});

export type MetaConfigureInput = z.infer<typeof metaConfigureSchema>;
export type MetaWebhookQuery = z.infer<typeof metaWebhookQuerySchema>;
export type MetaWebhookPayload = z.infer<typeof metaLeadWebhookEntrySchema>;

export interface MetaConnectionStatus {
  provider: 'meta';
  status: 'connected' | 'disconnected' | 'configured';
  pageId?: string;
  pageName?: string;
  subscribedFormsCount: number;
  lastSyncAt?: string;
}
