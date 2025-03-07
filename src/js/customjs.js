// Import other components
import StoreCreditManager from './store-credit';

document.addEventListener('DOMContentLoaded', () => {
  const storeCreditManager = new StoreCreditManager();

  // Example usage in checkout
  if (window.Shopify && window.Shopify.checkout) {
    const handleCheckout = () => {
      const orderAmount = parseFloat(window.Shopify.checkout.total_price);
      
      // Fetch customer's credit balance from metafields
      fetch('/apps/store-credits/balance')
        .then(response => response.json())
        .then(data => {
          const { availableCredits, creditEarnedDate } = data;
          
          const result = storeCreditManager.applyStoreCredit(
            orderAmount,
            availableCredits,
            new Date(creditEarnedDate),
            new Date()
          );

          // Update checkout total if credits were applied
          if (result.creditsUsed > 0) {
            // Apply discount via Shopify Discount API
            fetch('/apps/store-credits/apply-discount', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                amount: result.creditsUsed,
                checkoutToken: window.Shopify.checkout.token
              })
            });
          }
        });
    };

    handleCheckout();
  }
});