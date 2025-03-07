/**
 * StoreCreditManager
 * 
 * This class manages store credits for customers, including:
 * - Storing credits in customer metafields
 * - Tracking credit history
 * - Applying credits at checkout
 * - Enforcing credit usage rules:
 *   1. Maximum 20% of order total
 *   2. Credits can only be used in months after they were earned
 *   3. Credits never expire
 */class StoreCreditManager {
  constructor() {
    this.CREDIT_USAGE_LIMIT = 0.20; // 20% maximum usage per order
    this.METAFIELD_NAMESPACE = 'customer';
    this.METAFIELD_KEY = 'store_credits';
    this.initialized = false;
    this.customerCredits = 0;
    this.customerCreditHistory = [];
    this.init();
  }

  /**
   * Initialize the store credit manager
   */
  async init() {
    if (this.initialized) return;
    
    try {
      // Check if we're on a page where the customer is logged in
      if (typeof Shopify !== 'undefined' && Shopify.customer && Shopify.customer.id) {
        await this.fetchCustomerCredits();
      }
      
      // Initialize discount function listeners if on checkout page
      if (window.location.pathname.includes('/checkout')) {
        this.initCheckoutListeners();
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize StoreCreditManager:', error);
    }
  }

  /**
   * Fetch customer credits from metafields
   */
  async fetchCustomerCredits() {
    try {
      const response = await fetch(`/api/2024-01/customers/${Shopify.customer.id}/metafields.json`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': this.getShopifyAccessToken()
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch customer metafields');
      
      const data = await response.json();
      const creditMetafield = data.metafields.find(
        metafield => metafield.namespace === this.METAFIELD_NAMESPACE && metafield.key === this.METAFIELD_KEY
      );
      
      if (creditMetafield) {
        this.customerCredits = parseFloat(creditMetafield.value) || 0;
        
        // Also fetch credit history if available
        await this.fetchCreditHistory();
      } else {
        // Initialize credits metafield if it doesn't exist
        await this.updateCustomerCredits(0);
      }
    } catch (error) {
      console.error('Error fetching customer credits:', error);
    }
  }

  /**
   * Fetch customer credit history from metafields
   */
  async fetchCreditHistory() {
    try {
      const response = await fetch(`/api/2024-01/customers/${Shopify.customer.id}/metafields.json`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': this.getShopifyAccessToken()
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch customer metafields');
      
      const data = await response.json();
      const historyMetafield = data.metafields.find(
        metafield => metafield.namespace === this.METAFIELD_NAMESPACE && metafield.key === 'credit_history'
      );
      
      if (historyMetafield) {
        try {
          this.customerCreditHistory = JSON.parse(historyMetafield.value) || [];
        } catch (e) {
          this.customerCreditHistory = [];
        }
      }
    } catch (error) {
      console.error('Error fetching credit history:', error);
    }
  }

  /**
   * Update customer credits in metafields
   * @param {number} newCreditAmount - New credit amount
   */
  async updateCustomerCredits(newCreditAmount) {
    try {
      const response = await fetch(`/api/2024-01/customers/${Shopify.customer.id}/metafields.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': this.getShopifyAccessToken()
        },
        body: JSON.stringify({
          metafield: {
            namespace: this.METAFIELD_NAMESPACE,
            key: this.METAFIELD_KEY,
            value: newCreditAmount.toString(),
            type: 'number_decimal'
          }
        })
      });
      
      if (!response.ok) throw new Error('Failed to update customer credits');
      
      this.customerCredits = newCreditAmount;
    } catch (error) {
      console.error('Error updating customer credits:', error);
    }
  }

  /**
   * Add credit transaction to history
   * @param {number} amount - Amount of credits
   * @param {string} type - Type of transaction (earned/used)
   * @param {string} description - Description of transaction
   */
  async addCreditTransaction(amount, type, description) {
    const transaction = {
      date: new Date().toISOString(),
      amount: amount,
      type: type,
      description: description
    };
    
    this.customerCreditHistory.push(transaction);
    
    try {
      await fetch(`/api/2024-01/customers/${Shopify.customer.id}/metafields.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': this.getShopifyAccessToken()
        },
        body: JSON.stringify({
          metafield: {
            namespace: this.METAFIELD_NAMESPACE,
            key: 'credit_history',
            value: JSON.stringify(this.customerCreditHistory),
            type: 'json'
          }
        })
      });
    } catch (error) {
      console.error('Error updating credit history:', error);
    }
  }

  /**
   * Get Shopify access token from session or cookies
   * @returns {string} Access token
   */
  getShopifyAccessToken() {
    // This is a placeholder - in a real implementation, you would need to handle authentication properly
    // For frontend use, you'd typically use the Shopify App Bridge or a proxy endpoint
    return '';
  }

  /**
   * Initialize checkout page listeners
   */
  initCheckoutListeners() {
    // Add listeners for checkout events
    document.addEventListener('page:load page:change', this.handleCheckoutPageChange.bind(this));
    
    // Check if we're already on a checkout step
    this.handleCheckoutPageChange();
  }

  /**
   * Handle checkout page changes
   */
  handleCheckoutPageChange() {
    // Check if we're on the payment step
    if (window.Shopify && window.Shopify.Checkout && window.Shopify.Checkout.step === 'payment_method') {
      this.injectCreditRedemptionUI();
    }
  }

  /**
   * Inject credit redemption UI into checkout
   */
  injectCreditRedemptionUI() {
    const paymentMethodContainer = document.querySelector('.section--payment-method');
    if (!paymentMethodContainer || document.getElementById('store-credit-redemption')) return;
    
    const creditRedemptionContainer = document.createElement('div');
    creditRedemptionContainer.id = 'store-credit-redemption';
    creditRedemptionContainer.className = 'section';
    
    const orderTotal = this.getOrderTotal();
    const maxCreditUsage = this.calculateMaxCreditUsage(orderTotal);
    const availableCredits = this.customerCredits;
    const usableCredits = Math.min(maxCreditUsage, availableCredits);
    
    creditRedemptionContainer.innerHTML = `
      <div class="section__header">
        <h2 class="section__title">Store Credits</h2>
      </div>
      <div class="section__content">
        <div class="content-box">
          <p>Available Credits: ${availableCredits.toFixed(2)}</p>
          <p>Maximum Usable Credits (20% of order): ${maxCreditUsage.toFixed(2)}</p>
          <div class="field">
            <div class="field__input-wrapper">
              <label for="credit-amount" class="field__label">Amount to Use</label>
              <input type="number" id="credit-amount" class="field__input" 
                min="0" max="${usableCredits.toFixed(2)}" step="0.01" value="0">
            </div>
          </div>
          <button type="button" id="apply-credits" class="btn">Apply Credits</button>
        </div>
      </div>
    `;
    
    paymentMethodContainer.parentNode.insertBefore(creditRedemptionContainer, paymentMethodContainer.nextSibling);
    
    // Add event listener to the apply button
    document.getElementById('apply-credits').addEventListener('click', this.applyCreditsToOrder.bind(this));
  }

  /**
   * Apply credits to the current order
   */
  async applyCreditsToOrder() {
    const creditInput = document.getElementById('credit-amount');
    if (!creditInput) return;
    
    const creditAmount = parseFloat(creditInput.value) || 0;
    if (creditAmount <= 0) return;
    
    // Validate against available credits and maximum usage
    const orderTotal = this.getOrderTotal();
    const maxCreditUsage = this.calculateMaxCreditUsage(orderTotal);
    
    if (creditAmount > this.customerCredits) {
      alert('You do not have enough credits.');
      return;
    }
    
    if (creditAmount > maxCreditUsage) {
      alert(`You can only use up to ${maxCreditUsage.toFixed(2)} credits (20% of your order).`);
      return;
    }
    
    try {
      // Apply discount using the Shopify Checkout API
      const response = await fetch('/api/checkout/apply-discount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          discount_code: 'STORECREDIT',
          amount: creditAmount
        })
      });
      
      if (!response.ok) throw new Error('Failed to apply discount');
      
      // Update customer credits
      const newCreditBalance = this.customerCredits - creditAmount;
      await this.updateCustomerCredits(newCreditBalance);
      
      // Add transaction to history
      await this.addCreditTransaction(
        creditAmount,
        'used',
        `Used ${creditAmount.toFixed(2)} credits on order`
      );
      
      // Refresh the page to show updated checkout
      window.location.reload();
    } catch (error) {
      console.error('Error applying credits:', error);
      alert('Failed to apply credits. Please try again.');
    }
  }

  /**
   * Get current order total from checkout page
   * @returns {number} Order total
   */
  getOrderTotal() {
    const totalElement = document.querySelector('.payment-due__price');
    if (!totalElement) return 0;
    
    const totalText = totalElement.textContent.trim().replace(/[^0-9.]/g, '');
    return parseFloat(totalText) || 0;
  }

  /**
   * Calculate rebate percentage based on monthly spend
   * @param {number} monthlySpend - Total spend for the month
   * @returns {number} Rebate percentage
   */
  calculateRebatePercentage(monthlySpend) {
    if (monthlySpend >= 50000) return 0.04; // 4%
    if (monthlySpend >= 20000) return 0.035; // 3.5%
    if (monthlySpend >= 10000) return 0.02; // 2%
    return 0; // No rebate for spending less than 10000
  }

  /**
   * Calculate monthly rebate credits
   * @param {number} monthlySpend - Total spend for the month
   * @returns {number} Rebate credits earned
   */
  calculateMonthlyRebate(monthlySpend) {
    const rebatePercentage = this.calculateRebatePercentage(monthlySpend);
    return monthlySpend * rebatePercentage;
  }

  /**
   * Calculate maximum credit usage for an order
   * @param {number} orderAmount - Total order amount
   * @returns {number} Maximum credit amount that can be used
   */
  calculateMaxCreditUsage(orderAmount) {
    return orderAmount * this.CREDIT_USAGE_LIMIT;
  }

  /**
   * Apply store credit to an order
   * @param {number} orderAmount - Total order amount
   * @param {number} availableCredits - Available credit balance
   * @param {Date} creditEarnedDate - Date when credits were earned
   * @param {Date} currentDate - Current date
   * @returns {Object} Object containing final amount and credits used
   */
  applyStoreCredit(orderAmount, availableCredits, creditEarnedDate, currentDate) {
    // Check if credits are from previous months
    const earnedMonth = creditEarnedDate.getMonth();
    const earnedYear = creditEarnedDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Credits can only be used in following months
    if (currentYear < earnedYear || (currentYear === earnedYear && currentMonth <= earnedMonth)) {
      return {
        finalAmount: orderAmount,
        creditsUsed: 0,
        message: "Credits from current month cannot be used until next month"
      };
    }

    const maxCreditUsage = this.calculateMaxCreditUsage(orderAmount);
    const creditsToUse = Math.min(maxCreditUsage, availableCredits);

    return {
      finalAmount: orderAmount - creditsToUse,
      creditsUsed: creditsToUse,
      message: `Applied ${creditsToUse} credits to order`
    };
  }
}

// Export for use in other files
export default StoreCreditManager;

// Initialize if this script is loaded directly
if (typeof window !== 'undefined') {
  window.storeCreditManager = new StoreCreditManager();
}
