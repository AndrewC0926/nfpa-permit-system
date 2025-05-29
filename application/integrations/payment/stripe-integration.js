const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class PaymentService {
    constructor() {
        this.stripe = stripe;
    }

    async createPaymentIntent(permitData) {
        try {
            const amount = this.calculatePermitFee(permitData);
            
            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: amount * 100, // Convert to cents
                currency: 'usd',
                metadata: {
                    permitNumber: permitData.permitNumber,
                    permitType: permitData.permitType,
                    applicantId: permitData.applicantId
                },
                description: `NFPA Permit Fee - ${permitData.permitNumber}`,
                receipt_email: permitData.applicantEmail
            });

            return {
                clientSecret: paymentIntent.client_secret,
                amount: amount,
                permitNumber: permitData.permitNumber
            };

        } catch (error) {
            console.error('Payment intent creation failed:', error);
            throw error;
        }
    }

    calculatePermitFee(permitData) {
        const baseFees = {
            'NFPA72_COMMERCIAL': 150,
            'NFPA72_RESIDENTIAL': 75,
            'NFPA13_SPRINKLER': 200,
            'NFPA25_INSPECTION': 100,
            'NFPA101_OCCUPANCY': 125
        };

        let fee = baseFees[permitData.permitType] || 100;

        // Size-based multipliers
        if (permitData.squareFootage > 10000) fee *= 1.5;
        if (permitData.squareFootage > 50000) fee *= 2.0;

        // Expedited processing fee
        if (permitData.expedited) fee += 100;

        return Math.round(fee);
    }

    async handleWebhook(event) {
        try {
            switch (event.type) {
                case 'payment_intent.succeeded':
                    await this.handlePaymentSuccess(event.data.object);
                    break;
                case 'payment_intent.payment_failed':
                    await this.handlePaymentFailure(event.data.object);
                    break;
                default:
                    console.log(`Unhandled event type: ${event.type}`);
            }
        } catch (error) {
            console.error('Webhook handling failed:', error);
            throw error;
        }
    }

    async handlePaymentSuccess(paymentIntent) {
        const permitNumber = paymentIntent.metadata.permitNumber;
        
        // Update permit payment status in database
        // This would typically update your PostgreSQL database
        console.log(`Payment successful for permit ${permitNumber}`);
        
        // Trigger permit processing workflow
        // Send confirmation notifications
        // Update blockchain record
    }

    async handlePaymentFailure(paymentIntent) {
        const permitNumber = paymentIntent.metadata.permitNumber;
        console.log(`Payment failed for permit ${permitNumber}`);
        
        // Send payment failure notification
        // Update permit status to payment pending
    }

    async processRefund(permitNumber, amount, reason) {
        try {
            // Find the original payment
            const payments = await this.stripe.paymentIntents.list({
                limit: 100,
            });

            const originalPayment = payments.data.find(
                p => p.metadata.permitNumber === permitNumber
            );

            if (!originalPayment) {
                throw new Error('Original payment not found');
            }

            const refund = await this.stripe.refunds.create({
                payment_intent: originalPayment.id,
                amount: amount * 100, // Convert to cents
                reason: 'requested_by_customer',
                metadata: {
                    permitNumber: permitNumber,
                    refundReason: reason
                }
            });

            return {
                refundId: refund.id,
                amount: refund.amount / 100,
                status: refund.status
            };

        } catch (error) {
            console.error('Refund processing failed:', error);
            throw error;
        }
    }
}

module.exports = PaymentService;
