/**
 * A utility to search through nested JSON structures and extract arrays of matching objects.
 * This makes the parser schema-agnostic to handle changes in TikTok's JSON structure.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

// Safari and cross-browser date normalization helper
function normalizeDateString(clean: string): string {
  // Replace trailing ' UTC' or ' GMT' (case-insensitive) with 'Z'
  let normalized = clean.replace(/\s+(UTC|GMT)$/i, 'Z');
  // Replace first space with 'T' (e.g. "2026-06-03 21:23:06" -> "2026-06-03T21:23:06")
  normalized = normalized.replace(' ', 'T');
  return normalized;
}

// Helper to check if a string or number is a valid date / timestamp
function isDateString(val: any): boolean {
  if (val === undefined || val === null) return false;
  if (typeof val === 'number') {
    return !isNaN(new Date(val).getTime());
  }
  const strVal = String(val).trim();
  if (!strVal || strVal.toUpperCase() === 'N/A') return false;

  if (/^\d+$/.test(strVal)) {
    const num = parseInt(strVal, 10);
    const checkVal = num < 9999999999 ? num * 1000 : num;
    return !isNaN(new Date(checkVal).getTime());
  }

  const normalized = normalizeDateString(strVal);
  const timestamp = Date.parse(normalized);
  return !isNaN(timestamp);
}

/**
 * Recursively search for all arrays in the object, and score them based on matching fields.
 * (Fallback for non-standard/arbitrarily changed JSON structures)
 */
export function extractListFromJSON<T>(
  obj: any,
  validator: (item: any) => T | null
): T[] {
  const results: T[] = [];

  function traverse(current: any) {
    if (!current) return;

    if (Array.isArray(current)) {
      for (const item of current) {
        const validated = validator(item);
        if (validated) {
          results.push(validated);
        } else if (item && typeof item === 'object') {
          // Sometimes arrays contain nested objects that hold the actual data
          traverse(item);
        }
      }
      return;
    }

    if (typeof current === 'object') {
      for (const key in current) {
        if (Object.prototype.hasOwnProperty.call(current, key)) {
          traverse(current[key]);
        }
      }
    }
  }

  traverse(obj);
  return results;
}

// Helper for direct path access checking (fast-path)
function getArrayFromPaths(json: any, paths: string[][]): any[] | null {
  for (const path of paths) {
    let current = json;
    for (const key of path) {
      if (current && typeof current === 'object') {
        current = current[key];
      } else {
        current = undefined;
        break;
      }
    }
    if (Array.isArray(current)) {
      return current;
    }
  }
  return null;
}

// Generic hybrid runner
function parseSection<T>(
  json: any,
  directPaths: string[][],
  validator: (item: any) => T | null
): T[] {
  const directArray = getArrayFromPaths(json, directPaths);
  if (directArray) {
    const results: T[] = [];
    for (const item of directArray) {
      const validated = validator(item);
      if (validated) {
        results.push(validated);
      }
    }
    return results;
  }
  // Fallback to recursive scanning if path not found
  return extractListFromJSON(json, validator);
}

// 1. Video Browsing History Parser
export function parseVideos(json: any): { date: string; link: string }[] {
  const paths = [
    ['data', 'Activity', 'Video Browsing History', 'VideoList'],
    ['Activity', 'Video Browsing History', 'VideoList'],
    ['data', 'VideoList'],
    ['VideoList'],
    ['data', 'videos'],
    ['videos']
  ];
  return parseSection(json, paths, (item) => {
    let dateStr = '';
    let linkStr = '';

    if (typeof item === 'object' && item !== null) {
      // Find date
      for (const k of ['Date', 'date', 'Timestamp', 'timestamp', 'Time', 'time']) {
        const val = item[k];
        if (val !== undefined && val !== null && isDateString(val)) {
          const str = String(val).trim();
          if (str && str.toUpperCase() !== 'N/A') {
            dateStr = str;
            break;
          }
        }
      }
      // Find link
      for (const k of ['Link', 'link', 'VideoLink', 'videoLink', 'video_link']) {
        const val = item[k];
        if (val !== undefined && val !== null) {
          const str = String(val).trim();
          if (str && str.toUpperCase() !== 'N/A') {
            linkStr = str;
            break;
          }
        }
      }
    }

    if (dateStr) {
      return { date: dateStr, link: linkStr || '' };
    }
    return null;
  });
}

// 2. Search History Parser
export function parseSearches(json: any): { date: string; searchTerm: string }[] {
  const paths = [
    ['data', 'Activity', 'Search History', 'SearchList'],
    ['Activity', 'Search History', 'SearchList'],
    ['data', 'SearchList'],
    ['SearchList'],
    ['data', 'searches'],
    ['searches']
  ];
  return parseSection(json, paths, (item) => {
    let dateStr = '';
    let termStr = '';

    if (typeof item === 'object' && item !== null) {
      // Find date
      for (const k of ['Date', 'date', 'Timestamp', 'timestamp', 'Time', 'time']) {
        const val = item[k];
        if (val !== undefined && val !== null && isDateString(val)) {
          const str = String(val).trim();
          if (str && str.toUpperCase() !== 'N/A') {
            dateStr = str;
            break;
          }
        }
      }
      // Find search term
      for (const k of ['SearchTerm', 'searchTerm', 'search_term', 'Query', 'query', 'word', 'Word']) {
        const val = item[k];
        if (val !== undefined && val !== null) {
          const str = String(val).trim();
          if (str && str.toUpperCase() !== 'N/A') {
            termStr = str;
            break;
          }
        }
      }
    }

    if (dateStr && termStr) {
      return { date: dateStr, searchTerm: termStr };
    }
    return null;
  });
}

// 3. Comments Parser
export function parseComments(json: any): { date: string; comment: string }[] {
  const paths = [
    ['data', 'Comment', 'Comments', 'CommentsList'],
    ['Comment', 'Comments', 'CommentsList'],
    ['data', 'CommentList'],
    ['CommentList'],
    ['data', 'comments'],
    ['comments']
  ];
  return parseSection(json, paths, (item) => {
    let dateStr = '';
    let commentStr = '';

    if (typeof item === 'object' && item !== null) {
      // Find date
      for (const k of ['Date', 'date', 'Timestamp', 'timestamp', 'Time', 'time', 'createTime', 'CreateTime']) {
        const val = item[k];
        if (val !== undefined && val !== null && isDateString(val)) {
          const str = String(val).trim();
          if (str && str.toUpperCase() !== 'N/A') {
            dateStr = str;
            break;
          }
        }
      }
      // Find comment text
      for (const k of ['Comment', 'comment', 'text', 'Text', 'CommentText', 'commentText', 'content', 'Content']) {
        const val = item[k];
        if (val !== undefined && val !== null) {
          const str = String(val).trim();
          if (str && str.toUpperCase() !== 'N/A') {
            commentStr = str;
            break;
          }
        }
      }
    }

    if (dateStr && commentStr) {
      return { date: dateStr, comment: commentStr };
    }
    return null;
  });
}

// 4. Likes Parser
export function parseLikes(json: any): { date: string; link: string }[] {
  const paths = [
    ['data', 'Activity', 'Like List', 'ItemMList'],
    ['Activity', 'Like List', 'ItemMList'],
    ['data', 'LikeList'],
    ['LikeList'],
    ['data', 'likes'],
    ['likes']
  ];
  return parseSection(json, paths, (item) => {
    let dateStr = '';
    let linkStr = '';

    if (typeof item === 'object' && item !== null) {
      // Find date
      for (const k of ['Date', 'date', 'Timestamp', 'timestamp', 'Time', 'time']) {
        const val = item[k];
        if (val !== undefined && val !== null && isDateString(val)) {
          const str = String(val).trim();
          if (str && str.toUpperCase() !== 'N/A') {
            dateStr = str;
            break;
          }
        }
      }
      // Find link
      for (const k of ['Link', 'link', 'VideoLink', 'videoLink', 'video_link']) {
        const val = item[k];
        if (val !== undefined && val !== null) {
          const str = String(val).trim();
          if (str && str.toUpperCase() !== 'N/A') {
            linkStr = str;
            break;
          }
        }
      }
    }

    if (dateStr && linkStr) {
      return { date: dateStr, link: linkStr };
    }
    return null;
  });
}

// 5. Favorites Parser
export function parseFavorites(json: any): { date: string; link: string }[] {
  const paths = [
    ['data', 'Activity', 'Favorite List', 'ItemMList'],
    ['Activity', 'Favorite List', 'ItemMList'],
    ['data', 'Activity', 'Favorite Videos', 'FavoriteVideoList'],
    ['Activity', 'Favorite Videos', 'FavoriteVideoList'],
    ['data', 'FavoriteList'],
    ['FavoriteList'],
    ['data', 'favorites'],
    ['favorites']
  ];
  return parseSection(json, paths, (item) => {
    let dateStr = '';
    let linkStr = '';

    if (typeof item === 'object' && item !== null) {
      // Find date
      for (const k of ['Date', 'date', 'Timestamp', 'timestamp', 'Time', 'time']) {
        const val = item[k];
        if (val !== undefined && val !== null && isDateString(val)) {
          const str = String(val).trim();
          if (str && str.toUpperCase() !== 'N/A') {
            dateStr = str;
            break;
          }
        }
      }
      // Find link
      for (const k of ['Link', 'link', 'VideoLink', 'videoLink', 'video_link']) {
        const val = item[k];
        if (val !== undefined && val !== null) {
          const str = String(val).trim();
          if (str && str.toUpperCase() !== 'N/A') {
            linkStr = str;
            break;
          }
        }
      }
    }

    if (dateStr && linkStr) {
      return { date: dateStr, link: linkStr };
    }
    return null;
  });
}

// 6. Shares Parser
export function parseShares(json: any): { date: string; link: string; method: string }[] {
  const paths = [
    ['data', 'Activity', 'Share History', 'ShareList'],
    ['Activity', 'Share History', 'ShareList'],
    ['data', 'ShareList'],
    ['ShareList'],
    ['data', 'shares'],
    ['shares']
  ];
  return parseSection(json, paths, (item) => {
    let dateStr = '';
    let linkStr = '';
    let methodStr = 'Unknown';

    if (typeof item === 'object' && item !== null) {
      // Find date
      for (const k of ['Date', 'date', 'Timestamp', 'timestamp', 'Time', 'time']) {
        const val = item[k];
        if (val !== undefined && val !== null && isDateString(val)) {
          const str = String(val).trim();
          if (str && str.toUpperCase() !== 'N/A') {
            dateStr = str;
            break;
          }
        }
      }
      // Find link
      for (const k of ['Link', 'link', 'VideoLink', 'videoLink', 'video_link']) {
        const val = item[k];
        if (val !== undefined && val !== null) {
          const str = String(val).trim();
          if (str && str.toUpperCase() !== 'N/A') {
            linkStr = str;
            break;
          }
        }
      }
      // Find method
      for (const k of ['Method', 'method', 'ShareType', 'shareType', 'type', 'ShareMedium', 'share_medium']) {
        const val = item[k];
        if (val !== undefined && val !== null) {
          const str = String(val).trim();
          if (str && str.toUpperCase() !== 'N/A') {
            methodStr = str;
            break;
          }
        }
      }
    }

    if (dateStr && linkStr) {
      return { date: dateStr, link: linkStr, method: methodStr };
    }
    return null;
  });
}

// 7. Reposts Parser
export function parseReposts(json: any): { date: string; link: string }[] {
  const paths = [
    ['data', 'Activity', 'Repost History', 'RepostList'],
    ['Activity', 'Repost History', 'RepostList'],
    ['data', 'RepostList'],
    ['RepostList'],
    ['data', 'reposts'],
    ['reposts']
  ];
  return parseSection(json, paths, (item) => {
    let dateStr = '';
    let linkStr = '';

    if (typeof item === 'object' && item !== null) {
      // Find date
      for (const k of ['Date', 'date', 'Timestamp', 'timestamp', 'Time', 'time']) {
        const val = item[k];
        if (val !== undefined && val !== null && isDateString(val)) {
          const str = String(val).trim();
          if (str && str.toUpperCase() !== 'N/A') {
            dateStr = str;
            break;
          }
        }
      }
      // Find link
      for (const k of ['Link', 'link', 'VideoLink', 'videoLink', 'video_link']) {
        const val = item[k];
        if (val !== undefined && val !== null) {
          const str = String(val).trim();
          if (str && str.toUpperCase() !== 'N/A') {
            linkStr = str;
            break;
          }
        }
      }
    }

    if (dateStr && linkStr) {
      return { date: dateStr, link: linkStr };
    }
    return null;
  });
}
