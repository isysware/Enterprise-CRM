import { AIAssistantRequest, AIAssistantResponse } from '../components/ai/types';

/**
 * Enterprise AI Assistant Client Service Boundary
 *
 * NOTE: There is currently NO production backend AI service.
 * The production endpoint `POST /api/ai/assistant` will be mounted
 * in the Node.js/Express backend phase.
 *
 * This client service:
 * 1. Validates request structure client-side
 * 2. Prepares the payload for future backend routing
 * 3. Does NOT call any external LLM directly from the browser
 * 4. Does NOT fabricate responses or simulate typing
 * 5. Returns a structured AI_BACKEND_NOT_CONNECTED state.
 */
class AIAssistantService {
  private readonly endpoint = '/api/ai/assistant';

  /**
   * Dispatches the user prompt with safe authorized context to the assistant boundary.
   */
  async sendMessage(request: AIAssistantRequest): Promise<AIAssistantResponse> {
    // Basic validation of safe payload
    if (!request.userMessage || !request.userMessage.trim()) {
      return {
        success: false,
        errorCode: 'INVALID_REQUEST',
        message: 'Please provide a message or question.'
      };
    }

    // In this frontend-only phase, we return a controlled backend-not-connected contract.
    // We simulate network dispatch timing (250ms) to ensure UI lifecycle handles async states smoothly,
    // but we do NOT fabricate an AI answer.
    await new Promise(resolve => setTimeout(resolve, 250));

    return {
      success: false,
      errorCode: 'AI_BACKEND_NOT_CONNECTED',
      message:
        'AI Assistant is ready in the CRM interface. The secure AI service will be connected during backend integration.'
    };
  }

  /**
   * Health check for assistant service status.
   */
  async checkConnectionStatus(): Promise<{ connected: boolean; statusText: string }> {
    return {
      connected: false,
      statusText: 'AI backend not connected'
    };
  }
}

export const aiAssistantService = new AIAssistantService();
