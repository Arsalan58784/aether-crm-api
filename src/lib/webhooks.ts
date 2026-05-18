import { query } from './db';
import crypto from 'crypto';

/**
 * Dispatches an asynchronous, fire-and-forget outbound webhook broadcast
 * to all registered third-party receivers subscribed to a specific event type.
 * 
 * @param eventType The CRM event name (e.g. 'contact:create', 'contact:update')
 * @param payload The raw record object being transmitted
 */
export async function triggerWebhookBroadcast(eventType: string, payload: any) {
  try {
    // 1. Fetch active webhooks subscribed to the exact event, or all wildcard (*) events
    const subscriptions = await query<any[]>(
      'SELECT id, url, secret FROM webhooks WHERE is_active = 1 AND (event_type = ? OR event_type = "*")',
      [eventType]
    );

    if (!subscriptions || subscriptions.length === 0) {
      return; // No active webhook receivers registered for this event
    }

    console.log(`[Webhook Broadcaster] Found ${subscriptions.length} active subscribers for event: "${eventType}". Dispatching...`);

    // 2. Loop and fire asynchronous fetches concurrently without waiting for slow servers to respond
    subscriptions.forEach(async (sub) => {
      let statusCode = 0;
      let statusMessage = '';
      const payloadString = JSON.stringify(payload);

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Aether-Event': eventType,
          'User-Agent': 'Aether-CRM-Webhooks-Engine/1.0',
        };

        // If a shared cryptographic secret is stored, sign the payload using HMAC-SHA256
        if (sub.secret && sub.secret.trim() !== '') {
          const hmac = crypto.createHmac('sha256', sub.secret);
          hmac.update(payloadString);
          headers['X-Aether-Signature'] = hmac.digest('hex');
        }

        // Send POST request with a reasonable 8 seconds abort timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(sub.url, {
          method: 'POST',
          headers,
          body: payloadString,
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        statusCode = response.status;
        statusMessage = response.statusText || `HTTP ${response.status} OK`;
      } catch (err: any) {
        console.error(`[Webhook Broadcaster] Broadcast to "${sub.url}" failed:`, err.message || err);
        statusCode = err.name === 'AbortError' ? 408 : 500;
        statusMessage = err.message || 'Connection timeout or address unreachable';
      } finally {
        // 3. Write dynamic transaction record in the audit trail database
        try {
          await query(
            `INSERT INTO integration_logs (direction, url, event_type, payload, status_code, status_message) 
             VALUES ('outgoing', ?, ?, ?, ?, ?)`,
            [sub.url, eventType, payloadString, statusCode, statusMessage]
          );
        } catch (logErr) {
          console.error('[Webhook Broadcaster] Failed to audit integration log:', logErr);
        }
      }
    });

  } catch (error) {
    console.error('[Webhook Broadcaster] Broadcaster engine error:', error);
  }
}
