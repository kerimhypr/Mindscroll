import JSZip from 'jszip';
import { ParsedData } from './dataTypes';
import {
  parseVideos,
  parseSearches,
  parseComments,
  parseLikes,
  parseFavorites,
  parseShares,
  parseReposts,
} from './schemaResolver';

// Normalized names to find files regardless of directory paths
const FILE_PATTERNS = {
  videos: [/video[_\s]?browsing[_\s]?history\.json$/i, /browsing[_\s]?history\.json$/i],
  searches: [/search[_\s]?history\.json$/i],
  comments: [/comments?\.json$/i],
  likes: [/likes?\.json$/i],
  favorites: [/favorites?\.json$/i],
  shares: [/share[_\s]?history\.json$/i, /shares?\.json$/i],
  reposts: [/reposts?\.json$/i],
};

const KEYWORD_GROUPS = {
  videos: [
    ['video', 'browse'],
    ['video', 'history'],
    ['browsing', 'history'],
    ['video', 'list']
  ],
  searches: [
    ['search']
  ],
  comments: [
    ['comment']
  ],
  likes: [
    ['like']
  ],
  favorites: [
    ['favorite'],
    ['favourite'],
    ['save']
  ],
  shares: [
    ['share']
  ],
  reposts: [
    ['repost']
  ],
};

export async function extractTikTokZip(file: File): Promise<ParsedData> {
  const zip = await JSZip.loadAsync(file);
  const parsedData: ParsedData = {};

  const files = Object.keys(zip.files);

  // 1. Try to find a main single-file user data JSON (e.g. user_data.json or user_data_tiktok.json)
  const userDataFilePattern = /user_data(_tiktok)?\.json$/i;
  const userDataPath = files.find(path => {
    const filename = path.substring(path.lastIndexOf('/') + 1);
    return userDataFilePattern.test(filename) && !zip.files[path].dir;
  });

  if (userDataPath) {
    const fileData = zip.files[userDataPath];
    const text = await fileData.async('string');
    try {
      const mainJson = JSON.parse(text);
      
      const videos = parseVideos(mainJson);
      if (videos && videos.length > 0) parsedData.videos = videos;

      const searches = parseSearches(mainJson);
      if (searches && searches.length > 0) parsedData.searches = searches;

      const comments = parseComments(mainJson);
      if (comments && comments.length > 0) parsedData.comments = comments;

      const likes = parseLikes(mainJson);
      if (likes && likes.length > 0) parsedData.likes = likes;

      const favorites = parseFavorites(mainJson);
      if (favorites && favorites.length > 0) parsedData.favorites = favorites;

      const shares = parseShares(mainJson);
      if (shares && shares.length > 0) parsedData.shares = shares;

      const reposts = parseReposts(mainJson);
      if (reposts && reposts.length > 0) parsedData.reposts = reposts;

      // If we found any valid data inside this single file, return it directly
      if (Object.keys(parsedData).length > 0) {
        return parsedData;
      }
    } catch (e) {
      console.error(`Failed to parse main user data JSON at ${userDataPath}:`, e);
      // Fallback to separate files if parsing the main file fails
    }
  }

  // Helper to find file content by pattern or keyword group
  const readJsonFile = async (patterns: RegExp[], keywords: string[][]): Promise<unknown | null> => {
    const matchedPath = files.find((path) => {
      const filename = path.substring(path.lastIndexOf('/') + 1).toLowerCase();
      if (!filename.endsWith('.json')) return false;

      // 1. Try regex pattern test on the full path
      const regexMatch = patterns.some((pattern) => pattern.test(path));
      if (regexMatch) return true;

      // 2. Try keyword group matching on the filename
      const keywordMatch = keywords.some(group => 
        group.every(kw => filename.includes(kw))
      );
      return keywordMatch;
    });

    if (!matchedPath) return null;
    const fileData = zip.files[matchedPath];
    if (fileData.dir) return null;
    const text = await fileData.async('string');
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error(`Failed to parse JSON file at ${matchedPath}:`, e);
      return null;
    }
  };

  // Extract each file
  const videoJson = await readJsonFile(FILE_PATTERNS.videos, KEYWORD_GROUPS.videos);
  if (videoJson) {
    parsedData.videos = parseVideos(videoJson);
  }

  const searchJson = await readJsonFile(FILE_PATTERNS.searches, KEYWORD_GROUPS.searches);
  if (searchJson) {
    parsedData.searches = parseSearches(searchJson);
  }

  const commentsJson = await readJsonFile(FILE_PATTERNS.comments, KEYWORD_GROUPS.comments);
  if (commentsJson) {
    parsedData.comments = parseComments(commentsJson);
  }

  const likesJson = await readJsonFile(FILE_PATTERNS.likes, KEYWORD_GROUPS.likes);
  if (likesJson) {
    parsedData.likes = parseLikes(likesJson);
  }

  const favoritesJson = await readJsonFile(FILE_PATTERNS.favorites, KEYWORD_GROUPS.favorites);
  if (favoritesJson) {
    parsedData.favorites = parseFavorites(favoritesJson);
  }

  const sharesJson = await readJsonFile(FILE_PATTERNS.shares, KEYWORD_GROUPS.shares);
  if (sharesJson) {
    parsedData.shares = parseShares(sharesJson);
  }

  const repostsJson = await readJsonFile(FILE_PATTERNS.reposts, KEYWORD_GROUPS.reposts);
  if (repostsJson) {
    parsedData.reposts = parseReposts(repostsJson);
  }

  return parsedData;
}
