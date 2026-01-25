// State management
let currentScenario = null;
let currentStep = 0;
let learnedPhrases = new Set();
let completedScenarios = new Set();
let showHints = true;
let phraseReviews = {}; // Tracks review schedule for each phrase
let currentReviewQueue = [];
let reviewIndex = 0;
let reviewStats = { correct: 0, wrong: 0 };

// DOM elements
const scenarioSelection = document.getElementById('scenario-selection');
const conversationView = document.getElementById('conversation-view');
const reviewView = document.getElementById('review-view');
const scenariosGrid = document.getElementById('scenarios-grid');
const chatMessages = document.getElementById('chat-messages');
const optionsContainer = document.getElementById('options-container');
const scenarioTitle = document.getElementById('scenario-title');
const backBtn = document.getElementById('back-btn');
const reviewBackBtn = document.getElementById('review-back-btn');
const showHintsCheckbox = document.getElementById('show-hints');
const startReviewBtn = document.getElementById('start-review-btn');

// Stats elements
const phrasesLearnedEl = document.getElementById('phrases-learned');
const scenariosCompletedEl = document.getElementById('scenarios-completed');
const dueReviewsEl = document.getElementById('due-reviews');

// Review elements
const reviewCard = document.getElementById('review-card');
const reviewComplete = document.getElementById('review-complete');
const reviewQuestion = document.getElementById('review-question');
const reviewAnswerInput = document.getElementById('review-answer');
const checkAnswerBtn = document.getElementById('check-answer-btn');
const reviewResult = document.getElementById('review-result');
const reviewCountEl = document.getElementById('review-count');
const reviewTotalEl = document.getElementById('review-total');
const correctCountEl = document.getElementById('correct-count');
const wrongCountEl = document.getElementById('wrong-count');
const finishReviewBtn = document.getElementById('finish-review-btn');

// Spaced repetition intervals (in days)
const SRS_INTERVALS = [1, 3, 7, 14, 30, 60];

// Initialize app
document.addEventListener('DOMContentLoaded', init);

function init() {
    loadProgress();
    renderScenarios();
    setupEventListeners();
    updateStats();
    updateReviewButton();
}

function setupEventListeners() {
    backBtn.addEventListener('click', backToScenarios);
    reviewBackBtn.addEventListener('click', backToScenarios);
    showHintsCheckbox.addEventListener('change', (e) => {
        showHints = e.target.checked;
        updateOptionsDisplay();
    });
    startReviewBtn.addEventListener('click', startReview);
    checkAnswerBtn.addEventListener('click', checkAnswer);
    reviewAnswerInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkAnswer();
    });
    finishReviewBtn.addEventListener('click', backToScenarios);
}

function loadProgress() {
    const saved = localStorage.getItem('bosnian-progress');
    if (saved) {
        const data = JSON.parse(saved);
        learnedPhrases = new Set(data.phrases || []);
        completedScenarios = new Set(data.completed || []);
        phraseReviews = data.reviews || {};
    }
}

function saveProgress() {
    const data = {
        phrases: Array.from(learnedPhrases),
        completed: Array.from(completedScenarios),
        reviews: phraseReviews,
        lastPractice: new Date().toISOString()
    };
    localStorage.setItem('bosnian-progress', JSON.stringify(data));
    updateStats();
    updateReviewButton();
}

function addPhraseForReview(bosnian, english) {
    if (!phraseReviews[bosnian]) {
        phraseReviews[bosnian] = {
            english: english,
            level: 0,
            nextReview: new Date().toISOString().split('T')[0], // Today
            correctStreak: 0
        };
    }
}

function getDueReviews() {
    const today = new Date().toISOString().split('T')[0];
    return Object.entries(phraseReviews).filter(([_, data]) => data.nextReview <= today);
}

function updateReviewButton() {
    const dueCount = getDueReviews().length;
    dueReviewsEl.textContent = dueCount;
    
    if (dueCount > 0) {
        startReviewBtn.disabled = false;
        startReviewBtn.textContent = `Start Daily Review (${dueCount} due)`;
    } else {
        startReviewBtn.disabled = true;
        startReviewBtn.textContent = 'No reviews due today';
    }
}

function updateStats() {
    phrasesLearnedEl.textContent = learnedPhrases.size;
    scenariosCompletedEl.textContent = completedScenarios.size;
}

function renderScenarios() {
    scenariosGrid.innerHTML = scenarios.map(scenario => `
        <div class="scenario-card ${completedScenarios.has(scenario.id) ? 'completed' : ''}" 
             onclick="startScenario('${scenario.id}')">
            <div class="scenario-icon">${scenario.icon}</div>
            <h3>${scenario.title}</h3>
            <p>${scenario.description}</p>
            <span class="scenario-difficulty">${scenario.difficulty}</span>
            ${completedScenarios.has(scenario.id) ? '<div style="margin-top: 10px;">✓ Completed</div>' : ''}
        </div>
    `).join('');
}

function startScenario(scenarioId) {
    currentScenario = scenarios.find(s => s.id === scenarioId);
    currentStep = 0;
    
    scenarioSelection.classList.remove('active');
    conversationView.classList.add('active');
    
    scenarioTitle.textContent = currentScenario.title;
    chatMessages.innerHTML = '';
    
    displayMessage(currentScenario.conversation[0]);
}

function displayMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.speaker}`;
    
    let culturalNoteHTML = '';
    if (message.culturalNote) {
        culturalNoteHTML = `
            <div class="cultural-note">
                <strong>💡 Cultural Tip:</strong>
                ${message.culturalNote}
            </div>
        `;
    }
    
    messageDiv.innerHTML = `
        <div class="message-content">
            <div class="message-text">${message.bosnian}</div>
            <div class="message-translation">${message.english}</div>
            ${culturalNoteHTML}
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Show response options if it's bot's message
    if (message.speaker === 'bot' && message.responses) {
        displayOptions(message.responses);
    }
}

function displayOptions(responses) {
    optionsContainer.innerHTML = responses.map((response, index) => `
        <div class="response-option" onclick="selectResponse(${index})">
            <div class="option-bosnian">${response.bosnian}</div>
            ${showHints ? `<div class="option-english">${response.english}</div>` : ''}
        </div>
    `).join('');
}

function updateOptionsDisplay() {
    const currentMessage = currentScenario.conversation[currentStep];
    if (currentMessage && currentMessage.responses) {
        displayOptions(currentMessage.responses);
    }
}

function selectResponse(responseIndex) {
    const currentMessage = currentScenario.conversation[currentStep];
    const selectedResponse = currentMessage.responses[responseIndex];
    
    // Add phrase to learned set and review system
    learnedPhrases.add(selectedResponse.bosnian);
    addPhraseForReview(selectedResponse.bosnian, selectedResponse.english);
    
    // Display user's response
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'message user';
    userMessageDiv.innerHTML = `
        <div class="message-content">
            <div class="message-text">${selectedResponse.bosnian}</div>
            <div class="message-translation">${selectedResponse.english}</div>
        </div>
    `;
    chatMessages.appendChild(userMessageDiv);
    
    // Show feedback
    setTimeout(() => {
        const feedbackDiv = document.createElement('div');
        feedbackDiv.className = 'message bot';
        feedbackDiv.innerHTML = `
            <div class="message-content" style="background: #10b981;">
                <div class="message-text">✓ ${selectedResponse.feedback}</div>
            </div>
        `;
        chatMessages.appendChild(feedbackDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Move to next step
        setTimeout(() => {
            if (selectedResponse.next === 'complete') {
                completeScenario();
            } else {
                currentStep = selectedResponse.next;
                displayMessage(currentScenario.conversation[currentStep]);
            }
        }, 1500);
    }, 500);
    
    // Clear options
    optionsContainer.innerHTML = '';
    
    saveProgress();
}

function completeScenario() {
    completedScenarios.add(currentScenario.id);
    saveProgress();
    
    const completionDiv = document.createElement('div');
    completionDiv.className = 'message bot';
    completionDiv.innerHTML = `
        <div class="message-content" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
            <div class="message-text">🎉 Scenario complete!</div>
            <div class="message-translation">You learned ${learnedPhrases.size} phrases total!</div>
        </div>
    `;
    chatMessages.appendChild(completionDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Show back button suggestion
    setTimeout(() => {
        alert('Great job! Try another scenario to learn more.');
    }, 1500);
}

function backToScenarios() {
    conversationView.classList.remove('active');
    reviewView.classList.remove('active');
    scenarioSelection.classList.add('active');
    renderScenarios(); // Refresh to show completed status
}

// Review System Functions
function startReview() {
    const dueReviews = getDueReviews();
    if (dueReviews.length === 0) return;
    
    currentReviewQueue = shuffleArray(dueReviews);
    reviewIndex = 0;
    reviewStats = { correct: 0, wrong: 0 };
    
    scenarioSelection.classList.remove('active');
    reviewView.classList.add('active');
    
    reviewCard.classList.remove('hidden');
    reviewComplete.classList.add('hidden');
    
    reviewTotalEl.textContent = currentReviewQueue.length;
    showNextReview();
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function showNextReview() {
    if (reviewIndex >= currentReviewQueue.length) {
        finishReview();
        return;
    }
    
    const [bosnian, data] = currentReviewQueue[reviewIndex];
    const direction = Math.random() < 0.5 ? 'to-english' : 'to-bosnian';
    
    reviewCountEl.textContent = reviewIndex;
    reviewAnswerInput.value = '';
    reviewResult.classList.add('hidden');
    reviewResult.className = 'review-result hidden';
    
    if (direction === 'to-english') {
        reviewQuestion.innerHTML = `
            <div class="direction">Translate to English:</div>
            <div class="phrase">${bosnian}</div>
        `;
        reviewQuestion.dataset.answer = data.english.toLowerCase();
        reviewQuestion.dataset.bosnian = bosnian;
    } else {
        reviewQuestion.innerHTML = `
            <div class="direction">Translate to Bosnian:</div>
            <div class="phrase">${data.english}</div>
        `;
        reviewQuestion.dataset.answer = bosnian.toLowerCase();
        reviewQuestion.dataset.bosnian = bosnian;
    }
    
    reviewAnswerInput.focus();
}

function checkAnswer() {
    const userAnswer = reviewAnswerInput.value.trim().toLowerCase();
    const correctAnswer = reviewQuestion.dataset.answer;
    const bosnian = reviewQuestion.dataset.bosnian;
    
    if (!userAnswer) return;
    
    const isCorrect = userAnswer === correctAnswer;
    
    reviewResult.classList.remove('hidden');
    reviewResult.classList.add(isCorrect ? 'correct' : 'wrong');
    
    if (isCorrect) {
        reviewStats.correct++;
        updatePhraseReview(bosnian, true);
        reviewResult.innerHTML = `
            <div class="result-icon">✓</div>
            <div style="font-size: 1.2em; font-weight: 600;">Correct!</div>
            <button class="next-btn" onclick="nextReview()">Next →</button>
        `;
    } else {
        reviewStats.wrong++;
        updatePhraseReview(bosnian, false);
        reviewResult.innerHTML = `
            <div class="result-icon">✗</div>
            <div style="font-size: 1.2em; font-weight: 600;">Not quite</div>
            <div class="correct-answer">Correct answer: <strong>${correctAnswer}</strong></div>
            <button class="next-btn" onclick="nextReview()">Next →</button>
        `;
    }
    
    reviewAnswerInput.disabled = true;
    checkAnswerBtn.disabled = true;
}

function nextReview() {
    reviewIndex++;
    reviewAnswerInput.disabled = false;
    checkAnswerBtn.disabled = false;
    showNextReview();
}

function updatePhraseReview(bosnian, correct) {
    const review = phraseReviews[bosnian];
    
    if (correct) {
        review.correctStreak++;
        review.level = Math.min(review.level + 1, SRS_INTERVALS.length - 1);
    } else {
        review.correctStreak = 0;
        review.level = Math.max(0, review.level - 1);
    }
    
    // Calculate next review date
    const daysUntilNext = SRS_INTERVALS[review.level];
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + daysUntilNext);
    review.nextReview = nextDate.toISOString().split('T')[0];
    
    saveProgress();
}

function finishReview() {
    reviewCard.classList.add('hidden');
    reviewComplete.classList.remove('hidden');
    
    correctCountEl.textContent = reviewStats.correct;
    wrongCountEl.textContent = reviewStats.wrong;
}
