import { ParsedData, AnalysisResult } from '../parser/dataTypes';

// Minimum valid date: 2010-01-01 (TikTok didn't exist before ~2016, but 2010 is safe)
const MIN_VALID_TIMESTAMP = new Date('2010-01-01T00:00:00Z').getTime();

function parseDate(dateStr: string): Date {
  const clean = dateStr.trim();
  if (/^\d+$/.test(clean)) {
    const num = parseInt(clean, 10);
    const ms = num < 9999999999 ? num * 1000 : num;
    return new Date(ms);
  }

  // Safari-safe: replace space with T, strip trailing UTC/GMT
  let normalized = clean.replace(/\s+(UTC|GMT)$/i, 'Z');
  normalized = normalized.replace(' ', 'T');

  const d = new Date(normalized);
  if (!isNaN(d.getTime())) return d;

  // Last resort: try original string
  const fallback = new Date(clean);
  return fallback;
}

// Check if a parsed date is actually valid (not epoch, not NaN, not before TikTok existed)
function isValidDate(d: Date): boolean {
  if (!d || isNaN(d.getTime())) return false;
  return d.getTime() > MIN_VALID_TIMESTAMP;
}

// Check if a link is a real TikTok video link (not a search URL, not bare domain)
function isVideoLink(link: string): boolean {
  if (!link || typeof link !== 'string') return false;
  const trimmed = link.trim();
  if (!trimmed) return false;

  // Reject search URLs
  if (trimmed.includes('/search?') || trimmed.includes('/search/')) return false;

  // Reject bare domain (just tiktok.com or tiktok.com/ with nothing after)
  if (/^https?:\/\/(www\.)?(tiktok\.com|tiktokv\.com)\/?$/i.test(trimmed)) return false;

  // Accept only links with video ID patterns
  // Pattern 1: tiktok.com/@username/video/DIGITS
  // Pattern 2: tiktokv.com/share/video/DIGITS
  // Pattern 3: vm.tiktok.com/SHORTCODE
  const videoPatterns = [
    /tiktok\.com\/@[^/]+\/video\/\d+/i,
    /tiktokv\.com\/share\/video\/\d+/i,
    /vm\.tiktok\.com\/[a-zA-Z0-9]+/i,
  ];
  return videoPatterns.some(pattern => pattern.test(trimmed));
}

// Check if a username is a raw numeric UID (not a real display name)
function isRawUID(username: string): boolean {
  if (!username) return false;
  // Remove leading @ if present
  const clean = username.startsWith('@') ? username.substring(1) : username;
  // If it's all digits and longer than 10 chars, it's a raw UID
  return /^\d{10,}$/.test(clean);
}

// Format a raw UID for display
function formatCreatorName(username: string): string {
  if (isRawUID(username)) {
    return `Gizli Kullanıcı (${username})`;
  }
  return username;
}

// Deduplicate an array of strings while preserving order
function uniqueArray(arr: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of arr) {
    if (!seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
}

// Helper: extract username from TikTok link
// Format: https://www.tiktok.com/@username/video/12345
export function extractUsername(link: string): string | null {
  if (!link) return null;
  const match = link.match(/@([a-zA-Z0-9_\.]+)/);
  return match ? `@${match[1]}` : null;
}

export function runAnalysis(data: ParsedData): AnalysisResult {
  const videos = data.videos || [];
  const searches = data.searches || [];
  const comments = data.comments || [];
  const likes = data.likes || [];
  const favorites = data.favorites || [];
  const shares = data.shares || [];
  const reposts = data.reposts || [];

  // Pre-filter: remove entries with invalid dates (epoch/NaN)
  const validVideos = videos.filter(v => isValidDate(parseDate(v.date)));
  const validSearches = searches.filter(s => isValidDate(parseDate(s.date)));
  const validComments = comments.filter(c => isValidDate(parseDate(c.date)));
  const validLikes = likes.filter(l => isValidDate(parseDate(l.date)));
  const validFavorites = favorites.filter(f => isValidDate(parseDate(f.date)));
  const validShares = shares.filter(s => isValidDate(parseDate(s.date)));
  const validReposts = reposts.filter(r => isValidDate(parseDate(r.date)));

  // Sort inputs by date ascending for easy timeline processing
  const sortedVideos = [...validVideos].sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());
  const sortedSearches = [...validSearches].sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());
  const sortedComments = [...validComments].sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());
  const sortedLikes = [...validLikes].sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());
  const sortedFavorites = [...validFavorites].sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());
  const sortedReposts = [...validReposts].sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());

  // 1. Time Cell
  const videoCount = sortedVideos.length;
  const totalSeconds = videoCount * 15;
  const hours = parseFloat((totalSeconds / 3600).toFixed(1));
  const days = parseFloat((hours / 24).toFixed(1));

  // 2. Algorithm Hypnosis
  // Consecutive videos watched within less than 3 minutes (180 seconds)
  let maxSessionMinutes = 0;
  let maxSessionDate = 'No scrolling history';
  let maxSessionCount = 0;

  if (sortedVideos.length > 0) {
    let currentSessionStart = parseDate(sortedVideos[0].date);
    let currentSessionEnd = currentSessionStart;
    let currentCount = 1;

    for (let i = 1; i < sortedVideos.length; i++) {
      const prevTime = parseDate(sortedVideos[i - 1].date);
      const currTime = parseDate(sortedVideos[i].date);
      const diffMs = currTime.getTime() - prevTime.getTime();

      if (diffMs > 0 && diffMs < 180000) {
        // Continue session
        currentSessionEnd = currTime;
        currentCount++;
      } else {
        // Close session and check max
        const durationMinutes = (currentSessionEnd.getTime() - currentSessionStart.getTime()) / 60000;
        if (durationMinutes > maxSessionMinutes) {
          maxSessionMinutes = durationMinutes;
          maxSessionDate = currentSessionStart.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
          maxSessionCount = currentCount;
        }
        // Start new session
        currentSessionStart = currTime;
        currentSessionEnd = currTime;
        currentCount = 1;
      }
    }
    // Check final session
    const durationMinutes = (currentSessionEnd.getTime() - currentSessionStart.getTime()) / 60000;
    if (durationMinutes > maxSessionMinutes) {
      maxSessionMinutes = durationMinutes;
      maxSessionDate = currentSessionStart.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      maxSessionCount = currentCount;
    }
  }

  // 3. Social Volume
  const chartData = [
    { name: 'Likes Given', count: validLikes.length },
    { name: 'Comments Left', count: validComments.length },
    { name: 'Saves/Favs', count: validFavorites.length },
    { name: 'Shares Sent', count: validShares.length },
    { name: 'Reposts', count: validReposts.length },
  ];

  // A. Yorum Sabıkası (Comments)
  // 4. Radical Comment
  let radicalComment: { comment: string; date: string; score: number } | null = null;
  let maxCommentScore = -1;
  const radicalKeywords = ['!', '?', 'wtf', 'lmao', 'omg', 'bro', 'no way', 'literally', 'worst', 'best', 'hate', 'love'];

  for (const c of sortedComments) {
    const text = c.comment;
    const len = text.length;
    const exclamations = (text.match(/!/g) || []).length;
    const uppercaseChars = (text.match(/[A-Z]/g) || []).length;
    const totalLetters = (text.match(/[a-zA-Z]/g) || []).length;
    const capsRatio = totalLetters > 0 ? uppercaseChars / totalLetters : 0;

    let kwScore = 0;
    for (const kw of radicalKeywords) {
      if (text.toLowerCase().includes(kw)) {
        kwScore += 5;
      }
    }

    const score = len * 0.1 + exclamations * 3 + capsRatio * 15 + kwScore;
    if (score > maxCommentScore) {
      maxCommentScore = score;
      radicalComment = {
        comment: text,
        date: c.date,
        score: Math.round(score),
      };
    }
  }

  // 5. Simp Evidence
  let simpEvidence: { comment: string; date: string; score: number } | null = null;
  let maxSimpScore = -1;
  const simpKeywords = ['kral', 'kraliçe', 'queen', 'king', 'cute', 'love', 'handsome', 'beautiful', 'gorgeous', 'reis', 'haklı', 'simp', 'idol', 'crush', 'mükemmel', 'harika', 'sweet', 'angel'];

  for (const c of sortedComments) {
    const text = c.comment.toLowerCase();
    let score = 0;
    for (const kw of simpKeywords) {
      if (text.includes(kw)) {
        score += 10;
      }
    }
    if (score > 0) {
      // Add slight length bonus to score longer compliments
      score += c.comment.length * 0.1;
      if (score > maxSimpScore) {
        maxSimpScore = score;
        simpEvidence = {
          comment: c.comment,
          date: c.date,
          score: Math.round(score),
        };
      }
    }
  }

  // 6. Midnight Lashing (Comments between 02:00 and 05:00)
  let midnightLashing: { comment: string; date: string; time: string } | null = null;
  let longestMidnightCommentLength = -1;
  for (const c of sortedComments) {
    const d = parseDate(c.date);
    const hr = d.getHours();
    if (hr >= 2 && hr < 5) {
      if (c.comment.length > longestMidnightCommentLength) {
        longestMidnightCommentLength = c.comment.length;
        const timeStr = d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        midnightLashing = {
          comment: c.comment,
          date: c.date,
          time: timeStr,
        };
      }
    }
  }

  // 7. Genesis Comment
  const genesisComment = sortedComments.length > 0 ? {
    comment: sortedComments[0].comment,
    date: sortedComments[0].date,
  } : null;

  // 8. Target Profile
  const commentMentions: Record<string, number> = {};
  for (const c of validComments) {
    // Extract mentions like @username
    const mentions = c.comment.match(/@([a-zA-Z0-9_\.]+)/g);
    if (mentions) {
      for (const m of mentions) {
        commentMentions[m] = (commentMentions[m] || 0) + 1;
      }
    }
  }
  let targetProfile: { username: string; count: number } | null = null;
  let maxMentions = 0;
  for (const user in commentMentions) {
    if (commentMentions[user] > maxMentions) {
      maxMentions = commentMentions[user];
      targetProfile = { username: user, count: maxMentions };
    }
  }

  // 9. Snarky Comments Count
  const snarkySet = new Set(['boş', 'sil', 'rezil', 'çöp', 'lame', 'trash', 'delete', 'cringe', 'rezalet', 'boş yapma', 'sil knk']);
  let snarkyCommentsCount = 0;
  for (const c of validComments) {
    const cleaned = c.comment.trim().toLowerCase();
    if (snarkySet.has(cleaned) || cleaned.length < 5 && (cleaned.includes('çöp') || cleaned.includes('sil') || cleaned.includes('boş'))) {
      snarkyCommentsCount++;
    }
  }

  // B. Arama Geçmişi (SearchHistory)
  // 10. Stalk Target
  const searchFrequencies: Record<string, number> = {};
  let stalkTarget: { username: string; count: number } | null = null;
  let maxSearchFreq = 0;
  for (const s of validSearches) {
    const term = s.searchTerm.trim();
    if (term) {
      searchFrequencies[term] = (searchFrequencies[term] || 0) + 1;
    }
  }
  for (const term in searchFrequencies) {
    // Check if it looks like a username search (e.g. single word, no spaces, or starts with @)
    const isUserLike = term.startsWith('@') || (!term.includes(' ') && term.length > 3 && term.length < 20);
    if (isUserLike && searchFrequencies[term] > maxSearchFreq) {
      maxSearchFreq = searchFrequencies[term];
      stalkTarget = { username: term, count: maxSearchFreq };
    }
  }

  // 11. 03:00 AM Madness Search
  let midnightMadnessSearch: { term: string; date: string } | null = null;
  let longestMidnightSearchLen = -1;
  for (const s of validSearches) {
    const d = parseDate(s.date);
    const hr = d.getHours();
    if (hr >= 3 && hr < 5) {
      if (s.searchTerm.length > longestMidnightSearchLen) {
        longestMidnightSearchLen = s.searchTerm.length;
        midnightMadnessSearch = {
          term: s.searchTerm,
          date: s.date,
        };
      }
    }
  }

  // 12. Detective Series
  // 5 or more searches in 1 hour
  let detectiveSeries: { topic: string; searches: string[]; date: string } | null = null;
  if (sortedSearches.length >= 5) {
    for (let i = 0; i <= sortedSearches.length - 5; i++) {
      const windowStart = parseDate(sortedSearches[i].date);
      const windowSearches = [sortedSearches[i].searchTerm];
      let matches = 1;

      for (let j = i + 1; j < sortedSearches.length; j++) {
        const t = parseDate(sortedSearches[j].date);
        const diffHours = (t.getTime() - windowStart.getTime()) / 3600000;
        if (diffHours <= 1) {
          windowSearches.push(sortedSearches[j].searchTerm);
          matches++;
        } else {
          break;
        }
      }

      if (matches >= 5) {
        detectiveSeries = {
          topic: windowSearches[0],
          searches: windowSearches,
          date: windowStart.toLocaleDateString(),
        };
        break; // found one series, stop
      }
    }
  }

  // 13. Top 3 Searches
  const sortedSearchTerms = Object.entries(searchFrequencies)
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count);
  const topSearches = sortedSearchTerms.slice(0, 3);

  // 14. Forgotten Curiosity
  // Searched >= 3 times in first 12 months of active data, 0 times in last 12 months
  let forgottenCuriosity: string | null = null;
  if (sortedSearches.length > 0) {
    const minDate = parseDate(sortedSearches[0].date);
    const maxDate = parseDate(sortedSearches[sortedSearches.length - 1].date);
    const firstYearCutoff = new Date(minDate.getTime() + 365 * 24 * 3600 * 1000);
    const lastYearCutoff = new Date(maxDate.getTime() - 365 * 24 * 3600 * 1000);

    const firstYearSearches: Record<string, number> = {};
    const lastYearSearches: Record<string, number> = {};

    for (const s of sortedSearches) {
      const d = parseDate(s.date);
      const term = s.searchTerm.trim().toLowerCase();
      if (d <= firstYearCutoff) {
        firstYearSearches[term] = (firstYearSearches[term] || 0) + 1;
      }
      if (d >= lastYearCutoff) {
        lastYearSearches[term] = (lastYearSearches[term] || 0) + 1;
      }
    }

    for (const term in firstYearSearches) {
      if (firstYearSearches[term] >= 3 && !lastYearSearches[term]) {
        // Return original casing if possible
        const original = validSearches.find(s => s.searchTerm.toLowerCase() === term)?.searchTerm;
        forgottenCuriosity = original || term;
        break;
      }
    }
  }

  // C. Likes & Favorites (Likes, Favorites)
  // 15. Secret Favorite Creator (from likes links) — only real video links, skip raw UIDs
  const likedCreators: Record<string, number> = {};
  for (const l of validLikes) {
    if (!isVideoLink(l.link)) continue; // Skip non-video links
    const user = extractUsername(l.link);
    if (user) {
      likedCreators[user] = (likedCreators[user] || 0) + 1;
    }
  }
  // Sort creators: real usernames first, raw UIDs last
  let secretFavCreator: string | null = null;
  const realCreators: [string, number][] = [];
  const uidCreators: [string, number][] = [];
  for (const creator in likedCreators) {
    if (isRawUID(creator)) {
      uidCreators.push([creator, likedCreators[creator]]);
    } else {
      realCreators.push([creator, likedCreators[creator]]);
    }
  }
  // Prefer real username creators over raw UIDs
  const sortedCreators = [...realCreators, ...uidCreators].sort((a, b) => b[1] - a[1]);
  if (sortedCreators.length > 0) {
    secretFavCreator = formatCreatorName(sortedCreators[0][0]);
  }

  // 16. Why I Liked Evidence (links of first 5 liked videos — only real video links)
  const whyILikedEvidence = sortedLikes
    .filter(l => isVideoLink(l.link))
    .slice(0, 5)
    .map(l => l.link);

  // 17. Ghost Library (Favorited but never watched — only real video links)
  let ghostLibraryVideo: string | null = null;
  if (sortedFavorites.length > 0 && sortedVideos.length > 0) {
    const videoLinksSet = new Set(sortedVideos.map(v => v.link));
    for (const fav of sortedFavorites) {
      if (isVideoLink(fav.link) && !videoLinksSet.has(fav.link)) {
        ghostLibraryVideo = fav.link;
        break;
      }
    }
  }

  // 18. First Antique Fav — skip entries with invalid dates or non-video links
  let firstAntiqueFav: { link: string; date: string } | null = null;
  for (const fav of sortedFavorites) {
    if (isVideoLink(fav.link) && isValidDate(parseDate(fav.date))) {
      firstAntiqueFav = { link: fav.link, date: fav.date };
      break;
    }
  }

  // 19. Last Obsession — deduplicated, only real video links
  const lastObsessionFavs = uniqueArray(
    sortedFavorites
      .filter(f => isVideoLink(f.link))
      .slice(-5)
      .map(f => f.link)
      .reverse()
  ).slice(0, 3);

  // 20. Like Generosity
  const likeRatio = videoCount > 0 ? (validLikes.length / videoCount) * 100 : 0;
  let likeLabel = 'Selective Reader';
  if (likeRatio > 80) {
    likeLabel = 'Free Liker (Amele)';
  } else if (likeRatio < 2) {
    likeLabel = 'Stingy/Aloof (Kasıntı)';
  } else if (likeRatio >= 2 && likeRatio <= 15) {
    likeLabel = 'Sophisticated';
  } else {
    likeLabel = 'Healthy Engager';
  }

  // 21. Loneliness Ratio: Copy link vs others
  let copyLinksCount = 0;
  let otherSharesCount = 0;
  for (const s of validShares) {
    if (s.method.toLowerCase().includes('copy') || s.method.toLowerCase().includes('link')) {
      copyLinksCount++;
    } else {
      otherSharesCount++;
    }
  }
  const lonelinessRatio = otherSharesCount > 0 ? parseFloat((copyLinksCount / otherSharesCount).toFixed(2)) : copyLinksCount;

  // D. Time & Rhythm (Date/Timestamp breaks)
  // 22. Weekly Peak Day
  const dayCounts = [0, 0, 0, 0, 0, 0, 0]; // Sun=0, Mon=1, ...
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  for (const v of sortedVideos) {
    const d = parseDate(v.date);
    dayCounts[d.getDay()]++;
  }
  let maxDayIdx = 0;
  let maxDayCount = 0;
  for (let i = 0; i < 7; i++) {
    if (dayCounts[i] > maxDayCount) {
      maxDayCount = dayCounts[i];
      maxDayIdx = i;
    }
  }
  const weeklyPeakPercentage = videoCount > 0 ? Math.round((maxDayCount / videoCount) * 100) : 0;
  const weeklyPeakDay = {
    day: daysOfWeek[maxDayIdx],
    percentage: weeklyPeakPercentage,
  };

  // 23. Black Saturday: Sat 21:00 - Sun 04:00 video watch count * 15 sec
  let satNightVideosCount = 0;
  for (const v of sortedVideos) {
    const d = parseDate(v.date);
    const day = d.getDay(); // 6 = Saturday, 0 = Sunday
    const hour = d.getHours();
    if ((day === 6 && hour >= 21) || (day === 0 && hour < 4)) {
      satNightVideosCount++;
    }
  }
  const blackSaturdayHours = parseFloat(((satNightVideosCount * 15) / 3600).toFixed(1));

  // 24. Monday Buffer: Mon 07:00 - 10:00 video count
  let mondayBufferCount = 0;
  for (const v of sortedVideos) {
    const d = parseDate(v.date);
    if (d.getDay() === 1 && d.getHours() >= 7 && d.getHours() < 10) {
      mondayBufferCount++;
    }
  }

  // 25. Calmest Day
  let minDayIdx = 1; // start from Monday
  let minDayCount = Infinity;
  for (let i = 0; i < 7; i++) {
    if (dayCounts[i] < minDayCount) {
      minDayCount = dayCounts[i];
      minDayIdx = i;
    }
  }
  const calmestDay = daysOfWeek[minDayIdx];

  // 26. Weekend Overtime Ratio
  // (Sat + Sun count) / (Mon to Fri count)
  const weekendCount = dayCounts[6] + dayCounts[0];
  const weekdayCount = dayCounts[1] + dayCounts[2] + dayCounts[3] + dayCounts[4] + dayCounts[5];
  const weekendOvertimeRatio = weekdayCount > 0 ? parseFloat((weekendCount / weekdayCount).toFixed(2)) : weekendCount;

  // 27. Holiday Escape
  // Check typical public holidays: 01-01 (New Year), 05-01 (Labor Day), 10-29 (Republic Day), etc.
  const publicHolidays = ['01-01', '04-23', '05-01', '05-19', '07-15', '08-30', '10-29'];
  let holidayDaysCount = 0;
  const watchedDaysMap: Record<string, number> = {};

  for (const v of sortedVideos) {
    const d = parseDate(v.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    watchedDaysMap[key] = (watchedDaysMap[key] || 0) + 1;
  }

  let normalDaysSum = 0;
  let normalDaysCount = 0;
  let holidayDaysSum = 0;

  for (const [dayKey, count] of Object.entries(watchedDaysMap)) {
    const monthDay = dayKey.substring(5); // MM-DD
    if (publicHolidays.includes(monthDay)) {
      holidayDaysSum += count;
      holidayDaysCount++;
    } else {
      normalDaysSum += count;
      normalDaysCount++;
    }
  }
  const avgNormal = normalDaysCount > 0 ? normalDaysSum / normalDaysCount : 0;
  const avgHoliday = holidayDaysCount > 0 ? holidayDaysSum / holidayDaysCount : 0;
  const holidayEscapePercentage = avgNormal > 0 ? Math.round(((avgHoliday - avgNormal) / avgNormal) * 100) : 0;

  // 28. Longest Day Record
  let longestDayDate = 'No data';
  let longestDayCount = 0;
  for (const [dayKey, count] of Object.entries(watchedDaysMap)) {
    if (count > longestDayCount) {
      longestDayCount = count;
      longestDayDate = dayKey;
    }
  }
  const longestDayHours = parseFloat(((longestDayCount * 15) / 3600).toFixed(1));
  const longestDayRecord = {
    date: longestDayDate,
    count: longestDayCount,
    hours: longestDayHours,
  };

  // 29. Employment Index: Weekday (Mon-Fri) 09:00 - 17:00 watch percentage
  let weekdayWorkHoursCount = 0;
  let totalWeekdayCount = 0;
  for (const v of sortedVideos) {
    const d = parseDate(v.date);
    const day = d.getDay();
    if (day >= 1 && day <= 5) {
      totalWeekdayCount++;
      const hr = d.getHours();
      if (hr >= 9 && hr < 17) {
        weekdayWorkHoursCount++;
      }
    }
  }
  const employmentIndex = totalWeekdayCount > 0 ? Math.round((weekdayWorkHoursCount / totalWeekdayCount) * 100) : 0;

  // 30. Goldfish Syndrome (skip in first 3s)
  // Estimated if subsequent video watched < 4s after previous video
  let shortWatches = 0;
  for (let i = 1; i < sortedVideos.length; i++) {
    const prev = parseDate(sortedVideos[i - 1].date);
    const curr = parseDate(sortedVideos[i].date);
    const diff = (curr.getTime() - prev.getTime()) / 1000;
    if (diff > 0 && diff < 4) {
      shortWatches++;
    }
  }
  const goldfishSyndromePercentage = videoCount > 0 ? Math.round((shortWatches / videoCount) * 100) : 0;

  // 31. Insomnia Curse: 01:00-06:00 watch total hours
  let insomniaVideoCount = 0;
  for (const v of sortedVideos) {
    const d = parseDate(v.date);
    const hr = d.getHours();
    if (hr >= 1 && hr < 6) {
      insomniaVideoCount++;
    }
  }
  const insomniaHours = parseFloat(((insomniaVideoCount * 15) / 3600).toFixed(1));

  // 32. Most Unproductive Hour
  const hourCounts = Array(24).fill(0);
  for (const v of sortedVideos) {
    const d = parseDate(v.date);
    hourCounts[d.getHours()]++;
  }
  let peakHour = 0;
  let peakHourCount = 0;
  for (let i = 0; i < 24; i++) {
    if (hourCounts[i] > peakHourCount) {
      peakHourCount = hourCounts[i];
      peakHour = i;
    }
  }
  const mostUnproductiveHour = `${String(peakHour).padStart(2, '0')}:00 - ${String((peakHour + 1) % 24).padStart(2, '0')}:00`;

  // 33. First Discovery Date
  const firstDiscoveryDate = sortedVideos.length > 0 ? parseDate(sortedVideos[0].date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }) : 'No history';

  // 34. Seasonal Comparison: Summer (June-Aug) vs Winter (Dec-Feb)
  let summerCount = 0;
  let winterCount = 0;
  for (const v of sortedVideos) {
    const d = parseDate(v.date);
    const m = d.getMonth(); // 0 = Jan, 11 = Dec
    if (m >= 5 && m <= 7) {
      summerCount++;
    } else if (m === 11 || m === 0 || m === 1) {
      winterCount++;
    }
  }
  const seasonalComparison = { summerCount, winterCount };

  // 35. Payday Greed: searches/likes/favs increase on 1st & 15th (with shop terms)
  const shoppingKeywords = ['buy', 'price', 'shop', 'ürün', 'fiyat', 'satın', 'link', 'get', 'ordered', 'indirim', 'sale', 'amazon', 'trendyol'];
  let paydayActionCount = 0;
  let otherDaysActionCount = 0;

  const allActions = [
    ...validSearches.map(s => ({ date: s.date, text: s.searchTerm })),
    ...validComments.map(c => ({ date: c.date, text: c.comment })),
  ];

  for (const act of allActions) {
    const d = parseDate(act.date);
    const isPayday = d.getDate() === 1 || d.getDate() === 15;
    const hasShopTerm = shoppingKeywords.some(kw => act.text.toLowerCase().includes(kw));
    if (hasShopTerm) {
      if (isPayday) paydayActionCount++;
      else otherDaysActionCount++;
    }
  }
  const paydayGreedIncrease = otherDaysActionCount > 0 ? Math.round(((paydayActionCount - (otherDaysActionCount / 14)) / (otherDaysActionCount / 14)) * 100) : 0;

  // 36. YoY Trend Increase
  let yoyTrendIncrease = 0;
  if (sortedVideos.length > 0) {
    const lastVideoDate = parseDate(sortedVideos[sortedVideos.length - 1].date);
    const lastYear = lastVideoDate.getFullYear();
    const prevYear = lastYear - 1;

    let lastYearCount = 0;
    let prevYearCount = 0;

    for (const v of sortedVideos) {
      const yr = parseDate(v.date).getFullYear();
      if (yr === lastYear) lastYearCount++;
      else if (yr === prevYear) prevYearCount++;
    }
    yoyTrendIncrease = prevYearCount > 0 ? Math.round(((lastYearCount - prevYearCount) / prevYearCount) * 100) : 0;
  }

  // 37. Morning Punctuality StdDev (of first scroll of the day)
  const dayFirstScrolls: Record<string, number> = {}; // YYYY-MM-DD -> minutes

  for (const v of sortedVideos) {
    const d = parseDate(v.date);
    const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const mins = d.getHours() * 60 + d.getMinutes();
    if (dayFirstScrolls[dayKey] === undefined || mins < dayFirstScrolls[dayKey]) {
      dayFirstScrolls[dayKey] = mins;
    }
  }
  const firstScrollVals = Object.values(dayFirstScrolls);
  let morningPunctualityStdDev = 0;
  if (firstScrollVals.length > 1) {
    const avg = firstScrollVals.reduce((a, b) => a + b, 0) / firstScrollVals.length;
    const sqDiffSum = firstScrollVals.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0);
    morningPunctualityStdDev = parseFloat(Math.sqrt(sqDiffSum / (firstScrollVals.length - 1)).toFixed(1));
  }

  // 38. Comment Hour
  const commentHourMap = Array(24).fill(0).map((_, i) => ({ hour: i, count: 0 }));
  for (const c of sortedComments) {
    const d = parseDate(c.date);
    commentHourMap[d.getHours()].count++;
  }

  // 39. Biological Sleep Gap
  // average diff in hours between last video (>22:00) and first video (<11:00 next day)
  let sleepGapSum = 0;
  let sleepGapCount = 0;
  const daysKeys = Object.keys(dayFirstScrolls).sort();
  // Find last scroll of each day
  const dayLastScrolls: Record<string, number> = {};
  for (const v of sortedVideos) {
    const d = parseDate(v.date);
    const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const mins = d.getHours() * 60 + d.getMinutes();
    if (dayLastScrolls[dayKey] === undefined || mins > dayLastScrolls[dayKey]) {
      dayLastScrolls[dayKey] = mins;
    }
  }

  for (let i = 0; i < daysKeys.length - 1; i++) {
    const tonightKey = daysKeys[i];
    const tomorrowKey = daysKeys[i + 1];

    const lastScrollMins = dayLastScrolls[tonightKey];
    const firstScrollMins = dayFirstScrolls[tomorrowKey];

    // check if tonight scroll is late (>21:00 or 1260 mins) and tomorrow scroll is morning (<11:00 or 660 mins)
    if (lastScrollMins >= 1200 || lastScrollMins < 240) { // late night scroll
      const sleepTime = lastScrollMins >= 1200 ? lastScrollMins : lastScrollMins + 1440; // absolute mins
      const wakeTime = firstScrollMins + 1440; // absolute mins next day
      const diffMins = wakeTime - sleepTime;
      if (diffMins > 120 && diffMins < 960) { // between 2h and 16h sleep
        sleepGapSum += diffMins;
        sleepGapCount++;
      }
    }
  }
  const biologicalSleepGapHours = sleepGapCount > 0 ? parseFloat(((sleepGapSum / sleepGapCount) / 60).toFixed(1)) : 8.0;

  // 40. Ultimate Loneliness Score (0-100)
  // weights: insomnia (30%), goldfish skip rate (20%), share loneliness (25%), employment index (25%)
  const goldfishPart = goldfishSyndromePercentage;
  const sharePart = Math.min(100, lonelinessRatio * 20); // 5+ ratio is max loneliness
  const insomniaPart = Math.min(100, insomniaHours * 8); // 12.5+ hours is max insomnia
  const workHoursScrollPart = employmentIndex; // more scroll during work hours = higher rating
  const ultimateLonelinessScore = Math.min(100, Math.round(
    insomniaPart * 0.3 + goldfishPart * 0.2 + sharePart * 0.25 + workHoursScrollPart * 0.25
  ));

  // E. Repost & Deep Obsession (Reposts)
  // 41. Secret Courier — only valid video links
  let secretCourierRepost: { link: string; date: string } | null = null;
  const validVideoReposts = sortedReposts.filter(r => isVideoLink(r.link));
  if (validVideoReposts.length > 0) {
    const randomIdx = Math.floor(Math.random() * validVideoReposts.length);
    secretCourierRepost = {
      link: validVideoReposts[randomIdx].link,
      date: validVideoReposts[randomIdx].date,
    };
  }

  // 42. Repost Frequency
  const repostFrequencyAnomaly = videoCount > 0 ? parseFloat((validReposts.length / videoCount).toFixed(4)) : 0;

  // 43. Ultimate Obsession Video (Video link that is Liked, Commented, Favorited, or Reposted)
  // Find URL with highest overlap count across all files — only real video links
  const linkInteractions: Record<string, number> = {};
  const addInteraction = (link: string) => {
    if (!link || !isVideoLink(link)) return; // Skip non-video links
    linkInteractions[link] = (linkInteractions[link] || 0) + 1;
  };
  validLikes.forEach(l => addInteraction(l.link));
  validFavorites.forEach(f => addInteraction(f.link));
  validReposts.forEach(r => addInteraction(r.link));
  validShares.forEach(s => addInteraction(s.link));

  let ultimateObsessionVideo: { link: string; count: number } | null = null;
  let maxInteract = 0;
  for (const link in linkInteractions) {
    if (linkInteractions[link] > maxInteract) {
      maxInteract = linkInteractions[link];
      ultimateObsessionVideo = { link, count: maxInteract };
    }
  }

  // 44. First Repost Antique — skip entries with invalid dates or non-video links
  let firstRepostAntique: { link: string; date: string } | null = null;
  for (const r of sortedReposts) {
    if (isVideoLink(r.link) && isValidDate(parseDate(r.date))) {
      firstRepostAntique = { link: r.link, date: r.date };
      break;
    }
  }

  // 45. Worshipped Creator
  // Check creators across comments, likes, favorites, reposts — only real video links, format UIDs
  const globalCreators: Record<string, number> = {};
  const countCreator = (link: string) => {
    if (!isVideoLink(link)) return; // Skip non-video links
    const creator = extractUsername(link);
    if (creator) {
      globalCreators[creator] = (globalCreators[creator] || 0) + 1;
    }
  };
  validLikes.forEach(l => countCreator(l.link));
  validFavorites.forEach(f => countCreator(f.link));
  validReposts.forEach(r => countCreator(r.link));
  validShares.forEach(s => countCreator(s.link));
  // comment target
  if (targetProfile) {
    globalCreators[targetProfile.username] = (globalCreators[targetProfile.username] || 0) + (targetProfile.count * 2); // weight comment mentions higher
  }

  // Sort: real usernames first, raw UIDs last
  let worshippedCreator: string | null = null;
  const globalRealCreators: [string, number][] = [];
  const globalUidCreators: [string, number][] = [];
  for (const creator in globalCreators) {
    if (isRawUID(creator)) {
      globalUidCreators.push([creator, globalCreators[creator]]);
    } else {
      globalRealCreators.push([creator, globalCreators[creator]]);
    }
  }
  const sortedGlobalCreators = [...globalRealCreators, ...globalUidCreators].sort((a, b) => b[1] - a[1]);
  if (sortedGlobalCreators.length > 0) {
    worshippedCreator = formatCreatorName(sortedGlobalCreators[0][0]);
  }

  return {
    timeCell: { hours, days, videoCount },
    algorithmHypnosis: {
      durationMinutes: Math.round(maxSessionMinutes),
      date: maxSessionDate,
      sessionLength: maxSessionCount,
    },
    socialVolume: {
      likes: validLikes.length,
      comments: validComments.length,
      chartData,
    },
    radicalComment,
    simpEvidence,
    midnightLashing,
    genesisComment,
    targetProfile,
    snarkyCommentsCount,
    stalkTarget,
    midnightMadnessSearch,
    detectiveSeries,
    topSearches,
    forgottenCuriosity,
    secretFavCreator,
    whyILikedEvidence,
    ghostLibraryVideo,
    firstAntiqueFav,
    lastObsessionFavs,
    likeGenerosity: {
      percentage: Math.round(likeRatio),
      label: likeLabel,
    },
    lonelinessRatio,
    weeklyPeakDay,
    blackSaturdayHours,
    mondayBufferCount,
    calmestDay,
    weekendOvertimeRatio,
    holidayEscapePercentage,
    longestDayRecord,
    employmentIndex,
    goldfishSyndromePercentage,
    insomniaHours,
    mostUnproductiveHour,
    firstDiscoveryDate,
    seasonalComparison,
    paydayGreedIncrease,
    yoyTrendIncrease,
    morningPunctualityStdDev,
    commentHourDistribution: commentHourMap,
    biologicalSleepGapHours,
    ultimateLonelinessScore,
    secretCourierRepost,
    repostFrequencyAnomaly,
    ultimateObsessionVideo,
    firstRepostAntique,
    worshippedCreator,
  };
}
