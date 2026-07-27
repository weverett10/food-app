export interface FoodItem {
  name: string;
  quantity: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface LogEntry {
  logId: string;
  timestamp: number; // ms since epoch
  photoThumbnailUrl: string;
  photoPublicId: string;
  userNote: string | null;
  foods: FoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  assumptions: string;
  isManuallyCorrected: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Favorite {
  favoriteId: string;
  name: string;
  foods: FoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  timesUsed: number;
  lastUsedAt: number;
  createdAt: number;
}

export interface ClaudeAnalysisResult {
  foods: FoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  assumptions: string;
}
