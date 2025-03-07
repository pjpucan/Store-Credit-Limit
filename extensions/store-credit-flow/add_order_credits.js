/**
 * Shopify Flow Script: Add Credits After Order
 * 
 * This script adds rebate credits to a customer's account after an order is paid.
 * It's designed to be triggered by Shopify Flow when an order is paid.
 */

// Configuration
const CREDIT_TIERS = [
  { threshold: 50000, percentage: 0.04 },  // 4% for $50,000+
  { threshold: 20000, percentage: 0.035 }, // 3.5% for $20,000+
  { threshold: 10000, percentage: 0.02 },  // 2% for $10,000+
  { threshold: 0, percentage: 0 }          // No rebate for less than $10,000
];

/**
 * Calculate rebate percentage based on order amount
 * @param {number} orderAmount - Total order amount
 * @returns {number} Rebate percentage
 */
function calculateRebatePercentage(orderAmount) {
  for (const tier of CREDIT_TIERS) {
    if (orderAmount >= tier.threshold) {
      return tier.percentage;
    }
  }
  return 0;
}

/**
 * Calculate rebate credits for an order
 * @param {number} orderAmount - Total order amount
 * @returns {number} Rebate credits earned
 */
function calculateOrderRebate(orderAmount) {
  const rebatePercentage = calculateRebatePercentage(orderAmount);
  return orderAmount * rebatePercentage;
}

/**
 * Main function to process credits for an order
 * This is called by Shopify Flow
 */
exports.main = async (input) => {
  try {
    const { shop, apiVersion, payload } = input;
    const { order_id, customer_id, order_total } = payload;
    
    // Convert order total to a number
    const orderAmount = parseFloat(order_total);
    
    // Calculate rebate credits
    const rebateCredits = calculateOrderRebate(orderAmount);
    
    // Skip if no rebate earned
    if (rebateCredits <= 0) {
      return { 
        success: true, 
        message: `No rebate credits earned for order ${order_id} (amount: ${orderAmount})` 
      };
    }
    
    // Get current customer credits
    const currentCredits = await getCustomerCredits(shop, apiVersion, customer_id);
    
    // Update customer credits
    const newCreditTotal = currentCredits + rebateCredits;
    await updateCustomerCredits(shop, apiVersion, customer_id, newCreditTotal);
    
    // Add to credit history
    const rebatePercentage = calculateRebatePercentage(orderAmount);
    await addCreditTransaction(
      shop, 
      apiVersion, 
      customer_id, 
      rebateCredits, 
      'earned', 
      `Rebate for order #${order_id} (${(rebatePercentage * 100).toFixed(2)}% of $${orderAmount.toFixed(2)})`
    );
    
    return { 
      success: true, 
      message: `Added ${rebateCredits.toFixed(2)} credits for order ${order_id}`,
      credits_added: rebateCredits,
      new_credit_total: newCreditTotal
    };
  } catch (error) {
    console.error('Error processing order credits:', error);
    return { success: false, message: error.message };
  }
};

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
  
  try {
    // Placeholder implementation - in a real scenario, you would query the API
    // and parse the response to get the current credits
    
    // For demonstration, we'll return a random value
    return Math.floor(Math.random() * 1000); // Random credits between 0-1000
  } catch (error) {
    console.error('Error fetching customer credits:', error);
    return 0; // Default to 0 credits if there's an error
  }
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
