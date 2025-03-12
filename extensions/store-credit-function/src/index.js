/**
 * Store Credit Discount Function
 * 
 * This function applies store credits as a discount during checkout with the following rules:
 * 1. Maximum 20% of the order total can be used as store credits
 * 2. Credits from the current month cannot be used (only previous months)
 * 3. Credits never expire
 */

// Input schema for the function
const INPUT_SCHEMA = {
  "type": "object",
  "properties": {
    "cart": {
      "type": "object",
      "properties": {
        "lines": {
          "type": "array",
          "items": {
            "type": "object"
          }
        },
        "cost": {
          "type": "object",
          "properties": {
            "totalAmount": {
              "type": "object",
              "properties": {
                "amount": {
                  "type": "string"
                }
              }
            }
          }
        },
        "buyerIdentity": {
          "type": "object",
          "properties": {
            "customer": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string"
                },
                "metafields": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "namespace": {
                        "type": "string"
                      },
                      "key": {
                        "type": "string"
                      },
                      "value": {
                        "type": "string"
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "attributes": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "key": {
                "type": "string"
              },
              "value": {
                "type": "string"
              }
            }
          }
        }
      }
    }
  }
};

// Output schema for the function
const OUTPUT_SCHEMA = {
  "type": "object",
  "properties": {
    "discountApplicationStrategy": {
      "type": "string",
      "enum": ["FIRST", "MAXIMUM", "ALL"]
    },
    "discounts": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "value": {
            "type": "object",
            "properties": {
              "fixedAmount": {
                "type": "object",
                "properties": {
                  "amount": {
                    "type": "string"
                  }
                }
              }
            }
          },
          "targets": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "orderSubtotal": {
                  "type": "object",
                  "properties": {
                    "excludedVariantIds": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    }
                  }
                }
              }
            }
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
};

/**
 * @param {object} input - The input object containing cart and customer data
 * @returns {object} - The discount to be applied
 */
export function run(input) {
  // Default response with no discounts
  const noDiscountResponse = {
    discountApplicationStrategy: "FIRST",
    discounts: []
  };

  try {
    // Get the cart and customer information
    const cart = input.cart;
    const customer = cart.buyerIdentity?.customer;
    
    // If no customer is logged in, return no discounts
    if (!customer) {
      return noDiscountResponse;
    }

    // Check if there are store credits to apply from cart attributes
    const storeCreditsAttribute = cart.attributes?.find(
      attr => attr.key === "store_credits_to_apply"
    );

    // If no store credits attribute found, return no discounts
    if (!storeCreditsAttribute || !storeCreditsAttribute.value) {
      return noDiscountResponse;
    }

    // Parse the store credits to apply
    const storeCreditsToApply = parseFloat(storeCreditsAttribute.value);
    if (isNaN(storeCreditsToApply) || storeCreditsToApply <= 0) {
      return noDiscountResponse;
    }

    // Get customer metafields to verify available credits
    const rebateMetafield = customer.metafields?.find(
      metafield => metafield.namespace === "custom" && metafield.key === "rebate"
    );

    if (!rebateMetafield || !rebateMetafield.value) {
      return noDiscountResponse;
    }

    // Parse the rebate data
    const rebateData = JSON.parse(rebateMetafield.value);
    
    // Calculate available credits (excluding current month)
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    let availableCredits = 0;
    
    Object.entries(rebateData).forEach(([yearMonth, amount]) => {
      const [year, month] = yearMonth.split('-').map(Number);
      
      // Check if this credit is from a previous month (can be used now)
      if (year < currentYear || (year === currentYear && month < currentMonth)) {
        availableCredits += parseFloat(amount);
      }
    });

    // Calculate maximum credits that can be used (20% of cart total)
    const cartTotal = parseFloat(cart.cost.totalAmount.amount);
    const maxCreditsForOrder = cartTotal * 0.2;
    
    // Determine credits to use (minimum of available credits, requested credits, and max allowed)
    const creditsToUse = Math.min(availableCredits, storeCreditsToApply, maxCreditsForOrder);
    
    if (creditsToUse <= 0) {
      return noDiscountResponse;
    }

    // Apply the discount to the cart
    return {
      discountApplicationStrategy: "FIRST",
      discounts: [{
        value: {
          fixedAmount: {
            amount: creditsToUse.toString()
          }
        },
        targets: [{
          orderSubtotal: {
            excludedVariantIds: []
          }
        }],
        message: `Applied ${creditsToUse.toFixed(2)} store credits`
      }]
    };
  } catch (error) {
    console.error('Error applying store credits:', error);
    return noDiscountResponse;
  }
}
