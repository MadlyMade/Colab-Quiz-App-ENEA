class QuizApp {
    constructor() {
        this.NUM_QUESTIONS_PER_TEST = 40;
        this.QUIZ_TIME_MINUTES = 60;
        this.questionBank = [];
        this.DOM = {
            viewContainer: document.getElementById('view-container'),
            pauseButton: document.getElementById('pause-button'),
            pauseOverlay: document.getElementById('pause-overlay')
        };
        this.state = {};
        this.init();
    }

    async init() {
        try {
            const response = await fetch('/api/questions');
            this.questionBank = await response.json();
            this.initState();
            this.renderView();
        } catch (error) {
            this.DOM.viewContainer.innerHTML = '<h1>Errore nel caricamento delle domande. Riprova.</h1>';
        }
    }

    initState() {
        this.state = {
            currentUser: localStorage.getItem('quizUser_CTER2024') || null,
            currentView: localStorage.getItem('quizUser_CTER2024') ? 'mainMenu' : 'login',
            quizHistory: [],
            currentQuizQuestions: [], currentQuestionIndex: 0,
            userAnswers: [], questionStatus: [],
            timerInterval: null, isPaused: false,
            timeRemaining: this.QUIZ_TIME_MINUTES * 60
        };
        this.loadHistory();
    }

    loadHistory() {
        if (!this.state.currentUser) return;
        try {
            const history = JSON.parse(localStorage.getItem(`quizHistory_${this.state.currentUser}`));
            this.state.quizHistory = Array.isArray(history) ? history : [];
        } catch (e) {
            this.state.quizHistory = [];
        }
    }

    saveHistory() {
        if (!this.state.currentUser) return;
        try {
            localStorage.setItem(`quizHistory_${this.state.currentUser}`, JSON.stringify(this.state.quizHistory));
        } catch (e) {
            console.error("Could not save history:", e);
        }
    }
    
    // --- USER MANAGEMENT ---
    login() {
        const username = document.getElementById('username').value.trim();
        if (username) {
            this.state.currentUser = username;
            localStorage.setItem('quizUser_CTER2024', username);
            this.state.currentView = 'mainMenu';
            this.loadHistory();
            this.renderView();
        }
    }
    
    logout() {
        localStorage.removeItem('quizUser_CTER2024');
        this.initState();
        this.renderView();
    }

    // --- VIEW RENDERING ---
    renderView() {
        this.DOM.pauseButton.style.display = 'none';
        let html = '';
        switch (this.state.currentView) {
            case 'login':
                html = this.getLoginView();
                break;
            case 'mainMenu':
                html = this.getMainMenuView();
                break;
            case 'quiz':
                html = this.getQuizView();
                this.DOM.pauseButton.style.display = 'block';
                // Defer rendering of question to avoid element not found errors
                setTimeout(() => {
                    this.renderQuestion();
                    this.renderQuestionMap();
                }, 0);
                break;
            case 'results':
                html = this.getResultsView();
                break;
            case 'history':
                html = this.getHistoryView();
                break;
            case 'review':
                html = this.getReviewView();
                break;
        }
        this.DOM.viewContainer.innerHTML = `<div class="main-content active fade-in">${html}</div>`;
    }
    
    getLoginView() {
        return `<div style="text-align: center;">
                    <h2>Benvenuto/a!</h2>
                    <p>Inserisci il tuo nome per iniziare e salvare i tuoi progressi.</p>
                    <input type="text" id="username" class="input-field" placeholder="Il tuo nome...">
                    <button class="btn" onclick="app.login()">Entra</button>
                </div>`;
    }
    
    getMainMenuView() {
        return `<div style="text-align: center;">
                    <h2>Ciao, ${this.state.currentUser}!</h2>
                    <p style="margin: 15px 0;">Simulazione realistica con 40 domande a risposta multipla.</p>
                    <button class="btn" onclick="app.startQuiz()">📝 Inizia Nuovo Test</button>
                    <button class="btn btn-secondary" onclick="app.changeView('history')">📊 Storico Test</button>
                    <button class="btn btn-danger" style="margin-top:20px;" onclick="app.logout()">Esci</button>
                </div>`;
    }

    getQuizView() {
        return `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;"><h3 id="question-counter"></h3><h3 id="timer"></h3></div>
                <div id="question-map" class="question-map"></div>
                <div id="question-card-container"></div>
                <div class="navigation"><button class="btn" onclick="app.previousQuestion()" id="prev-btn">← Precedente</button><button class="btn" onclick="app.nextQuestion()" id="next-btn">Successiva →</button></div>
                <div style="text-align:center; margin-top:20px;"><button class="btn btn-secondary" onclick="app.submitQuiz()">🏁 Termina e Valuta Test</button></div>`;
    }

    getResultsView() {
        const result = this.state.lastResult;
        return `<h2 style="text-align:center; margin-bottom: 20px;">🎉 Test Completato!</h2>
            <div class="score-circle" style="background: ${result.percentage >= 60 ? 'var(--secondary-color)' : 'var(--danger-color)'}">${result.percentage}%</div>
            <div class="results-stats"><div class="stat-card"><div class="stat-number" style="color:var(--secondary-color)">${result.score}</div><div class="stat-label">Corrette</div></div>
            <div class="stat-card"><div class="stat-number" style="color:var(--danger-color)">${this.NUM_QUESTIONS_PER_TEST - result.score - result.unanswered}</div><div class="stat-label">Errate</div></div>
            <div class="stat-card"><div class="stat-number" style="color:var(--medium-text)">${result.unanswered}</div><div class="stat-label">Non Risposte</div></div></div>
            <div style="text-align:center; margin-top: 30px;"><button class="btn" onclick="app.startQuiz()">🔄 Nuovo Test</button><button class="btn btn-secondary" onclick="app.changeView('mainMenu')">🏠 Menu Principale</button></div>`;
    }

    getHistoryView() {
        let historyHTML = this.state.quizHistory.length === 0 ? '<p>Nessun test salvato nello storico.</p>'
            : this.state.quizHistory.map(res => `<div class="history-item" onclick="app.reviewHistoryTest(${res.id})">
                <div><div class="history-date">${res.date}</div><div class="history-score">Punteggio: ${res.score}/${this.NUM_QUESTIONS_PER_TEST} (${res.percentage}%)</div></div>
                <div>→</div></div>`).join('');
        
        return `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;"><h2>📊 Storico Test di ${this.state.currentUser}</h2><button class="btn" onclick="app.changeView('mainMenu')">🏠 Menu</button></div>
                <div id="history-list">${historyHTML}</div>`;
    }
    
    getReviewView() {
        const testData = this.state.reviewingTest;
        let reviewHTML = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;"><h2>Revisione Test del ${testData.date}</h2><button class="btn" onclick="app.changeView('history')">Torna allo Storico</button></div>`;
        reviewHTML += testData.questions.map((q, i) => {
            const userAnswerIndex = testData.userAnswers[i];
            let optionsHTML = q.options.map((opt, optIndex) => {
                let optClass = 'option review-option answered';
                if(optIndex === q.correct) optClass += ' correct';
                if(optIndex === userAnswerIndex) optClass += ' user-choice';
                if(userAnswerIndex !== null && optIndex === userAnswerIndex && optIndex !== q.correct) optClass += ' incorrect';
                return `<div class="${optClass}">${opt}</div>`;
            }).join('');
            return `<div class="review-card"><p class="question-text">${i+1}. ${q.question}</p><div class="options">${optionsHTML}</div><div class="explanation" style="display:block"><strong>Spiegazione:</strong> ${q.explanation}</div></div>`;
        }).join('');
        return reviewHTML;
    }

    changeView(view) {
        this.state.currentView = view;
        this.renderView();
    }
    
    // --- QUIZ LOGIC ---
    startQuiz() {
        this.initState();
        this.state.currentQuizQuestions = this.shuffleArray([...this.questionBank]).slice(0, this.NUM_QUESTIONS_PER_TEST);
        this.state.userAnswers = new Array(this.NUM_QUESTIONS_PER_TEST).fill(null);
        this.state.questionStatus = new Array(this.NUM_QUESTIONS_PER_TEST).fill('untouched');
        this.changeView('quiz');
        this.startTimer();
    }

    renderQuestion() {
        // ... (this logic is now inside getQuizView's setTimeout)
    }

    selectOption(optionIndex) {
        if (this.state.userAnswers[this.state.currentQuestionIndex] !== null) return;
        const question = this.state.currentQuizQuestions[this.state.currentQuestionIndex];
        this.state.userAnswers[this.state.currentQuestionIndex] = optionIndex;
        this.state.questionStatus[this.state.currentQuestionIndex] = optionIndex === question.correct ? 'correct' : 'incorrect';
        
        // Update view with feedback
        const questionCard = document.querySelector('.question-card');
        const options = questionCard.querySelectorAll('.option');
        options.forEach((opt, index) => {
            opt.classList.add('answered');
            if(index === question.correct) opt.classList.add('correct');
            else if(index === optionIndex) opt.classList.add('incorrect');
        });
        questionCard.querySelector('.explanation').style.display = 'block';
        this.updateQuestionMap();
    }

    renderQuestionMap() {
        document.getElementById('question-map').innerHTML = this.state.questionStatus.map((status, index) => `<div class="q-map-box ${status}" onclick="app.jumpToQuestion(${index})">${index + 1}</div>`).join('');
        this.updateQuestionMap();
    }
    
    updateQuestionMap() {
        const boxes = document.getElementById('question-map').children;
        for (let i = 0; i < boxes.length; i++) {
            boxes[i].className = `q-map-box ${this.state.questionStatus[i]}`;
            if (i === this.state.currentQuestionIndex) {
                boxes[i].classList.add('current');
                if (this.state.questionStatus[i] === 'untouched') {
                    this.state.questionStatus[i] = 'skipped';
                    boxes[i].classList.add('skipped');
                }
            }
        }
    }

    jumpToQuestion(index) {
        this.state.currentQuestionIndex = index;
        this.renderQuestion();
    }
    
    previousQuestion() { if(this.state.currentQuestionIndex > 0) this.jumpToQuestion(this.state.currentQuestionIndex - 1); }
    nextQuestion() { if(this.state.currentQuestionIndex < this.NUM_QUESTIONS_PER_TEST - 1) this.jumpToQuestion(this.state.currentQuestionIndex + 1); }
    
    startTimer() {
        clearInterval(this.state.timerInterval);
        const timerEl = document.getElementById('timer');
        this.state.timerInterval = setInterval(() => {
            if (!this.state.isPaused) {
                this.state.timeRemaining--;
                const minutes = Math.floor(this.state.timeRemaining / 60);
                let seconds = this.state.timeRemaining % 60;
                seconds = seconds < 10 ? '0' + seconds : seconds;
                if(timerEl) timerEl.textContent = `⏰ ${minutes}:${seconds}`;
                if (this.state.timeRemaining <= 0) { clearInterval(this.state.timerInterval); alert("Tempo scaduto!"); this.submitQuiz(); }
            }
        }, 1000);
    }

    togglePause() { this.state.isPaused = !this.state.isPaused; this.DOM.pauseOverlay.style.display = this.state.isPaused ? 'flex' : 'none'; }
    
    submitQuiz() {
        clearInterval(this.state.timerInterval);
        this.DOM.pauseButton.style.display = 'none';
        let score = this.state.questionStatus.filter(s => s === 'correct').length;
        const unanswered = this.state.questionStatus.filter(s => s === 'untouched' || s === 'skipped').length;
        const percentage = Math.round((score / this.NUM_QUESTIONS_PER_TEST) * 100);
        const result = { id: Date.now(), score, unanswered, percentage, date: new Date().toLocaleString('it-IT'), questions: this.state.currentQuizQuestions, userAnswers: this.state.userAnswers };
        
        this.state.lastResult = result;
        this.state.quizHistory.unshift(result);
        if (this.state.quizHistory.length > 5) this.state.quizHistory.pop();
        this.saveHistory();
        
        this.changeView('results');
    }

    reviewHistoryTest(testId) {
        const testData = this.state.quizHistory.find(test => test.id === testId);
        if(!testData) return;
        this.state.reviewingTest = testData;
        this.changeView('review');
    }
    
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; }
        return array;
    }
}

// Start the application
const app = new QuizApp();