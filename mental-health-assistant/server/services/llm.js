/**
 * LLM Service - Groq API Integration with Fallback
 * 
 * Handles communication with the Groq LLM API for generating
 * empathetic, therapeutic responses. Includes comprehensive
 * fallback responses when the API is unavailable.
 */

const Groq = require('groq-sdk');

// ─── System Prompt ──────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are MindfulAI, a compassionate and empathetic virtual mental health support assistant.

Your role is to:
- Provide emotional support and active listening
- Suggest evidence-based coping techniques (CBT, mindfulness, grounding exercises)
- Help users identify and process their emotions
- Offer practical self-help strategies
- Recognize crisis situations and provide appropriate helpline numbers
- Never provide medical diagnoses or replace professional therapy
- Use warm, supportive, and non-judgmental language
- Ask thoughtful follow-up questions to understand the user better
- Validate the user's feelings before offering suggestions
- Use formatting like **bold** for emphasis and numbered lists for techniques

Important safety guidelines:
- If a user expresses suicidal thoughts or self-harm, IMMEDIATELY provide crisis helpline numbers:
  * National Suicide Prevention Lifeline: 988 (US)
  * Crisis Text Line: Text HOME to 741741
  * iCall (India): 9152987821
  * Vandrevala Foundation (India): 1860-2662-345
- Always remind users that you are an AI and encourage seeking professional help
- Never prescribe medication or make medical recommendations
- Maintain appropriate therapeutic boundaries
- Be culturally sensitive and inclusive

Response style:
- Keep responses concise but meaningful (150-300 words)
- Use empathetic language and emotional validation
- Offer 1-2 specific, actionable coping techniques per response
- End with a gentle question to continue the conversation`;

// ─── Fallback Responses ─────────────────────────────────────────────────────
const FALLBACK_RESPONSES = {
  anxiety: [
    "I can hear that you're feeling anxious, and I want you to know that's completely valid. Anxiety can feel overwhelming, but there are techniques that can help.\n\n**Try this grounding exercise (5-4-3-2-1):**\n1. Name **5** things you can see\n2. **4** things you can touch\n3. **3** things you can hear\n4. **2** things you can smell\n5. **1** thing you can taste\n\nThis helps bring you back to the present moment. Would you like to try it together?",
    "Anxiety is your body's natural alarm system — it means you care deeply. Let's work through this together.\n\n**A quick breathing technique:**\nBreathe in for 4 counts, hold for 4, breathe out for 4. Repeat 4 times. This activates your parasympathetic nervous system and signals safety to your brain.\n\nWhat specific thoughts are making you feel most anxious right now?"
  ],
  depression: [
    "Thank you for sharing how you're feeling. Depression can make everything feel heavier, and I want you to know you're not alone in this.\n\n**One small step you can try:**\nThe \"opposite action\" technique from DBT — when depression tells you to isolate, try doing just one small social thing. Even texting a friend counts.\n\nRemember: you don't have to feel motivated to take action. Sometimes action comes first, and motivation follows. What's one tiny thing you enjoyed doing in the past?",
    "I hear you, and your feelings are valid. Depression often lies to us, telling us things won't get better — but that's the illness talking, not the truth.\n\n**Try the 'Three Good Things' exercise:**\nBefore bed tonight, write down three things that went okay today, no matter how small. Research shows this can gradually shift our brain's negativity bias.\n\nIf these feelings persist, I'd encourage reaching out to a mental health professional. Would you like to talk more about what you're experiencing?"
  ],
  stress: [
    "It sounds like you're carrying a lot right now. Stress can build up without us realizing it, so recognizing it is actually an important first step.\n\n**Try progressive muscle relaxation:**\n1. Start with your toes — tense them for 5 seconds, then release\n2. Move up through your body: calves, thighs, stomach, hands, shoulders, face\n3. Notice the difference between tension and relaxation\n\nThis helps your body physically let go of stress. What's the biggest source of stress for you right now?",
    "Stress affects both your mind and body, and it's important to address it. You're already taking a positive step by talking about it.\n\n**The 'Worry Window' technique:**\nSet aside 15 minutes at a specific time each day as your 'worry time.' When anxious thoughts come up outside that window, write them down and tell yourself, 'I'll address this during my worry time.'\n\nThis helps contain stress so it doesn't take over your whole day. What would help you feel most supported right now?"
  ],
  sleep: [
    "Sleep difficulties can be really frustrating and affect everything else in your life. Let's look at some strategies that might help.\n\n**Sleep hygiene tips:**\n1. Keep a consistent sleep/wake schedule\n2. Avoid screens 30 minutes before bed\n3. Try the **4-7-8 breathing technique**: Inhale 4 sec, hold 7 sec, exhale 8 sec\n4. Keep your room cool (65-68°F / 18-20°C)\n5. Try a 'brain dump' — write down tomorrow's worries before bed\n\nWhich of these resonates most with you?",
  ],
  anger: [
    "Anger is a valid emotion — it often tells us that a boundary has been crossed or a need isn't being met. It's okay to feel angry.\n\n**The STOP technique:**\n- **S**top what you're doing\n- **T**ake a deep breath\n- **O**bserve your thoughts and feelings without judgment\n- **P**roceed mindfully\n\nPhysical movement can also help process anger — even a short walk or squeezing ice cubes. What triggered these feelings, if you're comfortable sharing?",
  ],
  loneliness: [
    "Feeling lonely can be incredibly painful, and I want you to know that reaching out here shows real courage. Connection is a fundamental human need.\n\n**Small steps toward connection:**\n1. Send a brief message to someone you haven't talked to in a while\n2. Join an online community around an interest of yours\n3. Practice self-compassion — talk to yourself like you would a friend\n4. Consider volunteering — helping others can create meaningful connections\n\nRemember, loneliness is a feeling, not a fact about your worth. What kind of connection would feel most meaningful to you?",
  ],
  grief: [
    "I'm so sorry for what you're going through. Grief is one of the most challenging human experiences, and there's no 'right' way to grieve.\n\n**Important things to remember:**\n- Grief isn't linear — it comes in waves, and that's normal\n- Allow yourself to feel whatever comes up without judgment\n- It's okay to have good moments too — they don't diminish your loss\n- Take care of basic needs: eating, sleeping, staying hydrated\n\nThe 'continuing bonds' approach suggests maintaining a connection to what you've lost through memories, rituals, or writing. Would you like to share what you're grieving?",
  ],
  panic: [
    "If you're having a panic attack right now, I want you to know: **you are safe, and this will pass.** Panic attacks typically peak within 10 minutes.\n\n**Do this right now:**\n1. Place both feet flat on the ground\n2. Breathe in slowly through your nose for 4 counts\n3. Hold for 2 counts\n4. Breathe out slowly through your mouth for 6 counts\n5. Focus on the sensation of your feet on the ground\n6. Repeat until you feel the intensity decreasing\n\nYour body is having a strong but temporary reaction. You've survived every panic attack you've ever had. How are you feeling right now?",
  ],
  selfcare: [
    "Taking care of yourself isn't selfish — it's essential. I'm glad you're thinking about self-care.\n\n**The NEST self-care framework:**\n- **N**ourish: Eat regular meals, stay hydrated, take your medications\n- **E**xercise: Even 10 minutes of walking counts\n- **S**leep: Aim for consistent sleep and wake times\n- **T**reat: Do one enjoyable thing daily, no matter how small\n\nSelf-care looks different for everyone. Some find comfort in nature, others in creative expression, and some in quiet solitude. What makes you feel most recharged?",
  ],
  crisis: [
    "I'm really concerned about what you're sharing, and I want you to know that help is available right now.\n\n**🚨 Please reach out to one of these resources:**\n- **National Suicide Prevention Lifeline:** 988 (call or text)\n- **Crisis Text Line:** Text HOME to 741741\n- **iCall (India):** 9152987821\n- **Vandrevala Foundation (India):** 1860-2662-345\n- **Emergency Services:** 911 (US) / 112 (India)\n\nYou matter, and there are people who want to help. You don't have to go through this alone. Would you be willing to reach out to one of these resources?",
  ],
  default: [
    "Thank you for sharing that with me. I'm here to listen and support you in any way I can.\n\nSometimes just putting our thoughts into words can help us process them better. I'd love to understand more about what you're going through.\n\n**A quick check-in:** On a scale of 1-10, how are you feeling right now? And what would help you feel even just one point better?\n\nRemember, you can also explore our mood tracker, breathing exercises, or journal features — they're designed to support your wellbeing journey.",
    "I appreciate you opening up. Every conversation is a step toward understanding yourself better.\n\n**A mindfulness moment:**\nTake a slow, deep breath right now. Feel the air fill your lungs. As you exhale, let go of any tension you're holding.\n\nSometimes the most powerful thing we can do is simply pause and be present. What's on your mind today? I'm here to listen without judgment.",
    "I hear you, and your feelings matter. It takes courage to talk about what we're going through.\n\n**Something to remember:** You don't have to have everything figured out right now. Healing and growth aren't linear — they're a journey with ups and downs.\n\nWould you like to:\n1. Talk more about what's on your mind?\n2. Try a guided breathing exercise?\n3. Write in your journal?\n4. Learn a new coping technique?\n\nI'm here for whatever you need."
  ]
};

// ─── Groq Client Setup ──────────────────────────────────────────────────────
let groqClient = null;

function getGroqClient() {
  if (!groqClient && process.env.GROQ_API_KEY) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

/**
 * Generate a response using the Groq LLM API with fallback
 * @param {string} message - User's message
 * @param {Array} history - Conversation history [{role, content}]
 * @returns {Promise<string>} Generated response
 */
async function generateResponse(message, history = []) {
  const client = getGroqClient();

  // Try Groq API first
  if (client) {
    try {
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.slice(-10).map(h => ({
          role: h.role,
          content: h.content
        })),
        { role: 'user', content: message }
      ];

      const completion = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1024,
        top_p: 0.9,
        frequency_penalty: 0.3,
        presence_penalty: 0.3
      });

      return completion.choices[0]?.message?.content || getFallbackResponse(message);
    } catch (error) {
      console.error('Groq API error:', error.message);
      // Fall through to fallback
    }
  }

  // Use fallback responses
  return getFallbackResponse(message);
}

/**
 * Get a contextual fallback response based on keyword matching
 * @param {string} message - User's message
 * @returns {string} Fallback response
 */
function getFallbackResponse(message) {
  const lowerMessage = message.toLowerCase();

  // Crisis detection first (highest priority)
  const crisisKeywords = ['suicide', 'kill myself', 'end my life', 'want to die',
    'self-harm', 'hurt myself', 'no reason to live', 'better off dead'];
  if (crisisKeywords.some(kw => lowerMessage.includes(kw))) {
    return FALLBACK_RESPONSES.crisis[0];
  }

  // Keyword-category mapping
  const categoryKeywords = {
    anxiety: ['anxiety', 'anxious', 'worried', 'worry', 'nervous', 'fear', 'scared', 'overthinking', 'restless'],
    depression: ['depress', 'sad', 'hopeless', 'empty', 'worthless', 'unmotivated', 'no energy', 'numb', 'meaningless'],
    stress: ['stress', 'overwhelm', 'pressure', 'burnout', 'exhausted', 'too much', 'can\'t cope', 'swamped'],
    sleep: ['sleep', 'insomnia', 'can\'t sleep', 'nightmare', 'tired', 'fatigue', 'restless night', 'wake up'],
    anger: ['angry', 'anger', 'furious', 'rage', 'frustrated', 'irritated', 'annoyed', 'mad'],
    loneliness: ['lonely', 'alone', 'isolated', 'no friends', 'nobody cares', 'disconnected', 'abandoned'],
    grief: ['grief', 'loss', 'died', 'death', 'mourning', 'lost someone', 'passed away', 'miss them'],
    panic: ['panic', 'panic attack', 'can\'t breathe', 'heart racing', 'dizzy', 'shaking', 'trembling'],
    selfcare: ['self-care', 'self care', 'take care', 'wellness', 'healthy habits', 'routine', 'balance']
  };

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => lowerMessage.includes(kw))) {
      const responses = FALLBACK_RESPONSES[category];
      return responses[Math.floor(Math.random() * responses.length)];
    }
  }

  // Default response
  const defaults = FALLBACK_RESPONSES.default;
  return defaults[Math.floor(Math.random() * defaults.length)];
}

module.exports = { generateResponse, getFallbackResponse, SYSTEM_PROMPT };
