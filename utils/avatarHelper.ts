/**
 * Helper utilities to encode and decode company time metadata into/from the avatar URL.
 * This allows storing custom metadata in the Supabase public 'profiles' table without schema changes.
 */

export const encodeAvatarUrl = (url: string | undefined | null, companyTime: string): string => {
  if (!url) return '';
  
  // Clean existing company_time from url first
  let cleanUrl = url;
  if (url.includes('?company_time=')) {
    cleanUrl = url.split('?company_time=')[0];
  } else if (url.includes('&company_time=')) {
    const parts = url.split('&company_time=');
    cleanUrl = parts[0];
  } else if (url.includes('#company_time=')) {
    cleanUrl = url.split('#company_time=')[0];
  }
  
  if (!companyTime) return cleanUrl;
  
  const encodedTime = encodeURIComponent(companyTime);
  if (cleanUrl.startsWith('data:')) {
    return `${cleanUrl}#company_time=${encodedTime}`;
  } else {
    const separator = cleanUrl.includes('?') ? '&' : '?';
    return `${cleanUrl}${separator}company_time=${encodedTime}`;
  }
};

export const decodeAvatarUrl = (url: string | undefined | null) => {
  if (!url) return { avatarUrl: '', companyTime: '' };
  
  let companyTime = '';
  let avatarUrl = url;
  
  const match = url.match(/[?&#]company_time=([^&#\s]+)/);
  if (match) {
    companyTime = decodeURIComponent(match[1]);
    // Clean company_time from the url to get the pure avatar url
    avatarUrl = url
      .replace(/[?&]company_time=[^&#\s]+/, '')
      .replace(/#company_time=[^&#\s]+/, '');
      
    // If the clean url has trailing ? or &, remove it
    if (avatarUrl.endsWith('?') || avatarUrl.endsWith('&')) {
      avatarUrl = avatarUrl.slice(0, -1);
    }
  }
  
  return { avatarUrl, companyTime };
};
