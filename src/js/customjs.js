/**
 * Store Credit Management System
 * 
 * Rules:
 * 1. Customers can only use credits up to 20% of their purchase
 * 2. Credits obtained in the current month can only be used in the following months
 * 3. Points never expire
 * 4. Discount applies on checkout
 */

class StoreCreditManager {
  constructor() {
    this.customerId = null;
    this.customerMetafields = null;
    this.currentDate = new Date();
  }

  /**
   * Initialize the store credit manager
   */
  async init() {
    // Check if we're on a page where we need to handle store credits
    if (Shopify.designMode) return;

    // Get current customer ID if logged in
    if (window.meta && window.meta.page && window.meta.page.customerId) {
      this.customerId = window.meta.page.customerId;
      await this.fetchCustomerMetafields();
      this.setupEventListeners();
    }
  }

  /**
   * Initialize the account page functionality
   */
  async initAccountPage() {
    if (!this.customerId) {
      if (window.meta && window.meta.page && window.meta.page.customerId) {
        this.customerId = window.meta.page.customerId;
      } else {
        return; // Not logged in
      }
    }

    await this.fetchCustomerMetafields();
    this.displayCreditHistory();
  }

  /**
   * Fetch customer metafields related to store credits
   */
  async fetchCustomerMetafields() {
    if (!this.customerId) return;

    try {
      const response = await fetch(`/api/2024-01/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': window.storefrontAccessToken
        },
        body: JSON.stringify({
          query: `
            query GetCustomerMetafields($customerId: ID!) {
              customer(id: $customerId) {
                metafields(first: 10, namespace: "custom") {
                  edges {
                    node {
                      key
                      value
                    }
                  }
                }
              }
            }
          `,
          variables: {
            customerId: `gid://shopify/Customer/${this.customerId}`
          }
        })
      });

      const data = await response.json();
      
      if (data.data && data.data.customer && data.data.customer.metafields) {
        this.customerMetafields = {};
        data.data.customer.metafields.edges.forEach(edge => {
          this.customerMetafields[edge.node.key] = edge.node.value;
        });
        
        this.updateCreditDisplay();
      }
    } catch (error) {
      console.error('Error fetching customer metafields:', error);
    }
  }

  /**
   * Set up event listeners for checkout and other relevant actions
   */
  setupEventListeners() {
    // Listen for checkout button clicks
    document.addEventListener('click', (event) => {
      if (event.target.matches('[name="checkout"], .checkout-button, #checkout')) {
        this.handleCheckout(event);
      }
    });

    // Listen for AJAX cart updates
    document.addEventListener('cart:updated', () => {
      this.updateCreditDisplay();
    });
  }

  /**
   * Handle the checkout process
   */
  async handleCheckout(event) {
    if (!this.customerId || !this.customerMetafields) return;

    try {
      // Get current cart
      const response = await fetch('/cart.js');
      const cart = await response.json();
      
      // Calculate available credits
      const availableCredits = this.calculateAvailableCredits();
      
      // Calculate maximum credits that can be used (20% of cart total)
      const maxCreditsForOrder = cart.total_price * 0.2 / 100; // Convert to dollars
      
      // Determine credits to use (minimum of available credits and max allowed)
      const creditsToUse = Math.min(availableCredits, maxCreditsForOrder);
      
      if (creditsToUse > 0) {
        // Apply credits as discount
        await this.applyCreditsToCheckout(creditsToUse);
      }
    } catch (error) {
      console.error('Error handling checkout:', error);
    }
  }

  /**
   * Calculate available credits based on the "Next Month" rule
   * Credits from current month cannot be used
   */
  calculateAvailableCredits() {
    if (!this.customerMetafields || !this.customerMetafields.rebate) {
      return 0;
    }

    try {
      const rebateData = JSON.parse(this.customerMetafields.rebate);
      let availableCredits = 0;
      const currentMonth = this.currentDate.getMonth();
      const currentYear = this.currentDate.getFullYear();

      // Sum up credits from previous months (not current month)
      Object.entries(rebateData).forEach(([yearMonth, amount]) => {
        const [year, month] = yearMonth.split('-').map(Number);
        
        // Check if this credit is from a previous month (can be used now)
        if (year < currentYear || (year === currentYear && month < currentMonth)) {
          availableCredits += parseFloat(amount);
        }
      });

      return availableCredits;
    } catch (error) {
      console.error('Error calculating available credits:', error);
      return 0;
    }
  }

  /**
   * Apply credits to checkout
   */
  async applyCreditsToCheckout(creditsToUse) {
    try {
      // Apply discount code or update checkout attributes
      // This will connect with the Discount Function
      const response = await fetch('/cart/update.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          attributes: {
            'store_credits_to_apply': creditsToUse.toFixed(2)
          }
        })
      });

      // Update customer metafields to reflect used credits
      await this.updateUsedCredits(creditsToUse);
      
      return await response.json();
    } catch (error) {
      console.error('Error applying credits to checkout:', error);
    }
  }

  /**
   * Update customer metafields after credits are used
   */
  async updateUsedCredits(creditsUsed) {
    if (!this.customerId || !this.customerMetafields) return;

    try {
      // This would typically be handled by a server-side app
      // For demonstration, we're showing the structure
      const rebateData = JSON.parse(this.customerMetafields.rebate);
      
      // Deduct credits from oldest months first
      let remainingToDeduct = creditsUsed;
      const sortedMonths = Object.keys(rebateData).sort();
      
      for (const month of sortedMonths) {
        const monthCredits = parseFloat(rebateData[month]);
        if (remainingToDeduct <= 0) break;
        
        if (monthCredits > 0) {
          const deduction = Math.min(monthCredits, remainingToDeduct);
          rebateData[month] = (monthCredits - deduction).toFixed(2);
          remainingToDeduct -= deduction;
        }
      }
      
      // In a real implementation, this would call a server endpoint to update the metafield
      console.log('Credits used:', creditsUsed);
      console.log('Updated rebate data:', rebateData);
    } catch (error) {
      console.error('Error updating used credits:', error);
    }
  }

  /**
   * Update the display of available credits on the page
   */
  updateCreditDisplay() {
    const creditDisplayElements = document.querySelectorAll('.store-credit-display');
    if (creditDisplayElements.length === 0) return;

    const availableCredits = this.calculateAvailableCredits();
    
    creditDisplayElements.forEach(element => {
      element.textContent = `Available Store Credits: $${availableCredits.toFixed(2)}`;
    });
  }

  /**
   * Display credit history on the account page
   */
  displayCreditHistory() {
    const historyTableBody = document.querySelector('.store-credit-history-data tbody');
    const historyTable = document.querySelector('.store-credit-history-data');
    const loadingElement = document.querySelector('.store-credit-history-loading');
    
    if (!historyTableBody || !this.customerMetafields) return;

    try {
      // Get rebate and revenue data
      const rebateData = this.customerMetafields.rebate ? JSON.parse(this.customerMetafields.rebate) : {};
      const revenueData = this.customerMetafields.revenu_track ? JSON.parse(this.customerMetafields.revenu_track) : {};
      
      // Create sorted list of months
      const allMonths = new Set([...Object.keys(rebateData), ...Object.keys(revenueData)]);
      const sortedMonths = Array.from(allMonths).sort().reverse(); // Most recent first
      
      // Clear existing rows
      historyTableBody.innerHTML = '';
      
      if (sortedMonths.length === 0) {
        // No history yet
        const noDataRow = document.createElement('tr');
        noDataRow.innerHTML = `<td colspan="4">No credit history available yet.</td>`;
        historyTableBody.appendChild(noDataRow);
      } else {
        // Calculate cumulative available credits
        let cumulativeCredits = 0;
        const currentMonth = this.currentDate.getMonth();
        const currentYear = this.currentDate.getFullYear();
        
        // Add rows for each month
        sortedMonths.forEach(yearMonth => {
          const [year, month] = yearMonth.split('-').map(Number);
          const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
          ];
          
          const monthName = `${monthNames[month]} ${year}`;
          const revenue = revenueData[yearMonth] ? parseFloat(revenueData[yearMonth]) : 0;
          const creditsEarned = rebateData[yearMonth] ? parseFloat(rebateData[yearMonth]) : 0;
          
          // Credits are only available if from a previous month
          const isAvailable = (year < currentYear || (year === currentYear && month < currentMonth));
          if (isAvailable) {
            cumulativeCredits += creditsEarned;
          }
          
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${monthName}</td>
            <td>$${revenue.toFixed(2)}</td>
            <td>$${creditsEarned.toFixed(2)}</td>
            <td>${isAvailable ? '$' + creditsEarned.toFixed(2) : 'Available next month'}</td>
          `;
          
          historyTableBody.appendChild(row);
        });
      }
      
      // Hide loading, show table
      if (loadingElement) loadingElement.style.display = 'none';
      if (historyTable) historyTable.style.display = 'table';
      
    } catch (error) {
      console.error('Error displaying credit history:', error);
      if (loadingElement) {
        loadingElement.textContent = 'Error loading credit history. Please try again later.';
      }
    }
  }
}

// Initialize the store credit manager when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.storeCreditManager = new StoreCreditManager();
  window.storeCreditManager.init();
  if (window.location.pathname === '/account') {
    window.storeCreditManager.initAccountPage();
  }
});