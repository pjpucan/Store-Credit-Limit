# Store Credit Limit

A Shopify Theme implementation for Store Credit functionality with specific rules for credit usage and accumulation.

## Features

- **Credit Accumulation**: Customers earn rebate credits based on their monthly spending tiers
- **Credit Usage Limits**: Customers can only use credits up to 20% of their purchase amount
- **Next Month Rule**: Credits earned in the current month can only be used in following months
- **No Expiry**: Store credits never expire
- **Checkout Integration**: Credits are applied as discounts during checkout

## Implementation Components

1. **Metafields**: Store customer credit balances and transaction history
2. **Shopify Flow**: Automate credit calculations and updates
3. **Discount Function**: Apply credits at checkout with usage rules
4. **StoreCreditManager**: JavaScript class for frontend credit management

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
   - Namespace: `customer`, Key: `store_credits`, Type: `decimal_number`
   - Namespace: `customer`, Key: `credit_history`, Type: `json`

### 2. Shopify Flow Configuration

1. Go to Shopify Admin > Apps > Shopify Flow
2. Create two workflows:
   - **Monthly Credit Calculation**: Runs on the last day of each month
   - **Order Credit Calculation**: Runs when an order is paid

### 3. Discount Function Deployment

1. Use Shopify CLI to deploy the discount function:
   ```bash
   cd extensions/store-credit-discount
   shopify app deploy
   ```

2. In Shopify Admin, activate the discount function under Discounts > Functions

## File Structure

- `src/js/store-credit.js`: Frontend StoreCreditManager class
- `extensions/store-credit-discount/`: Shopify Discount Function
- `extensions/store-credit-flow/`: Shopify Flow configuration and scripts
