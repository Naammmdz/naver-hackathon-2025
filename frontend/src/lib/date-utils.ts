import { format as dateFnsFormat } from 'date-fns';
import { enUS, vi } from 'date-fns/locale';
import i18n from '@/i18n';

// Map of locale strings to date-fns locales
const localeMap = {
  en: enUS,
  vi: vi,
};

/**
 * Format date with locale-aware formatting
 */
export const formatDate = (date: Date | string, formatString: string): string => {
  const currentLanguage = i18n.language || 'en';
  const locale = localeMap[currentLanguage as keyof typeof localeMap] || enUS;
  
  return dateFnsFormat(new Date(date), formatString, { locale });
};

/**
 * Format date with Vietnamese or English formatting
 */
export const formatDateLocalized = (date: Date | string): string => {
  const currentLanguage = i18n.language || 'en';
  
  if (currentLanguage === 'vi') {
    return formatDate(date, 'dd/MM/yyyy');
  } else {
    return formatDate(date, 'MMM d, yyyy');
  }
};

/**
 * Format relative date (e.g., "2 days ago", "hôm qua")
 */
export const formatRelativeDate = (date: Date | string): string => {
  const currentLanguage = i18n.language || 'en';
  const locale = localeMap[currentLanguage as keyof typeof localeMap] || enUS;
  
  return dateFnsFormat(new Date(date), 'PPP', { locale });
};
