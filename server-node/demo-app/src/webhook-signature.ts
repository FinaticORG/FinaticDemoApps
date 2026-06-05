import crypto from 'node:crypto';
import express from 'express';

export function verifyFinaticWebhookSignature(params: {
  rawBody: Buffer | string;
  signatureHeader?: string;
  secret: string;
}): boolean {
  const signature = params.signatureHeader?.replace(/^sha256=/, '');
  if (!signature) return false;

  const expected = crypto
    .createHmac('sha256', params.secret)
    .update(params.rawBody)
    .digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const actualBuffer = Buffer.from(signature, 'hex');

  return (
    expectedBuffer.length === actualBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

export function createWebhookReceiver(secret = process.env.FINATIC_WEBHOOK_SECRET || '') {
  if (!secret) {
    throw new Error('FINATIC_WEBHOOK_SECRET is required for webhook verification.');
  }

  const app = express();
  app.post(
    '/webhooks/finatic',
    express.raw({ type: 'application/json' }),
    (request, response) => {
      const valid = verifyFinaticWebhookSignature({
        rawBody: request.body,
        signatureHeader: request.header('x-finatic-signature') || undefined,
        secret,
      });

      if (!valid) {
        response.status(401).json({ error: 'invalid_signature' });
        return;
      }

      const event = JSON.parse(request.body.toString('utf8'));
      response.status(202).json({ received: true, eventId: event.id || event.eventId || null });
    }
  );
  return app;
}
