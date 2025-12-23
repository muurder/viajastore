import { logger } from '../../../utils/logger';

/**
 * Helper function to normalize date to ISO format (YYYY-MM-DD) for input type="date"
 * Handles various date formats including ISO, Brazilian (DD/MM/YYYY), and Date objects
 */
export const normalizeDateToISO = (dateValue: string | Date | undefined | null): string => {
    if (!dateValue) return '';

    try {
        let date: Date;

        // If it's already a Date object
        if (dateValue instanceof Date) {
            date = dateValue;
        }
        // If it's a string, try to parse it
        else if (typeof dateValue === 'string') {
            // If already in ISO format (YYYY-MM-DD)
            if (dateValue.match(/^\d{4}-\d{2}-\d{2}/)) {
                return dateValue.split('T')[0]; // Return just the date part
            }

            // Try to parse as date string (handles various formats)
            date = new Date(dateValue);

            // Check if date is valid
            if (isNaN(date.getTime())) {
                // Try parsing as DD/MM/YYYY (Brazilian format)
                const parts = dateValue.split(/[\/\-]/);
                if (parts.length === 3) {
                    // Assume DD/MM/YYYY format
                    const day = parseInt(parts[0], 10);
                    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
                    const year = parseInt(parts[2], 10);
                    date = new Date(year, month, day);
                }
            }
        } else {
            return '';
        }

        // If still invalid, return empty
        if (isNaN(date.getTime())) {
            return '';
        }

        // Return in ISO format (YYYY-MM-DD)
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (error) {
        logger.error('Error normalizing date:', error);
        return '';
    }
};
