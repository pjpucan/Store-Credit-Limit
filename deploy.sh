#!/bin/bash

# Store Credit App Deployment Script
# This script helps deploy the Store Credit app to Shopify

# Set colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting Store Credit App deployment...${NC}"

# Check if Shopify CLI is installed
if ! command -v shopify &> /dev/null; then
    echo -e "${RED}Shopify CLI is not installed. Please install it first.${NC}"
    echo "Visit https://shopify.dev/tools/cli/installation for installation instructions."
    exit 1
fi

# Build the discount function
echo -e "${YELLOW}Building the Store Credit discount function...${NC}"
cd extensions/store-credit-function
npm install
shopify app function build
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to build the discount function. Check the errors above.${NC}"
    exit 1
fi
echo -e "${GREEN}Discount function built successfully!${NC}"

# Build the webhook function
echo -e "${YELLOW}Building the Store Credit webhook function...${NC}"
cd ../store-credit-webhook
npm install
shopify app function build
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to build the webhook function. Check the errors above.${NC}"
    exit 1
fi
echo -e "${GREEN}Webhook function built successfully!${NC}"

# Return to root directory
cd ../../

# Deploy the functions
echo -e "${YELLOW}Deploying functions to Shopify...${NC}"
shopify app function deploy
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to deploy functions. Check the errors above.${NC}"
    exit 1
fi
echo -e "${GREEN}Functions deployed successfully!${NC}"

# Reminder about metafields
echo -e "${YELLOW}IMPORTANT: Make sure the following metafields are defined in your Shopify store:${NC}"
echo "1. custom.rebate (json_string) - Stores rebate credits by month"
echo "2. custom.revenu_track (json_string) - Tracks revenue by month"
echo "3. custom.revenu (number_decimal) - Tracks total revenue"

echo -e "${GREEN}Deployment complete! Your Store Credit app is now ready to use.${NC}"
echo "Remember to activate the discount function in your Shopify Admin under Apps > Functions."

exit 0
