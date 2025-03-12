/**
 * Order Created Webhook Handler
 * 
 * This function processes new orders and updates customer store credits based on purchase amount
 * and the appropriate rebate tier.
 */

export default async function orderCreated(topic, shop, webhookRequestBody, apiClient) {
  try {
    // Parse the webhook body
    const orderData = JSON.parse(webhookRequestBody);
    
    // Extract necessary information
    const customerId = orderData.customer?.id;
    const orderTotal = parseFloat(orderData.total_price);
    
    // If no customer ID or order total is invalid, exit
    if (!customerId || isNaN(orderTotal) || orderTotal <= 0) {
      console.log('Invalid order data for store credit processing');
      return;
    }
    
    // Get current date information for credit tracking
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const yearMonthKey = `${currentYear}-${currentMonth}`;
    
    // Calculate earned credits based on purchase amount and tier
    const earnedCredits = calculateEarnedCredits(orderTotal);
    
    if (earnedCredits <= 0) {
      console.log('No credits earned for this order');
      return;
    }
    
    // Fetch current customer metafields
    const customerResponse = await apiClient.get({
      path: `customers/${customerId}`,
      query: {
        fields: 'id,email'
      }
    });
    
    if (!customerResponse.body.customer) {
      console.log('Customer not found');
      return;
    }
    
    // Fetch existing rebate metafield
    const metafieldResponse = await apiClient.get({
      path: `customers/${customerId}/metafields`,
      query: {
        namespace: 'custom',
        key: 'rebate'
      }
    });
    
    let rebateData = {};
    let metafieldId = null;
    
    // Process existing metafield if it exists
    if (metafieldResponse.body.metafields && metafieldResponse.body.metafields.length > 0) {
      const rebateMetafield = metafieldResponse.body.metafields[0];
      metafieldId = rebateMetafield.id;
      
      try {
        rebateData = JSON.parse(rebateMetafield.value);
      } catch (error) {
        console.error('Error parsing existing rebate data:', error);
        rebateData = {};
      }
    }
    
    // Update rebate data with new credits
    if (rebateData[yearMonthKey]) {
      rebateData[yearMonthKey] = (parseFloat(rebateData[yearMonthKey]) + earnedCredits).toFixed(2);
    } else {
      rebateData[yearMonthKey] = earnedCredits.toFixed(2);
    }
    
    // Update or create the rebate metafield
    if (metafieldId) {
      // Update existing metafield
      await apiClient.put({
        path: `customers/${customerId}/metafields/${metafieldId}`,
        data: {
          metafield: {
            id: metafieldId,
            value: JSON.stringify(rebateData),
            type: 'json_string'
          }
        }
      });
    } else {
      // Create new metafield
      await apiClient.post({
        path: `customers/${customerId}/metafields`,
        data: {
          metafield: {
            namespace: 'custom',
            key: 'rebate',
            value: JSON.stringify(rebateData),
            type: 'json_string'
          }
        }
      });
    }
    
    // Update revenue tracking metafield
    await updateRevenueTracking(apiClient, customerId, orderTotal, yearMonthKey);
    
    console.log(`Successfully updated store credits for customer ${customerId}. Added ${earnedCredits} credits for ${yearMonthKey}`);
  } catch (error) {
    console.error('Error processing order for store credits:', error);
  }
}

/**
 * Calculate earned credits based on purchase amount and tier
 */
function calculateEarnedCredits(purchaseAmount) {
  // Define rebate tiers based on the scenario
  const rebateTiers = [
    { threshold: 0, percentage: 0 },
    { threshold: 10000, percentage: 2 },
    { threshold: 20000, percentage: 3.5 },
    { threshold: 50000, percentage: 4 }
  ];
  
  // Find applicable tier
  let applicableTier = rebateTiers[0];
  for (const tier of rebateTiers) {
    if (purchaseAmount >= tier.threshold) {
      applicableTier = tier;
    } else {
      break;
    }
  }
  
  // Calculate earned credits
  return parseFloat((purchaseAmount * applicableTier.percentage / 100).toFixed(2));
}

/**
 * Update revenue tracking metafield
 */
async function updateRevenueTracking(apiClient, customerId, orderTotal, yearMonthKey) {
  try {
    // Fetch existing revenue_track metafield
    const metafieldResponse = await apiClient.get({
      path: `customers/${customerId}/metafields`,
      query: {
        namespace: 'custom',
        key: 'revenu_track'
      }
    });
    
    let revenueData = {};
    let metafieldId = null;
    
    // Process existing metafield if it exists
    if (metafieldResponse.body.metafields && metafieldResponse.body.metafields.length > 0) {
      const revenueMetafield = metafieldResponse.body.metafields[0];
      metafieldId = revenueMetafield.id;
      
      try {
        revenueData = JSON.parse(revenueMetafield.value);
      } catch (error) {
        console.error('Error parsing existing revenue data:', error);
        revenueData = {};
      }
    }
    
    // Update revenue data
    if (revenueData[yearMonthKey]) {
      revenueData[yearMonthKey] = (parseFloat(revenueData[yearMonthKey]) + orderTotal).toFixed(2);
    } else {
      revenueData[yearMonthKey] = orderTotal.toFixed(2);
    }
    
    // Update or create the revenue_track metafield
    if (metafieldId) {
      // Update existing metafield
      await apiClient.put({
        path: `customers/${customerId}/metafields/${metafieldId}`,
        data: {
          metafield: {
            id: metafieldId,
            value: JSON.stringify(revenueData),
            type: 'json_string'
          }
        }
      });
    } else {
      // Create new metafield
      await apiClient.post({
        path: `customers/${customerId}/metafields`,
        data: {
          metafield: {
            namespace: 'custom',
            key: 'revenu_track',
            value: JSON.stringify(revenueData),
            type: 'json_string'
          }
        }
      });
    }
    
    // Also update the total revenue metafield
    await updateTotalRevenue(apiClient, customerId, orderTotal);
  } catch (error) {
    console.error('Error updating revenue tracking:', error);
  }
}

/**
 * Update total revenue metafield
 */
async function updateTotalRevenue(apiClient, customerId, orderTotal) {
  try {
    // Fetch existing revenu metafield
    const metafieldResponse = await apiClient.get({
      path: `customers/${customerId}/metafields`,
      query: {
        namespace: 'custom',
        key: 'revenu'
      }
    });
    
    let currentRevenue = 0;
    let metafieldId = null;
    
    // Process existing metafield if it exists
    if (metafieldResponse.body.metafields && metafieldResponse.body.metafields.length > 0) {
      const revenueMetafield = metafieldResponse.body.metafields[0];
      metafieldId = revenueMetafield.id;
      currentRevenue = parseFloat(revenueMetafield.value);
    }
    
    // Update total revenue
    const newRevenue = (currentRevenue + orderTotal).toFixed(2);
    
    // Update or create the revenu metafield
    if (metafieldId) {
      // Update existing metafield
      await apiClient.put({
        path: `customers/${customerId}/metafields/${metafieldId}`,
        data: {
          metafield: {
            id: metafieldId,
            value: newRevenue,
            type: 'number_decimal'
          }
        }
      });
    } else {
      // Create new metafield
      await apiClient.post({
        path: `customers/${customerId}/metafields`,
        data: {
          metafield: {
            namespace: 'custom',
            key: 'revenu',
            value: newRevenue,
            type: 'number_decimal'
          }
        }
      });
    }
  } catch (error) {
    console.error('Error updating total revenue:', error);
  }
}
