/**
 * Finura - Pricing Page Interactions
 * Handles dynamic monthly/yearly billing calculations.
 */
document.addEventListener('DOMContentLoaded', () => {
    const billingToggle = document.getElementById('billing-toggle');
    const billingToggleWrap = document.getElementById('billing-toggle-wrap');
    const monthlyLabel = document.getElementById('monthly-label');
    const yearlyLabel = document.getElementById('yearly-label');
    
    // Select price value spans
    const basicPriceVal = document.getElementById('basic-price-val');
    const proPriceVal = document.getElementById('pro-price-val');
    const enterprisePriceVal = document.getElementById('enterprise-price-val');
    
    // Select price period spans
    const basicPricePeriod = document.getElementById('basic-price-period');
    const proPricePeriod = document.getElementById('pro-price-period');
    const enterprisePricePeriod = document.getElementById('enterprise-price-period');

    let isYearly = false;

    function updatePricing() {
        if (isYearly) {
            // Apply visual active states
            billingToggleWrap.classList.add('yearly');
            monthlyLabel.classList.remove('active');
            yearlyLabel.classList.add('active');
            
            // Set yearly prices
            if (basicPriceVal) basicPriceVal.textContent = '0';
            if (proPriceVal) proPriceVal.textContent = '15';
            if (enterprisePriceVal) enterprisePriceVal.textContent = '39';
            
            // Set yearly period indicators
            const yearlyText = '/mo (billed yearly)';
            if (basicPricePeriod) basicPricePeriod.textContent = '/mo'; // Basic is always free
            if (proPricePeriod) proPricePeriod.textContent = yearlyText;
            if (enterprisePricePeriod) enterprisePricePeriod.textContent = yearlyText;
        } else {
            // Apply visual active states
            billingToggleWrap.classList.remove('yearly');
            yearlyLabel.classList.remove('active');
            monthlyLabel.classList.add('active');
            
            // Set monthly prices
            if (basicPriceVal) basicPriceVal.textContent = '0';
            if (proPriceVal) proPriceVal.textContent = '19';
            if (enterprisePriceVal) enterprisePriceVal.textContent = '49';
            
            // Set monthly period indicators
            const monthlyText = '/mo';
            if (basicPricePeriod) basicPricePeriod.textContent = monthlyText;
            if (proPricePeriod) proPricePeriod.textContent = monthlyText;
            if (enterprisePricePeriod) enterprisePricePeriod.textContent = monthlyText;
        }
    }

    if (billingToggle) {
        billingToggle.addEventListener('click', () => {
            isYearly = !isYearly;
            updatePricing();
        });
    }
});
