import { z } from 'zod';

export const whatsappSendMessageSchema = z.object({
  recipientPhone: z.string().min(5, 'Valid recipient phone number is required').max(30),
  messageText: z.string().min(1, 'Message text is required').max(4000),
  leadId: z.string().uuid().optional(),
});

export const whatsappInboundMessageSchema = z.object({
  messageId: z.string().min(1, 'Message ID required'),
  senderPhone: z.string().min(5, 'Sender phone required').max(30),
  senderName: z.string().optional(),
  messageText: z.string().min(1, 'Message text required'),
  timestamp: z.string().optional(),
});

export type WhatsAppSendMessageInput = z.infer<typeof whatsappSendMessageSchema>;
export type WhatsAppInboundMessageInput = z.infer<typeof whatsappInboundMessageSchema>;

export interface WhatsAppConnectionStatus {
  provider: 'whatsapp';
  status: 'disconnected' | 'connecting' | 'connected' | 'qr_ready';
  sessionName?: string;
  connectedPhone?: string;
  lastSeen?: string;
  activeSession: boolean;
}
