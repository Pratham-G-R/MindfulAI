/**
 * Sentiment Analysis Service
 * 
 * Provides sentiment analysis of user messages using the
 * 'sentiment' npm package, along with crisis keyword detection
 * for safety monitoring.
 */

const Sentiment = require('sentiment');
const analyzer = new Sentiment();

// ─── Crisis Keywords (high-risk phrases) ────────────────────────────────────
const CRISIS_KEYWORDS = [
  'suicide', 'suicidal', 'kill myself', 'end my life', 'want to die',
  'self-harm', 'self harm', 'hurt myself', 'cutting', 'overdose',
  'no reason to live', 'better off dead', 'can\'t go on',
  'end it all', 'not worth living', 'goodbye forever',
  'final goodbye', 'last message', 'take my life'
];

// ─── Emotional Intensity Words ──────────────────────────────────────────────
const INTENSITY_MODIFIERS = {
  amplifiers: ['very', 'extremely', 'incredibly', 'absolutely', 'completely', 'totally', 'really'],
  diminishers: ['slightly', 'somewhat', 'a bit', 'a little', 'kind of', 'sort of']
};

/**
 * Analyze sentiment of a text message
 * @param {string} text - Text to analyze
 * @returns {Object} Sentiment analysis result
 */
function analyzeSentiment(text) {
  if (!text || typeof text !== 'string') {
    return {
      score: 0,
      comparative: 0,
      positive: [],
      negative: [],
      tokens: [],
      mood: 'neutral',
      intensity: 'mild'
    };
  }

  const result = analyzer.analyze(text);

  // Determine intensity
  const lowerText = text.toLowerCase();
  let intensity = 'moderate';
  if (INTENSITY_MODIFIERS.amplifiers.some(w => lowerText.includes(w))) {
    intensity = 'strong';
  } else if (INTENSITY_MODIFIERS.diminishers.some(w => lowerText.includes(w))) {
    intensity = 'mild';
  }

  return {
    score: result.score,
    comparative: result.comparative,
    positive: result.positive || [],
    negative: result.negative || [],
    tokens: result.tokens || [],
    mood: getMoodFromSentiment(result.comparative),
    intensity: intensity
  };
}

/**
 * Map sentiment score to mood category
 * @param {number} score - Comparative sentiment score
 * @returns {string} Mood category
 */
function getMoodFromSentiment(score) {
  if (score >= 0.5) return 'very_positive';
  if (score >= 0.1) return 'positive';
  if (score >= -0.1) return 'neutral';
  if (score >= -0.5) return 'negative';
  return 'very_negative';
}

/**
 * Detect crisis-related keywords in text
 * @param {string} text - Text to check
 * @returns {Object} Crisis detection result
 */
function detectCrisisKeywords(text) {
  if (!text || typeof text !== 'string') {
    return { isCrisis: false, matchedKeywords: [], riskLevel: 'none' };
  }

  const lowerText = text.toLowerCase();
  const matchedKeywords = CRISIS_KEYWORDS.filter(kw => lowerText.includes(kw));

  let riskLevel = 'none';
  if (matchedKeywords.length >= 3) {
    riskLevel = 'critical';
  } else if (matchedKeywords.length >= 1) {
    riskLevel = 'high';
  }

  return {
    isCrisis: matchedKeywords.length > 0,
    matchedKeywords,
    riskLevel
  };
}

module.exports = { analyzeSentiment, getMoodFromSentiment, detectCrisisKeywords };
