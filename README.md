# Store Credit Limit

A Shopify Theme implementation for Store Credit functionality with specific rules for credit usage and accumulation.

## Features

- **Credit Accumulation**: Customers earn rebate credits based on their monthly spending tiers
- **Credit Usage Limits**: Customers can only use credits up to 20% of their purchase amount
- **Next Month Rule**: Credits earned in the current month can only be used in following months
- **No Expiry**: Store credits never expire
- **Checkout Integration**: Credits are applied as discounts during checkout
- **Account Integration**: Customers can view their credit history in their account
- **Cart Display**: Available credits are shown on the cart page

## Implementation Components

1. **Metafields**: Store customer credit balances and transaction history
2. **Webhook Handler**: Process orders and calculate earned credits
3. **Discount Function**: Apply credits at checkout with usage rules
4. **StoreCreditManager**: JavaScript class for frontend credit management
5. **Liquid Templates**: Display credits and history on storefront
6. **Admin Interface**: Manage customer credits from Shopify Admin

## Credit Earning Tiers

| Monthly Spend | Rebate Percentage |
|---------------|-------------------|
| $50,000+      | 4.0%              |
| $20,000+      | 3.5%              |
| $10,000+      | 2.0%              |
| Under $10,000 | 0%                |

## Example Scenario

Tom spent $10,000 for 6 months from Jan to June 2024, earning 2% rebate each month:
- Total credits: ($10,000 × 2%) × 6 = $1,200

Tom then spent $20,000 for 5 months from July to November 2024, earning 3.5% rebate each month:
- Total credits: ($20,000 × 3.5%) × 5 = $3,500

In December 2024, Tom spent $50,000, earning 4% rebate:
- Total credits: $50,000 × 4% = $2,000

By January 1, 2025, Tom has accumulated $1,200 + $3,500 + $2,000 = $6,700 in store credits.

When Tom makes a $20,000 purchase on January 15, 2025, he can only use 20% of the purchase amount in credits:
- Maximum usable credits: $20,000 × 20% = $4,000
- Final checkout amount: $20,000 - $4,000 = $16,000
- Remaining credit balance: $6,700 - $4,000 = $2,700

## Prerequisites

```bash
NodeJS: v22.13.0
NPM: v10.9.2
```

## Installation

👨‍💻 Clone the repository

```bash
cd to store-credit-limit folder
npm install
```
    
## Usage

```bash
shopify auth logout
npm run start
```

## Setup Instructions

### 1. Metafield Configuration

In Shopify Admin:
1. Go to Settings > Custom data
2. Add the following metafields for customers:
   - Namespace: `custom`, Key: `rebate`, Type: `json_string`
   - Namespace: `custom`, Key: `revenu_track`, Type: `json_string`
   - Namespace: `custom`, Key: `revenu`, Type: `number_decimal`

### 2. Function Deployment

Use the included deployment script to deploy the discount function and webhook handler:

```bash
chmod +x deploy.sh
./deploy.sh
```

Alternatively, deploy each function manually:

```bash
# Deploy discount function
cd extensions/store-credit-function
npm install
shopify app function build
shopify app function deploy

# Deploy webhook handler
cd ../store-credit-webhook
npm install
shopify app function build
shopify app function deploy
```

### 3. Theme Integration

1. Add the store credit display to your cart template:
   ```liquid
   {% render 'cart-store-credit' %}
   ```

2. Add the store credit account section to your customer account template:
   ```liquid
   {% section 'store-credit-account' %}
   ```

3. Include the StoreCreditManager JavaScript in your theme:
   ```html
   <script src="{{ 'customjs.js' | asset_url }}" defer></script>
   ```

### 4. Admin Configuration

1. In Shopify Admin, activate the discount function under Apps > Functions
2. Configure the webhook under Settings > Notifications > Webhooks

## File Structure

- `src/js/customjs.js`: Frontend StoreCreditManager class
- `extensions/store-credit-function/`: Shopify Discount Function
- `extensions/store-credit-webhook/`: Webhook handler for order processing
- `snippets/store-credit-display.liquid`: General store credit display
- `snippets/cart-store-credit.liquid`: Cart-specific credit display
- `sections/store-credit-account.liquid`: Customer account credit history

## Testing

To test the store credit functionality:

1. Create a test customer account
2. Make purchases to accumulate credits (you may need to manually add credits for testing)
3. Verify that credits appear in the customer account
4. Test the checkout process to ensure credits are applied correctly
5. Verify that the 20% usage limit is enforced

## Troubleshooting

If credits are not displaying or applying correctly:

1. Check browser console for JavaScript errors
2. Verify that metafields are correctly configured
3. Ensure the discount function is properly deployed and activated
4. Check webhook logs for any processing errors
