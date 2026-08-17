import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    // Handle mock sessions
    if (sessionId.startsWith('mock_session_')) {
      const reportId = sessionId.replace('mock_session_', '');
      return NextResponse.json({ success: true, reportId, isMock: true });
    }

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe client is not configured' }, { status: 500 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      return NextResponse.json({
        success: true,
        reportId: session.metadata?.reportId || null,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Payment not completed',
      });
    }
  } catch (err: any) {
    console.error('Stripe verification error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
