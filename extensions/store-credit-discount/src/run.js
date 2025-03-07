/**
 * Shopify Discount Function for Store Credits
 * 
 * This function applies store credits as a discount at checkout with the following rules:
 * 1. Maximum 20% of order total can be used as credits
 * 2. Only credits earned in previous months can be used
 * 3. Credits never expire
 */

// The main function that Shopify calls
export function run(input) {
  const configuration = JSON.parse(input.discountNode.metafield?.value || "{}");
  const CREDIT_USAGE_LIMIT = 0.20; // 20% maximum usage per order
  
  // Get customer from cart
  const customer = input.cart.buyerIdentity?.customer;
  if (!customer) {
    console.error("No customer found in cart");
    return { discountApplicationStrategy: "FIRST" };
  }
  
  // Get customer store credits from metafields
  const creditMetafield = customer.metafield?.find(
    m => m.namespace === "customer" && m.key === "store_credits"
  );
  
  if (!creditMetafield) {
    console.error("No store credits metafield found for customer");
    return { discountApplicationStrategy: "FIRST" };
  }
  
  // Parse available credits
  const availableCredits = parseFloat(creditMetafield.value) || 0;
  if (availableCredits <= 0) {
    console.error("Customer has no available credits");
    return { discountApplicationStrategy: "FIRST" };
  }
  
  // Get credit history to check if credits are from previous months
  const historyMetafield = customer.metafield?.find(
    m => m.namespace === "customer" && m.key === "credit_history"
  );
  
  let creditHistory = [];
  if (historyMetafield) {
    try {
      creditHistory = JSON.parse(historyMetafield.value) || [];
    } catch (e) {
      console.error("Failed to parse credit history", e);
    }
  }
  
  // Filter credits that are eligible for use (from previous months)
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const eligibleCredits = creditHistory.filter(transaction => {
    if (transaction.type !== "earned") return false;
    
    const transactionDate = new Date(transaction.date);
    const transactionMonth = transactionDate.getMonth();
    const transactionYear = transactionDate.getFullYear();
    
    // Credits can only be used in following months
    return transactionYear < currentYear || 
           (transactionYear === currentYear && transactionMonth < currentMonth);
  }).reduce((total, transaction) => total + transaction.amount, 0);
  
  if (eligibleCredits <= 0) {
    console.error("No eligible credits from previous months");
    return { discountApplicationStrategy: "FIRST" };
  }
  
  // Calculate maximum credit usage (20% of cart total)
  const cartTotal = input.cart.cost.subtotalAmount.amount;
  const maxCreditUsage = cartTotal * CREDIT_USAGE_LIMIT;
  
  // Determine credits to use
  const creditsToUse = Math.min(maxCreditUsage, eligibleCredits);
  
  // Create discount
  return {
    discountApplicationStrategy: "FIRST",
    discounts: [
      {
        value: {
          fixedAmount: {
            amount: creditsToUse
          }
        },
        targets: [
          {
            orderSubtotal: {
              excludedVariantIds: []
            }
          }
        ],
        message: `Applied ${creditsToUse} store credits`
      }
    ]
  };
}
