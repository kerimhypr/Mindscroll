export interface VideoEntry {
  date: string;
  link: string;
}

export interface SearchEntry {
  date: string;
  searchTerm: string;
}

export interface CommentEntry {
  date: string;
  comment: string;
}

export interface LikeEntry {
  date: string;
  link: string;
}

export interface FavoriteEntry {
  date: string;
  link: string;
}

export interface ShareEntry {
  date: string;
  link: string;
  method: string;
}

export interface RepostEntry {
  date: string;
  link: string;
}

export interface ParsedData {
  videos?: VideoEntry[];
  searches?: SearchEntry[];
  comments?: CommentEntry[];
  likes?: LikeEntry[];
  favorites?: FavoriteEntry[];
  shares?: ShareEntry[];
  reposts?: RepostEntry[];
}

export interface AnalysisResult {
  // Free Metrics
  timeCell: {
    hours: number;
    days: number;
    videoCount: number;
  };
  algorithmHypnosis: {
    durationMinutes: number;
    date: string;
    sessionLength: number;
  };
  socialVolume: {
    likes: number;
    comments: number;
    chartData: { name: string; count: number }[];
  };

  // Premium Metrics
  // A. Comments
  radicalComment: {
    comment: string;
    date: string;
    score: number;
  } | null;
  simpEvidence: {
    comment: string;
    date: string;
    score: number;
  } | null;
  midnightLashing: {
    comment: string;
    date: string;
    time: string;
  } | null;
  genesisComment: {
    comment: string;
    date: string;
  } | null;
  targetProfile: {
    username: string;
    count: number;
  } | null;
  snarkyCommentsCount: number; // "Boş", "Sil", "Rezil", "Çöp" etc

  // B. Search
  stalkTarget: {
    username: string;
    count: number;
  } | null;
  midnightMadnessSearch: {
    term: string;
    date: string;
  } | null;
  detectiveSeries: {
    topic: string;
    searches: string[];
    date: string;
  } | null;
  topSearches: { term: string; count: number }[];
  forgottenCuriosity: string | null;

  // C. Likes/Favs
  secretFavCreator: string | null;
  whyILikedEvidence: string[];
  ghostLibraryVideo: string | null;
  firstAntiqueFav: { link: string; date: string } | null;
  lastObsessionFavs: string[];
  likeGenerosity: {
    percentage: number;
    label: string; // "generous" vs "stubborn/kasıntı" etc
  };
  lonelinessRatio: number; // Copy link vs Shared to someone

  // D. Time & Rhythm
  weeklyPeakDay: { day: string; percentage: number };
  blackSaturdayHours: number;
  mondayBufferCount: number;
  calmestDay: string;
  weekendOvertimeRatio: number;
  holidayEscapePercentage: number;
  longestDayRecord: { date: string; count: number; hours: number };
  employmentIndex: number; // % of scroll during work hours (9-17 weekday)
  goldfishSyndromePercentage: number; // % of skips in first 3s
  insomniaHours: number;
  mostUnproductiveHour: string;
  firstDiscoveryDate: string;
  seasonalComparison: { summerCount: number; winterCount: number };
  paydayGreedIncrease: number; // % increase on 1st & 15th
  yoyTrendIncrease: number; // YoY trend
  morningPunctualityStdDev: number; // Std dev of first scroll time
  commentHourDistribution: { hour: number; count: number }[];
  biologicalSleepGapHours: number;
  ultimateLonelinessScore: number; // 0-100 score

  // E. Reposts & Deep Obsession
  secretCourierRepost: { link: string; date: string } | null;
  repostFrequencyAnomaly: number;
  ultimateObsessionVideo: { link: string; count: number } | null;
  firstRepostAntique: { link: string; date: string } | null;
  worshippedCreator: string | null;
}
