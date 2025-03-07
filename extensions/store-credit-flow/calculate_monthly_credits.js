/**
 * Shopify Flow Script: Calculate Monthly Store Credits
 * 
 * This script calculates monthly rebate credits for customers based on their spending.
 * It's designed to be run via Shopify Flow on a monthly schedule.
 */

// Configuration
const CREDIT_TIERS = [
  { threshold: 50000, percentage: 0.04 },  // 4% for $50,000+
  { threshold: 20000, percentage: 0.035 }, // 3.5% for $20,000+
  { threshold: 10000, percentage: 0.02 },  // 2% for $10,000+
  { threshold: 0, percentage: 0 }          // No rebate for less than $10,000
];

/**
 * Calculate rebate percentage based on monthly spend
 * @param {number} monthlySpend - Total spend for the month
 * @returns {number} Rebate percentage
 */
function calculateRebatePercentage(monthlySpend) {
  for (const tier of CREDIT_TIERS) {
    if (monthlySpend >= tier.threshold) {
      return tier.percentage;
    }
  }
  return 0;
}

/**
 * Calculate monthly rebate credits
 * @param {number} monthlySpend - Total spend for the month
 * @returns {number} Rebate credits earned
 */
function calculateMonthlyRebate(monthlySpend) {
  const rebatePercentage = calculateRebatePercentage(monthlySpend);
  return monthlySpend * rebatePercentage;
}

/**
 * Main function to process monthly credits for all customers
 * This is called by Shopify Flow
 */
exports.main = async (input) => {
  try {
    const { shop, apiVersion } = input;
    const now = new Date();
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    // Format date ranges for the previous month
    const startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
    const endDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
    
    const startDateFormatted = startDate.toISOString().split('T')[0];
    const endDateFormatted = endDate.toISOString().split('T')[0];
    
    // Get all customers with orders in the previous month
    const customersWithOrders = await getCustomersWithOrders(shop, apiVersion, startDateFormatted, endDateFormatted);
    
    // Process each customer
    for (const customer of customersWithOrders) {
      await processCustomerCredits(shop, apiVersion, customer, startDateFormatted, endDateFormatted);
    }
    
    return { success: true, message: `Processed monthly credits for ${customersWithOrders.length} customers` };
  } catch (error) {
    console.error('Error processing monthly credits:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Get all customers who placed orders in the specified date range
 */
async function getCustomersWithOrders(shop, apiVersion, startDate, endDate) {
  // This would use the Shopify Admin API to fetch orders
  // For this example, we'll return a placeholder
  
  // In a real implementation, you would query orders and extract unique customers
  // Example GraphQL query:
  /*
  const query = `{
    orders(first: 250, query: "created_at:>=${startDate} created_at:<=${endDate}") {
      edges {
        node {
          customer {
            id
            email
          }
          totalPriceSet {
            shopMoney {
              amount
            }
          }
        }
      }
    }
  }`;
  */
  
  // Return placeholder data
  return [
    { id: 'gid://shopify/Customer/1', email: 'customer1@example.com' },
    { id: 'gid://shopify/Customer/2', email: 'customer2@example.com' }
  ];
}

/**
 * Process credits for a single customer
 */
async function processCustomerCredits(shop, apiVersion, customer, startDate, endDate) {
  try {
    // 1. Get customer's total spend for the month
    const monthlySpend = await getCustomerMonthlySpend(shop, apiVersion, customer.id, startDate, endDate);
    
    // 2. Calculate rebate credits
    const rebateCredits = calculateMonthlyRebate(monthlySpend);
    
    // Skip if no rebate earned
    if (rebateCredits <= 0) return;
    
    // 3. Get current customer credits
    const currentCredits = await getCustomerCredits(shop, apiVersion, customer.id);
    
    // 4. Update customer credits
    const newCreditTotal = currentCredits + rebateCredits;
    await updateCustomerCredits(shop, apiVersion, customer.id, newCreditTotal);
    
    // 5. Add to credit history
    await addCreditTransaction(
      shop, 
      apiVersion, 
      customer.id, 
      rebateCredits, 
      'earned', 
      `Monthly rebate for ${startDate.substring(0, 7)} (${(rebateCredits / monthlySpend * 100).toFixed(2)}% of $${monthlySpend.toFixed(2)})`
    );
    
    console.log(`Processed ${rebateCredits.toFixed(2)} credits for customer ${customer.email}`);
  } catch (error) {
    console.error(`Error processing credits for customer ${customer.id}:`, error);
  }
}

/**
 * Get customer's total spend for the month
 */
async function getCustomerMonthlySpend(shop, apiVersion, customerId, startDate, endDate) {
  // This would use the Shopify Admin API to calculate total spend
  // For this example, we'll return a placeholder value
  
  // In a real implementation, you would sum the total of all orders
  // Example GraphQL query:
  /*
  const query = `{
    orders(first: 250, query: "customer_id:${customerId} created_at:>=${startDate} created_at:<=${endDate}") {
      edges {
        node {
          totalPriceSet {
            shopMoney {
              amount
            }
          }
        }
      }
    }
  }`;
  */
  
  // Return placeholder data - in a real implementation, this would be calculated
  // For demo purposes, we'll use different amounts based on customer ID
  const customerId_num = parseInt(customerId.split('/').pop());
  if (customerId_num === 1) return 15000; // $15,000 spend (2% tier)
  if (customerId_num === 2) return 25000; // $25,000 spend (3.5% tier)
  return 5000; // Default $5,000 spend (no rebate)
}

/**
 * Get current customer credits from metafields
 */
async function getCustomerCredits(shop, apiVersion, customerId) {
  // This would use the Shopify Admin API to get customer metafields
  // For this example, we'll return a placeholder value
  
  // In a real implementation, you would query the metafield
  // Example GraphQL query:
  /*
  const query = `{
    customer(id: "${customerId}") {
      metafield(namespace: "customer", key: "store_credits") {
        value
      }
    }
  }`;
  */
  
  // Return placeholder data
  return 0; // Default to 0 credits
}

/**
 * Update customer credits in metafields
 */
async function updateCustomerCredits(shop, apiVersion, customerId, newCreditAmount) {
  // This would use the Shopify Admin API to update customer metafields
  // For this example, we'll just log the action
  
  // In a real implementation, you would update the metafield
  // Example GraphQL mutation:
  /*
  const mutation = `
    mutation {
      metafieldsSet(metafields: [
        {
          ownerId: "${customerId}",
          namespace: "customer",
          key: "store_credits",
          value: "${newCreditAmount.toString()}",
          type: "number_decimal"
        }
      ]) {
        metafields {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;
  */
  
  console.log(`Updated credits for customer ${customerId} to ${newCreditAmount.toFixed(2)}`);
}

/**
 * Add credit transaction to history
 */
async function addCreditTransaction(shop, apiVersion, customerId, amount, type, description) {
  // This would use the Shopify Admin API to update customer metafields
  // For this example, we'll just log the action
  
  // In a real implementation, you would:
  // 1. Get the current credit_history metafield
  // 2. Parse it as JSON
  // 3. Add the new transaction
  // 4. Update the metafield with the new JSON
  
  const transaction = {
    date: new Date().toISOString(),
    amount: amount,
    type: type,
    description: description
  };
  
  console.log(`Added transaction for customer ${customerId}:`, transaction);
}
