// @ts-check

/**
 * Store Credit Function
 * 
 * Rules:
 * 1. Customers can only use credits up to 20% of their purchase
 * 2. Credits obtained in the current month can only be used in the following months
 * 3. Points never expire
 * 4. Discount applies on checkout
 */

/**
 * @typedef {import("../generated/api").InputQuery} InputQuery
 * @typedef {import("../generated/api").FunctionResult} FunctionResult
 * @typedef {import("../generated/api").Target} Target
 */

/**
 * @type {FunctionResult}
 */
const NO_DISCOUNT = {
  discountApplicationStrategy: "FIRST",
  discounts: [],
};

/**
 * @param {InputQuery} input
 * @returns {FunctionResult}
 */
export function run(input) {
  // Get cart and customer data
  const cart = input.cart;
  const customer = cart.buyerIdentity?.customer;

  // If no customer or cart is empty, no discount to apply
  if (!customer || !cart.lines || cart.lines.length === 0) {
    return NO_DISCOUNT;
  }

  // Get cart total
  const cartTotal = parseFloat(cart.cost.totalAmount.amount);
  const currencyCode = cart.cost.totalAmount.currencyCode;

  // Calculate maximum allowed credit (20% of cart total)
  const maxAllowedCredit = cartTotal * 0.2;

  // Get customer metafields
  const metafields = customer.metafields?.edges || [];
  
  // Find rebate metafield
  const rebateMetafield = metafields.find(
    edge => edge.node.key === "rebate"
  );

  // If no rebate metafield, no discount to apply
  if (!rebateMetafield) {
    return NO_DISCOUNT;
  }

  try {
    // Parse rebate data
    const rebateData = JSON.parse(rebateMetafield.node.value);
    
    // Calculate available credits (only from previous months)
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    let availableCredits = 0;
    
    // Sum up credits from previous months only
    Object.entries(rebateData).forEach(([yearMonth, amount]) => {
      const [year, month] = yearMonth.split('-').map(Number);
      
      // Check if this credit is from a previous month (can be used now)
      if (year < currentYear || (year === currentYear && month < currentMonth)) {
        availableCredits += parseFloat(amount);
      }
    });
    
    // If no available credits, no discount to apply
    if (availableCredits <= 0) {
      return NO_DISCOUNT;
    }
    
    // Determine credits to use (minimum of available credits and max allowed)
    const creditsToUse = Math.min(availableCredits, maxAllowedCredit);
    
    // If credits to use is too small (less than 0.01), no discount to apply
    if (creditsToUse < 0.01) {
      return NO_DISCOUNT;
    }
    
    // Create discount
    return {
      discountApplicationStrategy: "FIRST",
      discounts: [
        {
          value: {
            fixedAmount: {
              amount: creditsToUse.toString(),
              currencyCode: currencyCode,
            }
          },
          targets: [
            {
              orderSubtotal: {
                excludedVariantIds: []
              }
            }
          ],
          message: `Store credit applied: ${currencyCode} ${creditsToUse.toFixed(2)}`
        }
      ]
    };
  } catch (error) {
    console.error("Error processing store credits:", error);
    return NO_DISCOUNT;
  }
}
