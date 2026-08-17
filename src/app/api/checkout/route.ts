import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

export async function POST(req: Request) {
  try {
    const { reportId } = await req.json();

    if (!reportId) {
      return NextResponse.json({ error: 'Missing reportId' }, { status: 400 });
    }

    const origin = req.headers.get('origin') || 'http://localhost:3000';

    if (!stripe) {
      // Return mock URL for local development/testing without Stripe keys
      console.warn('STRIPE_SECRET_KEY is not set. Simulating checkout session.');
      return NextResponse.json({
        url: `${origin}/report?session_id=mock_session_${reportId}&report_id=${reportId}`,
        isMock: true,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'ChronosFeed Premium Report',
              description: 'Unlock all 45 deep TikTok metrics, time trends, and customized positive vibes.',
            },
            unit_amount: 499, // $4.99
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      metadata: {
        reportId: reportId,
      },
      success_url: `${origin}/report?session_id={CHECKOUT_SESSION_ID}&report_id=${reportId}`,
      cancel_url: `${origin}/report?payment_cancelled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error('Stripe error:', err);
    const message = err instanceof Error ? err.message : 'Unknown Stripe error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
