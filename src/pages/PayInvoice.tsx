import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { stripePayAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

interface PayInfo {
  invoiceId: string;
  invoiceNumber: string;
  totalAmount: number;
  balanceDue: number;
  paidAmount: number;
  customerName: string;
  currency: string;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function PaymentForm({
  amount,
  invoiceId,
  onSuccess,
  onCancel,
}: {
  amount: number;
  invoiceId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);
    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/pay/${invoiceId}/success`,
      },
    });
    setLoading(false);
    if (confirmError) {
      setError(confirmError.message ?? 'Payment failed');
      return;
    }
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={!stripe || loading} className="flex-1">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing…
            </>
          ) : (
            `Pay ${formatCurrency(amount)}`
          )}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export const PayInvoice = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [payInfo, setPayInfo] = useState<PayInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!invoiceId) return;
    stripePayAPI
      .getPayInfo(invoiceId)
      .then((data) => {
        setPayInfo(data as PayInfo);
      })
      .catch((err: any) => {
        const msg = err.response?.data?.error ?? err.response?.data?.message ?? err.message ?? 'Failed to load invoice';
        setError(typeof msg === 'string' ? msg : 'Failed to load invoice');
      })
      .finally(() => setLoading(false));
  }, [invoiceId]);

  const startPayment = async () => {
    if (!payInfo || payInfo.balanceDue <= 0) return;
    setError(null);
    try {
      const { clientSecret: secret, amount } = await stripePayAPI.createPaymentIntent({
        invoices: [{ invoiceId: payInfo.invoiceId, amount: payInfo.balanceDue }],
      });
      setClientSecret(secret);
      setPayAmount(amount);
    } catch (err: any) {
      const msg = err.response?.data?.error ?? err.response?.data?.message ?? err.message ?? 'Failed to start payment';
      setError(typeof msg === 'string' ? msg : 'Failed to start payment');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !payInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Unable to load invoice</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Payment submitted</CardTitle>
            <CardDescription>
              Your payment has been submitted. It may take a moment to appear on the invoice.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!payInfo) return null;

  if (payInfo.balanceDue <= 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invoice {payInfo.invoiceNumber}</CardTitle>
            <CardDescription>
              This invoice is already paid in full. Balance due: {formatCurrency(0)}.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Payments not configured</CardTitle>
            <CardDescription>
              Online payment is not set up. Please contact the business to pay this invoice.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Pay invoice</CardTitle>
          <CardDescription>
            {payInfo.customerName} · Invoice {payInfo.invoiceNumber}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">Balance due</p>
            <p className="text-2xl font-semibold">{formatCurrency(payInfo.balanceDue)}</p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {!clientSecret ? (
            <Button onClick={startPayment} className="w-full" size="lg">
              Pay with card
            </Button>
          ) : (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: { theme: 'stripe' },
              }}
            >
              <PaymentForm
                amount={payAmount}
                invoiceId={payInfo.invoiceId}
                onSuccess={() => setSuccess(true)}
                onCancel={() => setClientSecret(null)}
              />
            </Elements>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
