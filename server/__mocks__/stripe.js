// __mocks__/stripe.js

class PaymentIntentsMock {
  async create() {
    return {
      id: 'pi_test_123',
      client_secret: 'pi_test_123_secret_abc',
      status: 'succeeded'
    };
  }
  async retrieve(id) {
    if (id === 'pi_test_123') {
      return {
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret_abc',
        status: 'succeeded'
      };
    }
    throw new Error('Payment intent not found');
  }
}

class RefundsMock {
  async create() {
    return {
      id: 'ref_123',
      status: 'succeeded'
    };
  }
}

function Stripe() {
  return {
    paymentIntents: new PaymentIntentsMock(),
    refunds: new RefundsMock()
  };
}

module.exports = Stripe; 