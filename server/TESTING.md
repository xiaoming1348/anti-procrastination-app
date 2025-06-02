# Testing Guide

## Automated Tests
Run the automated tests with:
```bash
npm test
```

## Manual Browser Testing

### Prerequisites
1. Start the server:
```bash
npm run dev
```

2. Start the React development server:
```bash
cd ../client
npm start
```

### Test Cases

#### 1. Successful Payment Flow
1. Log in to the application
2. Create a new task with amount $10
3. When the payment form appears, use these test card details:
   ```
   Card Number: 4242 4242 4242 4242
   Expiry: Any future date (e.g., 12/25)
   CVC: Any 3 digits (e.g., 123)
   ```
4. Verify that:
   - Payment is successful
   - Task status changes to 'active'
   - Task appears in your list

#### 2. Failed Payment Flow
1. Create another task
2. Use these test card details:
   ```
   Card Number: 4000 0000 0000 0002
   Expiry: Any future date
   CVC: Any 3 digits
   ```
3. Verify that:
   - Payment fails with appropriate error message
   - Task remains in 'pending_payment' status

#### 3. Refund Flow
1. Create a task with amount $5
2. Use the successful test card (4242 4242 4242 4242)
3. Complete the task before the deadline
4. Verify that:
   - Task status changes to 'completed'
   - Refund is processed
   - Refund status is visible in the UI

#### 4. Late Completion Flow
1. Create a task with amount $10
2. Use the successful test card
3. Wait until after the deadline
4. Complete the task
5. Verify that:
   - Task is marked as completed but late
   - No refund is processed
   - Appropriate message is displayed

### Additional Test Cards

For testing different scenarios:

```
3D Secure Authentication Required: 4000 0000 0000 3220
Insufficient Funds: 4000 0000 0000 9995
Lost Card: 4000 0000 0000 9987
Expired Card: 4000 0000 0000 0069
Incorrect CVC: 4000 0000 0000 0127
```

### Verifying Transactions

1. Log into your Stripe Dashboard
2. Go to "Payments" section
3. You'll see all test transactions
4. For each transaction, verify:
   - Payment status
   - Amount
   - Card details (last 4 digits)
   - Refund status (if applicable) 