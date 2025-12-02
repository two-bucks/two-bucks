// Global state
let stars = 0;
let wishes = [];

// Text-to-Speech function
function speak(text, callback) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9; // Slightly slower for toddlers
    utterance.pitch = 1.2; // Slightly higher pitch
    utterance.volume = 1;

    if (callback) {
        utterance.onend = callback;
    }

    window.speechSynthesis.speak(utterance);
}

// Play celebration sound (using oscillator)
function playSound(type = 'success') {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (type === 'success') {
        oscillator.frequency.value = 523.25; // C note
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } else if (type === 'star') {
        // Ascending notes for star
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((freq, i) => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.2, audioContext.currentTime + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.1 + 0.3);
            osc.start(audioContext.currentTime + i * 0.1);
            osc.stop(audioContext.currentTime + i * 0.1 + 0.3);
        });
    }
}

// Screen Navigation
function showScreen(screenId) {
    playSound('success');

    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });

    // Show selected screen
    document.getElementById(screenId).classList.add('active');

    // Load data if needed
    if (screenId === 'nice-list') {
        updateStarsDisplay();
    } else if (screenId === 'wish-list') {
        displayWishes();
    }
}

// Nice List - Add Star
function addStar(deed) {
    stars++;
    playSound('star');

    // Update display
    updateStarsDisplay();

    // Positive messages
    const messages = [
        `Wonderful! ${deed} Santa is so proud of you! ⭐`,
        `Amazing! ${deed} You're definitely on the nice list! 🎅`,
        `Fantastic! ${deed} What a kind heart you have! ❤️`,
        `Excellent! ${deed} You're making Christmas magical! ✨`,
        `Terrific! ${deed} Keep up the great work! 🌟`,
        `Beautiful! ${deed} Jesus loves when we're kind to others! 🙏`,
        `Marvelous! ${deed} God smiles when you do good deeds! 😊`
    ];

    const message = messages[Math.floor(Math.random() * messages.length)];
    document.getElementById('nice-message').innerHTML = message;

    // Speak the encouragement
    speak(message.replace(/[⭐🎅❤️✨🌟🙏😊]/g, ''));

    // Save to localStorage
    localStorage.setItem('stars', stars);
}

function updateStarsDisplay() {
    // Load from localStorage
    const saved = localStorage.getItem('stars');
    if (saved) {
        stars = parseInt(saved);
    }

    document.getElementById('star-total').textContent = stars;

    // Display stars
    const container = document.getElementById('stars-container');
    container.innerHTML = '';
    for (let i = 0; i < stars; i++) {
        const star = document.createElement('span');
        star.className = 'star';
        star.textContent = '⭐';
        container.appendChild(star);
    }
}

// Wish List Functions
function addWish(item) {
    playSound('success');

    const wishText = prompt(`What kind of ${item.toLowerCase()} would you like? Tell a grown-up to help you type!`) || item;

    wishes.push(wishText);
    displayWishes();

    // Save to localStorage
    localStorage.setItem('wishes', JSON.stringify(wishes));

    speak(`Added to your wish list: ${wishText}. Santa will see your wish!`);
}

function displayWishes() {
    // Load from localStorage
    const saved = localStorage.getItem('wishes');
    if (saved) {
        wishes = JSON.parse(saved);
    }

    const container = document.getElementById('wishes-container');
    container.innerHTML = '';

    if (wishes.length === 0) {
        container.innerHTML = '<li>No wishes yet! Click the buttons above to add wishes!</li>';
    } else {
        wishes.forEach((wish, index) => {
            const li = document.createElement('li');
            li.textContent = `${index + 1}. ${wish} 🎁`;
            container.appendChild(li);
        });
    }
}

// Talk to Santa - Voice Recognition
let recognition;

function startListening() {
    const button = document.getElementById('voice-button');
    const santaMessage = document.getElementById('santa-message');
    const childSaid = document.getElementById('child-said');

    // Check for browser support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('Sorry! Voice recognition is not supported in this browser. Try Chrome or Edge!');
        // Fallback - just show encouraging message
        showSantaResponse('hello');
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    button.textContent = '🎤 Listening...';
    button.classList.add('listening');
    santaMessage.textContent = 'I\'m listening! Tell me about your day!';

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        childSaid.textContent = `You said: "${transcript}"`;

        button.textContent = '🎤 Talk to Santa';
        button.classList.remove('listening');

        // Generate Santa's response based on what child said
        showSantaResponse(transcript);
    };

    recognition.onerror = (event) => {
        button.textContent = '🎤 Talk to Santa';
        button.classList.remove('listening');
        santaMessage.textContent = 'Oops! I didn\'t hear that. Press the button and try again!';
    };

    recognition.onend = () => {
        button.textContent = '🎤 Talk to Santa';
        button.classList.remove('listening');
    };

    try {
        recognition.start();
    } catch (e) {
        button.textContent = '🎤 Talk to Santa';
        button.classList.remove('listening');
    }
}

function showSantaResponse(transcript) {
    const santaMessage = document.getElementById('santa-message');
    let response = '';

    // Keyword-based responses
    if (transcript.includes('good') || transcript.includes('nice') || transcript.includes('kind')) {
        response = 'Ho Ho Ho! I heard you\'ve been very good! That makes me so happy! Keep being kind and loving!';
    } else if (transcript.includes('toy') || transcript.includes('want') || transcript.includes('wish')) {
        response = 'I love hearing about wishes! Remember, Christmas is also about love, family, and kindness. Keep being good!';
    } else if (transcript.includes('help') || transcript.includes('share')) {
        response = 'Wonderful! Helping and sharing shows such a beautiful heart! Jesus teaches us to love one another, and you\'re doing great!';
    } else if (transcript.includes('thank') || transcript.includes('please')) {
        response = 'Beautiful manners! Saying please and thank you shows respect and kindness. I\'m so proud of you!';
    } else if (transcript.includes('love') || transcript.includes('family')) {
        response = 'Family and love are the greatest gifts of all! Christmas is about celebrating love and togetherness. You understand what matters most!';
    } else if (transcript.includes('sorry') || transcript.includes('mistake')) {
        response = 'Everyone makes mistakes, and it\'s wonderful that you want to do better! God loves us all, and every day is a new chance to be kind!';
    } else if (transcript.includes('pray') || transcript.includes('jesus') || transcript.includes('god')) {
        response = 'What a blessing! Prayer and faith are beautiful gifts. Jesus\' birthday reminds us to share love and joy with everyone!';
    } else {
        // Generic positive responses
        const responses = [
            'Ho Ho Ho! Thank you for talking to me! You brighten my day! Keep being wonderful!',
            'How delightful to hear from you! Remember to be kind, share, and spread Christmas joy!',
            'Merry Christmas! You\'re such a special child! Keep up the good work!',
            'Ho Ho Ho! I love our chats! Remember, being good feels better than any present!',
            'Wonderful! Always remember that Christmas is about love, kindness, and family!'
        ];
        response = responses[Math.floor(Math.random() * responses.length)];
    }

    santaMessage.textContent = response;
    speak(response);
}

// Meet the Elves
function meetElf(name, message) {
    playSound('success');
    const elfMessage = document.getElementById('elf-message');
    elfMessage.innerHTML = `<strong>${name} says:</strong><br>"${message}"`;

    speak(`${name} says: ${message}`);
}

// Elf Tracker
function findElf(location) {
    playSound('success');
    const messages = [
        `Great job looking! Your elf might be hiding near ${location}! They love to watch you do good deeds! 🧝`,
        `Maybe! Your elf loves ${location}! Remember, they're watching to see all your kindness! 🧝`,
        `Good guess! Check ${location} carefully! Your elf is reporting your good deeds to Santa! 🧝`,
        `Your elf could be at ${location}! They're so proud when you're kind and helpful! 🧝`,
        `Nice try! ${location} is a great hiding spot! Keep being good and your elf will be happy! 🧝`
    ];

    const message = messages[Math.floor(Math.random() * messages.length)];
    document.getElementById('elf-location-message').textContent = message;

    speak(message.replace(/🧝/g, ''));
}

// Create falling snow effect
function createSnow() {
    const snowContainer = document.querySelector('.snow-container');

    setInterval(() => {
        const snowflake = document.createElement('div');
        snowflake.innerHTML = '❄️';
        snowflake.style.position = 'fixed';
        snowflake.style.left = Math.random() * 100 + '%';
        snowflake.style.top = '-20px';
        snowflake.style.fontSize = (Math.random() * 20 + 10) + 'px';
        snowflake.style.opacity = Math.random();
        snowflake.style.animation = `fall ${Math.random() * 3 + 2}s linear forwards`;

        snowContainer.appendChild(snowflake);

        // Remove after animation
        setTimeout(() => {
            snowflake.remove();
        }, 5000);
    }, 300);
}

// Add snow animation to CSS dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes fall {
        to {
            transform: translateY(100vh);
        }
    }
`;
document.head.appendChild(style);

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    createSnow();
    updateStarsDisplay();

    // Welcome message
    setTimeout(() => {
        speak('Welcome to Santa\'s Workshop! Ho Ho Ho! Merry Christmas!');
    }, 500);
});
