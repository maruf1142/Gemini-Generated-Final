/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Returns a 'YYYY-MM-DD' formatted date string for the Bangladesh (Asia/Dhaka) time zone.
 */
export const getBangladeshDateString = (date: Date = new Date()): string => {
  try {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    };
    const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(date);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    
    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch (error) {
    console.error('Error formatting Bangladesh date, fallback to UTC split', error);
  }
  
  // Safe fallback
  return date.toISOString().split('T')[0];
};

/**
 * Returns a 'HH:MM' formatted 24-hour clock time string for the Bangladesh (Asia/Dhaka) time zone.
 */
export const getBangladeshTimeString = (date: Date = new Date()): string => {
  try {
    return date.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Dhaka',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch (error) {
    console.error('Error formatting Bangladesh time, fallback to local', error);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }
};
