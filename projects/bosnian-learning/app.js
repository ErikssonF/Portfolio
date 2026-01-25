// State management
let currentScenario = null;
let currentStep = 0;
let learnedPhrases = new Set();
let completedScenarios = new Set();
let showHints = true;

// DOM elements
const scenarioSelection = document.getElementById('scenario-selection');
const conversationView = document.getElementById('conversation-view');
const scenariosGrid = document.getElementById('scenarios-grid');
const chatMessages = document.getElementById('chat-messages');
const optionsContainer = document.getElementById('options-container');
const scenarioTitle = document.getElementById('scenario-title');
const backBtn = document.getElementById('back-btn');
const showHintsCheckbox = document.getElementById('show-hints');

// Stats elements
const phrasesLearnedEl = document.getElementById('phrases-learned');
const scenariosCompletedEl = document.getElementById('scenarios-completed');
const practiceStreakEl = document.getElementById('practice-streak');

// Initialize app
document.addEventListener('DOMContentLoaded', init);

function init() {
    loadProgress();
    renderScenarios();
    setupEventListeners();
    updateStats();
}

function setupEventListeners() {
    backBtn.addEventListener('click', backToScenarios);
    showHintsCheckbox.addEventListener('change', (e) => {
        showHints = e.target.checked;
        updateOptionsDisplay();
    });
}

function loadProgress() {
    const saved = localStorage.getItem('bosnian-progress');
    if (saved) {
        const data = JSON.parse(saved);
        learnedPhrases = new Set(data.phrases || []);
        completedScenarios = new Set(data.completed || []);
    }
}

function saveProgress() {
    const data = {
        phrases: Array.from(learnedPhrases),
        completed: Array.from(completedScenarios),
        lastPractice: new Date().toISOString()
    };
    localStorage.setItem('bosnian-progress', JSON.stringify(data));
    updateStats();
}

function updateStats() {
    phrasesLearnedEl.textContent = learnedPhrases.size;
    scenariosCompletedEl.textContent = completedScenarios.size;
    
    // Calculate streak (simplified - just shows if practiced today)
    const saved = localStorage.getItem('bosnian-progress');
    if (saved) {
        const data = JSON.parse(saved);
        const lastPractice = data.lastPractice ? new Date(data.lastPractice) : null;
        const today = new Date();
        const isToday = lastPractice && 
            lastPractice.toDateString() === today.toDateString();
        practiceStreakEl.textContent = isToday ? '1' : '0';
    }
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
    
    // Add phrase to learned set
    learnedPhrases.add(selectedResponse.bosnian);
    
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
    scenarioSelection.classList.add('active');
    renderScenarios(); // Refresh to show completed status
}
