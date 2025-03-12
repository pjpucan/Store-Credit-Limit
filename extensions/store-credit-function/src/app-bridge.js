/**
 * Store Credit App Bridge
 * 
 * This script connects our custom app with the Shopify Admin interface,
 * allowing store owners to manage store credits directly from the Shopify Admin.
 */

import { createApp } from '@shopify/app-bridge';
import { Modal, Toast, TitleBar, Button } from '@shopify/app-bridge/actions';

// Initialize App Bridge
export function initializeAppBridge() {
  const shopifyAppBridge = createApp({
    apiKey: SHOPIFY_API_KEY, // This will be replaced during build
    host: new URL(window.location).searchParams.get('host'),
  });

  return shopifyAppBridge;
}

// Create a modal for managing store credits
export function createStoreCreditsModal(app) {
  const modalOptions = {
    title: 'Manage Store Credits',
    message: 'Adjust customer store credits and view transaction history.',
    size: Modal.Size.Large,
  };

  const modal = Modal.create(app, modalOptions);
  
  return modal;
}

// Create a toast notification
export function showToast(app, message, isError = false) {
  const toastOptions = {
    message,
    duration: 5000,
    isError,
  };
  
  const toast = Toast.create(app, toastOptions);
  toast.dispatch(Toast.Action.SHOW);
}

// Create a title bar with actions
export function createTitleBar(app) {
  const titleBarOptions = {
    title: 'Store Credit Manager',
    buttons: {
      primary: Button.create(app, { label: 'Manage Credits' }),
    },
  };
  
  const titleBar = TitleBar.create(app, titleBarOptions);
  
  // Add event listener to primary button
  titleBarOptions.buttons.primary.subscribe(Button.Action.CLICK, () => {
    const modal = createStoreCreditsModal(app);
    modal.dispatch(Modal.Action.OPEN);
  });
  
  return titleBar;
}

// Initialize the app when the document is ready
document.addEventListener('DOMContentLoaded', () => {
  try {
    const app = initializeAppBridge();
    createTitleBar(app);
    
    console.log('Store Credit App Bridge initialized successfully');
  } catch (error) {
    console.error('Error initializing Store Credit App Bridge:', error);
  }
});
