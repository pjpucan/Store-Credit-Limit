/**
 * Store Credit Webhook
 * 
 * This webhook handles order processing and updates customer metafields
 * for store credit tracking and calculation.
 */

const fetch = require('node-fetch');

/**
 * Calculate rebate percentage based on monthly revenue
 * @param {number} monthlyRevenue Revenue for the month
 * @returns {number} Rebate percentage
 */
function calculateRebatePercentage(monthlyRevenue) {
  if (monthlyRevenue >= 50000) {
    return 0.04; // 4%
  } else if (monthlyRevenue >= 20000) {
    return 0.035; // 3.5%
  } else if (monthlyRevenue >= 10000) {
    return 0.02; // 2%
  } else {
    return 0; // 0%
  }
}

/**
 * Process order and update customer metafields
 * @param {string} shopDomain Shopify shop domain
 * @param {string} accessToken Access token for API
 * @param {Object} orderData Order data
 */
async function processOrder(shopDomain, accessToken, orderData) {
  try {
    // Get customer metafields
    const customerMetafields = await getCustomerMetafields(shopDomain, accessToken, orderData.customerId);
    
    // Process the order and update metafields
    const updatedMetafields = calculateUpdatedMetafields(customerMetafields, orderData);
    
    // Update customer metafields
    await updateCustomerMetafields(shopDomain, accessToken, orderData.customerId, updatedMetafields);
  } catch (error) {
    console.error('Error processing order:', error);
    throw error;
  }
}

/**
 * Get customer metafields
 * @param {string} shopDomain Shopify shop domain
 * @param {string} accessToken Access token for API
 * @param {string} customerId Customer ID
 * @returns {Promise<Array>} Customer metafields
 */
async function getCustomerMetafields(shopDomain, accessToken, customerId) {
  const query = `
    query GetCustomerMetafields($customerId: ID!) {
      customer(id: $customerId) {
        metafields(first: 10, namespace: "custom") {
          edges {
            node {
              id
              namespace
              key
              value
            }
          }
        }
      }
    }
  `;

  const variables = {
    customerId: `gid://shopify/Customer/${customerId}`,
  };

  const response = await fetch(`https://${shopDomain}/admin/api/2023-10/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({
      query,
      variables
    }),
  });

  const data = await response.json();
  
  const metafields = [];
  
  if (data.data && data.data.customer && data.data.customer.metafields) {
    data.data.customer.metafields.edges.forEach(edge => {
      metafields.push({
        id: edge.node.id,
        namespace: edge.node.namespace,
        key: edge.node.key,
        value: edge.node.value,
      });
    });
  }
  
  return metafields;
}

/**
 * Calculate updated metafields based on order data
 * @param {Array} existingMetafields Existing customer metafields
 * @param {Object} orderData Order data
 * @returns {Array} Updated metafields
 */
function calculateUpdatedMetafields(existingMetafields, orderData) {
  const updatedMetafields = [];
  
  // Parse order date
  const orderDate = new Date(orderData.processedAt);
  const yearMonth = `${orderDate.getFullYear()}-${orderDate.getMonth()}`;
  
  // Parse order total
  const orderTotal = parseFloat(orderData.totalPrice);
  
  // Get existing metafields
  const revenueTrackMetafield = existingMetafields.find(m => m.namespace === 'custom' && m.key === 'revenu_track');
  const rebateMetafield = existingMetafields.find(m => m.namespace === 'custom' && m.key === 'rebate');
  const revenueMetafield = existingMetafields.find(m => m.namespace === 'custom' && m.key === 'revenu');
  
  // Update revenue tracking
  let revenueTrackData = {};
  if (revenueTrackMetafield) {
    try {
      revenueTrackData = JSON.parse(revenueTrackMetafield.value);
    } catch (e) {
      console.error('Error parsing revenue track data:', e);
    }
  }
  
  // Update or create monthly revenue
  if (revenueTrackData[yearMonth]) {
    revenueTrackData[yearMonth] = (parseFloat(revenueTrackData[yearMonth]) + orderTotal).toFixed(2);
  } else {
    revenueTrackData[yearMonth] = orderTotal.toFixed(2);
  }
  
  // Calculate rebate for this order
  const monthlyRevenue = parseFloat(revenueTrackData[yearMonth]);
  const rebatePercentage = calculateRebatePercentage(monthlyRevenue);
  const rebateAmount = orderTotal * rebatePercentage;
  
  // Update rebate data
  let rebateData = {};
  if (rebateMetafield) {
    try {
      rebateData = JSON.parse(rebateMetafield.value);
    } catch (e) {
      console.error('Error parsing rebate data:', e);
    }
  }
  
  // Update or create monthly rebate
  if (rebateData[yearMonth]) {
    rebateData[yearMonth] = (parseFloat(rebateData[yearMonth]) + rebateAmount).toFixed(2);
  } else {
    rebateData[yearMonth] = rebateAmount.toFixed(2);
  }
  
  // Update total revenue
  let totalRevenue = 0;
  if (revenueMetafield) {
    totalRevenue = parseFloat(revenueMetafield.value || '0');
  }
  totalRevenue += orderTotal;
  
  // Prepare updated metafields
  updatedMetafields.push({
    id: revenueTrackMetafield?.id,
    namespace: 'custom',
    key: 'revenu_track',
    value: JSON.stringify(revenueTrackData),
    type: 'json'
  });
  
  updatedMetafields.push({
    id: rebateMetafield?.id,
    namespace: 'custom',
    key: 'rebate',
    value: JSON.stringify(rebateData),
    type: 'json'
  });
  
  updatedMetafields.push({
    id: revenueMetafield?.id,
    namespace: 'custom',
    key: 'revenu',
    value: totalRevenue.toFixed(2),
    type: 'single_line_text_field'
  });
  
  return updatedMetafields;
}

/**
 * Update customer metafields
 * @param {string} shopDomain Shopify shop domain
 * @param {string} accessToken Access token for API
 * @param {string} customerId Customer ID
 * @param {Array} metafields Metafields to update
 */
async function updateCustomerMetafields(shopDomain, accessToken, customerId, metafields) {
  for (const metafield of metafields) {
    if (metafield.id) {
      // Update existing metafield
      await updateMetafield(shopDomain, accessToken, metafield);
    } else {
      // Create new metafield
      await createMetafield(shopDomain, accessToken, customerId, metafield);
    }
  }
}

/**
 * Update existing metafield
 * @param {string} shopDomain Shopify shop domain
 * @param {string} accessToken Access token for API
 * @param {Object} metafield Metafield to update
 */
async function updateMetafield(shopDomain, accessToken, metafield) {
  const mutation = `
    mutation MetafieldUpdate($input: MetafieldUpdateInput!) {
      metafieldUpdate(input: $input) {
        metafield {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    input: {
      id: metafield.id,
      value: metafield.value,
    },
  };

  await fetch(`https://${shopDomain}/admin/api/2023-10/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({
      query: mutation,
      variables
    }),
  });
}

/**
 * Create new metafield
 * @param {string} shopDomain Shopify shop domain
 * @param {string} accessToken Access token for API
 * @param {string} customerId Customer ID
 * @param {Object} metafield Metafield to create
 */
async function createMetafield(shopDomain, accessToken, customerId, metafield) {
  const mutation = `
    mutation MetafieldCreate($input: MetafieldInput!) {
      metafieldCreate(metafield: $input) {
        metafield {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    input: {
      namespace: metafield.namespace,
      key: metafield.key,
      value: metafield.value,
      ownerId: `gid://shopify/Customer/${customerId}`,
      type: metafield.type || (metafield.key === 'revenu' ? 'single_line_text_field' : 'json'),
    },
  };

  await fetch(`https://${shopDomain}/admin/api/2023-10/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({
      query: mutation,
      variables
    }),
  });
}

/**
 * Main webhook handler for orders/paid event
 */
exports.onOrderPaid = async (topic, shop, body, webhookId, apiVersion) => {
  try {
    // Get admin API access token from environment variables
    const accessToken = process.env.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;
    
    if (!accessToken) {
      throw new Error('Missing Shopify API access token');
    }
    
    if (body && body.customer && body.id && body.total_price && body.processed_at) {
      const orderData = {
        id: body.id.toString(),
        customerId: body.customer.id.toString(),
        totalPrice: body.total_price,
        processedAt: body.processed_at,
      };
      
      await processOrder(shop, accessToken, orderData);
    }
  } catch (error) {
    console.error('Webhook handler error:', error);
    throw error;
  }
};
