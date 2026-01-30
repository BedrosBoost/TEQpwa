// --- STATE VARIABLES ---
let fullDeck = [];
let drawPile = [];
let discardPile = []; 
let historyPile = []; 
let currentHand = []; 

let gameState = 'MENU'; // MENU, SELECTION, ACTIVE, REVIEW
let overlayVisible = false;
let historyIndex = 0; 
let scrollTimer = null; 

// --- START ---
async function startGame() {
    handSize = parseInt(document.getElementById('hand-size-select').value);

    // 1. GET CATEGORY SELECTIONS
    const useSeries1 = document.getElementById('cat-series1').checked;
    const useSeries2 = document.getElementById('cat-series2').checked;
    
    // Validation: Prevent starting if nothing is checked
    if (!useSeries1 && !useSeries2) {
        alert("Please select at least one category!");
        return;
    }
    
    // --- RESTORED FETCH LOGIC ---
    try {
        const response = await fetch('cards.json');
        if (!response.ok) throw new Error("File not found");
        fullDeck = await response.json();
    } catch (error) {
        alert("Error loading cards.json! If you are running locally, make sure to use 'python -m http.server'");
        console.error(error);
        return;
    }
    // ---------------------------

    // 2. FILTER THE DECK
    // We only keep cards where the category matches our checks
    const filteredDeck = fullDeck.filter(card => {
        if (useSeries1 && card.category === "Series 1") return true;
        if (useSeries2 && card.category === "Series 2") return true;
        return false;
    });

    if (filteredDeck.length === 0) {
        alert("No cards found for these categories!");
        return;
    }

    // 3. SETUP PILES
    drawPile = [...filteredDeck];
    shuffle(drawPile);
    discardPile = [];
    historyPile = [];
    
    document.getElementById('start-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
    
    dealNewRound();
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// --- GAME LOGIC ---

function dealNewRound() {
    if (drawPile.length === 0) {
        handleOutOfCards();
        return;
    }

    document.getElementById('carousel-track').classList.remove('force-center');

    currentHand = [];
    let cardsToDraw = Math.min(handSize, drawPile.length);
    
    for(let i=0; i<cardsToDraw; i++) {
        currentHand.push(drawPile.pop());
    }

    gameState = 'SELECTION';
    renderCarousel(currentHand);
    resetOverlays();
    toggleOverlays();
    
    // Highlight the first card immediately
    setTimeout(applyActiveVisuals, 100);
}

function renderCarousel(cards) {
    const track = document.getElementById('carousel-track');
    track.innerHTML = ''; 

    cards.forEach((data, index) => {
        const cardHTML = `
            <div class="card" id="card-${index}">
                <div class="category-label">${data.category}</div>
                
                <div class="content-box statement-box arrow-box">
                    <p>${data.statement}</p>
                </div>
                <div class="content-box question-box">
                    <p>${data.question}</p>
                </div>

                <div class="footer-section">
                    
                    <div class="footer-note">From</div> 

                    <div class="footer-graphics">
                        
                        <div class="footer-group">
                            <div class="diamond-shape diamond-left" data-num="1"></div>
                            <div class="arrow-label left-arrow">
                                <span>${data.bottom_left}</span>
                            </div>
                        </div>

                        <div class="footer-group">
                            <div class="diamond-shape diamond-right" data-num="10"></div>
                            <div class="arrow-label right-arrow">
                                <span>${data.bottom_right}</span>
                            </div>
                        </div>

                    </div>

                    <div class="gradient-bar"></div>
                </div>
            </div>
        `;
        track.insertAdjacentHTML('beforeend', cardHTML);
    });

    track.scrollLeft = 0;
}

// --- INTERACTION ---

function handleScreenTap(event) {
    if (event.target.tagName === 'BUTTON') return;
    toggleOverlays();
}

function toggleOverlays() {
    overlayVisible = !overlayVisible;
    const top = document.getElementById('top-overlay');
    const bot = document.getElementById('bottom-overlay');
    
    if (overlayVisible) {
        top.classList.add('visible');
        bot.classList.add('visible');
    } else {
        top.classList.remove('visible');
        bot.classList.remove('visible');
    }
}

function resetOverlays() {
    overlayVisible = false;
    document.getElementById('top-overlay').classList.remove('visible');
    document.getElementById('bottom-overlay').classList.remove('visible');
    
    const pickBtn = document.getElementById('btn-pick');
    const nextBtn = document.getElementById('btn-next');
    const status = document.getElementById('nav-status');

    if (gameState === 'SELECTION') {
        pickBtn.classList.remove('hidden');
        nextBtn.classList.add('hidden');
        status.innerText = "CHOOSE A CARD";
    } else if (gameState === 'ACTIVE') {
        pickBtn.classList.add('hidden');
        nextBtn.classList.remove('hidden');
        status.innerText = "ACTIVE CARD";
    } else if (gameState === 'REVIEW') {
        pickBtn.classList.add('hidden');
        nextBtn.classList.add('hidden'); 
        status.innerText = `HISTORY ${historyIndex + 1}/${historyPile.length}`;
    }
}

// --- MATH & VISUALS ---

function getActiveCardIndex() {
    const track = document.getElementById('carousel-track');
    const cards = track.children;
    if (cards.length === 0) return 0;

    let center = track.scrollLeft + (track.offsetWidth / 2);
    let closestIndex = 0;
    let minDiff = 99999;

    for (let i = 0; i < cards.length; i++) {
        let card = cards[i];
        let cardCenter = card.offsetLeft + (card.offsetWidth / 2);
        let diff = Math.abs(center - cardCenter);
        if(diff < minDiff) {
            minDiff = diff;
            closestIndex = i;
        }
    }
    return closestIndex;
}

function applyActiveVisuals() {
    if (gameState !== 'SELECTION') return;

    const index = getActiveCardIndex();
    const track = document.getElementById('carousel-track');
    const cards = track.children;

    for (let i = 0; i < cards.length; i++) {
        cards[i].classList.remove('active-snap');
    }
    
    if (cards[index]) {
        cards[index].classList.add('active-snap');
    }
}

function detectActiveCard() {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
        applyActiveVisuals();
    }, 10);
}

function pickCurrentCard() {
    let index = getActiveCardIndex(); 
    let picked = currentHand[index];
    
    historyPile.push(picked);
    currentHand.forEach((c, i) => { if(i !== index) discardPile.push(c); });
    
    gameState = 'ACTIVE';
    renderCarousel([picked]); 

    document.getElementById('carousel-track').classList.add('force-center');
    
    resetOverlays();
    
}

function finishRound() {
    if (drawPile.length === 0) {
        handleOutOfCards();
    } else {
        dealNewRound();
    }
}

// --- HISTORY NAV ---
function navHistory(direction) {
    if (historyPile.length === 0) return;

    if (gameState === 'ACTIVE') {
        historyIndex = historyPile.length - 1;
    }

    let newIndex = (gameState === 'ACTIVE') ? historyIndex + direction : historyIndex + direction;
    
    if (gameState === 'REVIEW' && newIndex >= historyPile.length) {
        gameState = 'ACTIVE';
        renderCarousel([historyPile[historyPile.length - 1]]);
        document.getElementById('carousel-track').classList.add('force-center');
        resetOverlays();
        return;
    }

    if (newIndex < 0) return;

    gameState = 'REVIEW';
    historyIndex = newIndex;
    renderCarousel([historyPile[historyIndex]]);

    document.getElementById('carousel-track').classList.add('force-center');
    
    resetOverlays();
    
    if (!overlayVisible) toggleOverlays();
}

// --- OUT OF CARDS ---
function handleOutOfCards() {
    const modal = document.getElementById('modal-overlay');
    const msg = document.getElementById('modal-msg');
    
    modal.classList.remove('modal-hidden'); 
    
    if (discardPile.length > 0) {
        msg.innerText = `Draw pile empty! (${discardPile.length} rejects available)`;
        document.getElementById('btn-shuffle').style.display = 'inline-block';
    } else {
        msg.innerText = "Game Over! All cards used.";
        document.getElementById('btn-shuffle').style.display = 'none';
    }
}

function shuffleRejects() {
    drawPile = [...discardPile];
    discardPile = [];
    shuffle(drawPile);
    document.getElementById('modal-overlay').classList.add('modal-hidden');
    dealNewRound();
}