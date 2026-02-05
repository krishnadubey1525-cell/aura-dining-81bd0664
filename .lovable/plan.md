

# Razorpay Payment Gateway Integration for Reservations

## Overview
Add Razorpay payment processing after reservation submission. Users will complete their reservation details, then proceed to pay a booking fee/deposit before the reservation is confirmed.

---

## User Flow

1. User fills out reservation form (name, phone, date, time, party size, etc.)
2. User clicks "Confirm & Pay" button
3. Razorpay checkout modal opens with booking fee amount
4. User completes payment via Razorpay (card, UPI, netbanking, etc.)
5. On successful payment → Reservation saved to database with payment details
6. User sees confirmation screen with payment receipt info

---

## Implementation Steps

### Step 1: Store Razorpay API Keys
Request two secrets from you:
- **RAZORPAY_KEY_ID** - Your Razorpay Key ID (starts with `rzp_test_` or `rzp_live_`)
- **RAZORPAY_KEY_SECRET** - Your Razorpay Key Secret

You can get these from your [Razorpay Dashboard](https://dashboard.razorpay.com/app/keys).

### Step 2: Create Database Migration
Add columns to the `reservations` table to track payments:
- `payment_status` (pending, paid, failed)
- `razorpay_order_id` 
- `razorpay_payment_id`
- `payment_amount`

### Step 3: Create Edge Function for Razorpay
Create `supabase/functions/razorpay-order/index.ts`:
- Create Razorpay order using their API
- Return order ID to frontend for checkout
- Handle payment verification webhook/callback

### Step 4: Update Reservation Page
Modify `src/pages/ReservationsPage.tsx`:
- Add `react-razorpay` npm package
- Change form flow to create payment before saving reservation
- Open Razorpay checkout modal after form validation
- Save reservation with payment details on success

### Step 5: Handle Payment Verification
- Verify payment signature on backend
- Update reservation status based on payment outcome

---

## Technical Details

### New Edge Function Structure
```
supabase/functions/razorpay-order/index.ts
├── POST /create-order - Creates Razorpay order
└── POST /verify-payment - Verifies payment & saves reservation
```

### Frontend Integration
Using `react-razorpay` hook:
- Load Razorpay script dynamically
- Configure checkout options (amount, currency, prefill data)
- Handle success/failure callbacks

### Payment Amount
The booking fee/deposit amount can be:
- Fixed amount (e.g., ₹500 per reservation)
- Per-person amount (e.g., ₹100 × party size)
- Configurable via admin settings

---

## Required from You
1. **Razorpay Account** - Create one at [razorpay.com](https://razorpay.com) if you don't have it
2. **API Keys** - From Razorpay Dashboard → Settings → API Keys
3. **Booking Fee Amount** - How much to charge per reservation

