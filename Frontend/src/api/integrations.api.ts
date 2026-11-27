import { apiClient } from './client';

export interface MetaConnectionStatus {
  provider: 'meta';
  status: 'connected' | 'disconnected' | 'configured' | 'pending';
  pageId?: string;
  pageName?: string;
  subscribedFormsCount: number;
  lastSyncAt?: string;
}

export interface MetaConfigurePayload {
  appId: string;
  pageId: string;
  pageName?: string;
  appSecret?: string;
  accessToken?: string;
  webhookVerifyToken: string;
  subscribedForms?: string[];
}

export interface WhatsAppConnectionStatus {
  provider: 'whatsapp';
  status: 'connected' | 'disconnected' | 'connecting' | 'qr_ready' | 'pending';
  sessionName?: string;
  connectedPhone?: string;
  lastSeen?: string;
  activeSession: boolean;
  qrCode?: string;
  pairingCode?: string;
}

export interface WhatsAppSendMessagePayload {
  recipientPhone: string;
  messageText: string;
  leadId?: string;
}

export interface WhatsAppSendMessageResponse {
  messageId: string;
  status: 'queued' | 'sent';
  leadId?: string;
  recipientPhone: string;
}

export const integrationsApi = {
  getMetaStatus: () => apiClient.get<MetaConnectionStatus>('/integrations/meta/status'),

  configureMeta: (config: MetaConfigurePayload) =>
    apiClient.post<MetaConnectionStatus>('/integrations/meta/configure', config),

  getWhatsAppStatus: () =>
    apiClient.get<WhatsAppConnectionStatus>('/integrations/whatsapp/status'),

  initWhatsAppSession: () =>
    apiClient.post<WhatsAppConnectionStatus>('/integrations/whatsapp/session/init'),

  sendWhatsAppMessage: (payload: WhatsAppSendMessagePayload) =>
    apiClient.post<WhatsAppSendMessageResponse>('/integrations/whatsapp/messages/send', payload),
};
