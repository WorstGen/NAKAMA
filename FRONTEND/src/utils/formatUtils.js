// Utility functions for formatting

/**
 * Format a number with commas for thousands separators
 * @param {number|string} num - The number to format
 * @returns {string} - Formatted number with commas
 */
export const formatNumberWithCommas = (num) => {
  if (num === null || num === undefined || num === '') {
    return '';
  }
  
  // Convert to number if it's a string
  const number = typeof num === 'string' ? parseFloat(num) : num;
  
  // Check if it's a valid number
  if (isNaN(number)) {
    return num.toString();
  }
  
  // Format with commas
  return number.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 9 // Allow up to 9 decimal places for crypto
  });
};

/**
 * Format a token amount with commas
 * @param {number|string} amount - The amount to format
 * @param {string} token - The token symbol
 * @returns {string} - Formatted amount with token symbol
 */
export const formatTokenAmount = (amount, token) => {
  const formattedAmount = formatNumberWithCommas(amount);
  return `${formattedAmount} ${token}`;
};
