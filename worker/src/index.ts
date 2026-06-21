/**
 * Boat-RV-Guardian Webhook Receiver
 * This Cloudflare Worker receives webhooks from Shelly sensors and forwards them to Firebase/LinkTap.
 */

export interface Env {
  // Bindings and secrets
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    try {
      const body = await request.json();
      console.log('Received webhook payload:', body);

      // TODO: Verify Shelly payload
      // TODO: Fetch user's LinkTap API key from Firebase based on device ID
      // TODO: Trigger LinkTap valve closure
      // TODO: Send push notification to user

      return new Response(JSON.stringify({ status: 'success' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (e: any) {
      console.error('Webhook error:', e);
      return new Response('Bad Request', { status: 400 });
    }
  },
};
