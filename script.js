// --- DOM Element References ---
const timerDisplay = document.getElementById('timer-display');
const statusDisplay = document.getElementById('status-display');
const startPauseBtn = document.getElementById('start-pause-btn');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
const resetBtn = document.getElementById('reset-btn');

// Input fields
const workDurationInput = document.getElementById('work-duration');
const restDurationInput = document.getElementById('rest-duration');
const exercisesInput = document.getElementById('exercises');
const roundsInput = document.getElementById('rounds');
const roundResetDurationInput = document.getElementById('round-reset-duration');

// Audio elements
const countdownSound = document.getElementById('countdown-sound');
const nextSound = document.getElementById('next-sound');

// --- Timer State Variables ---
let timer; // Will hold the setInterval instance
let isRunning = false;
let workoutQueue = []; // An array to hold the sequence of intervals
let currentIntervalIndex = 0;
let timeLeftInInterval = 0;
let wakeLock = null; // For keeping the screen awake

// --- Core Timer Logic ---

/**
 * Updates the timer display (MM:SS format).
 * @param {number} seconds - The time in seconds to display.
 */
function updateDisplay(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * The main function called every second by setInterval.
 */
function tick() {
    timeLeftInInterval--;
    updateDisplay(timeLeftInInterval);

    // Play countdown sound for the last 3 seconds
    if (timeLeftInInterval <= 3 && timeLeftInInterval > 0) {
        countdownSound.play();
    }

    // When an interval ends
    if (timeLeftInInterval < 0) {
        currentIntervalIndex++;
        if (currentIntervalIndex >= workoutQueue.length) {
            // Workout finished
            resetTimer();
            statusDisplay.textContent = "Workout Complete!";
            document.body.style.backgroundColor = 'var(--bg-color)';
            return;
        }
        // Start the next interval
        startNextInterval();
    }
}

/**
 * Starts the next interval in the workout queue.
 */
function startNextInterval() {
    const nextInterval = workoutQueue[currentIntervalIndex];
    
    timeLeftInInterval = nextInterval.duration;
    statusDisplay.textContent = nextInterval.name;
    updateDisplay(timeLeftInInterval);

    // Change background color based on interval type
    document.body.style.backgroundColor = `var(--${nextInterval.type}-color)`;
    
    // Play sound to signal start of a new interval (except for the very first one)
    if (currentIntervalIndex > 0) {
        nextSound.play();
    }
}

/**
 * Starts the entire workout timer.
 */
function startTimer() {
    if (isRunning) return; // Prevent multiple timers
    
    // Build the list of intervals before starting
    buildWorkoutQueue();
    if (workoutQueue.length === 0) return;

    isRunning = true;
    currentIntervalIndex = -1; // Start before the first interval
    tick(); // Run once immediately to set up the first interval
    timer = setInterval(tick, 1000); // Then run every second
    
    togglePlayPauseIcon(true);
    requestWakeLock(); // Request to keep the screen awake
}

/**
 * Pauses the timer.
 */
function pauseTimer() {
    clearInterval(timer);
    isRunning = false;
    togglePlayPauseIcon(false);
    releaseWakeLock(); // Release the screen lock
}

/**
 * Resets the timer to its initial state.
 */
function resetTimer() {
    clearInterval(timer);
    isRunning = false;
    workoutQueue = [];
    currentIntervalIndex = 0;
    updateTotalTime(); // Update display based on input values
    statusDisplay.textContent = 'Get Ready';
    document.body.style.backgroundColor = 'var(--bg-color)';
    togglePlayPauseIcon(false);
    releaseWakeLock();
}

// --- Helper Functions ---

/**
 * Toggles the visibility of play and pause icons.
 * @param {boolean} isPlaying - True if the timer is playing.
 */
function togglePlayPauseIcon(isPlaying) {
    playIcon.style.display = isPlaying ? 'none' : 'block';
    pauseIcon.style.display = isPlaying ? 'block' : 'none';
}

/**
 * Builds the sequence of intervals based on user inputs.
 */
function buildWorkoutQueue() {
    workoutQueue = [];
    const workDuration = parseInt(workDurationInput.value, 10);
    const restDuration = parseInt(restDurationInput.value, 10);
    const numExercises = parseInt(exercisesInput.value, 10);
    const numRounds = parseInt(roundsInput.value, 10);
    const roundResetDuration = parseInt(roundResetDurationInput.value, 10);

    // 1. Initial "Get Ready" countdown
    workoutQueue.push({ name: 'Get Ready', duration: 5, type: 'ready' });

    // 2. Loop through each round
    for (let i = 0; i < numRounds; i++) {
        // 3. Loop through exercises in a round
        for (let j = 0; j < numExercises; j++) {
            workoutQueue.push({ name: 'Work', duration: workDuration, type: 'work' });
            // Add a rest period after each exercise except the last one in the round
            if (j < numExercises - 1) {
                workoutQueue.push({ name: 'Rest', duration: restDuration, type: 'rest' });
            }
        }
        // 4. Add a Round Reset period after each round except the very last one
        if (i < numRounds - 1) {
            workoutQueue.push({ name: 'Round Reset', duration: roundResetDuration, type: 'reset' });
        }
    }
}

/**
 * Calculates and displays the total workout time based on current settings.
 */
function updateTotalTime() {
    buildWorkoutQueue();
    const totalSeconds = workoutQueue.reduce((acc, interval) => acc + interval.duration, 0);
    updateDisplay(totalSeconds);
}

// --- Screen Wake Lock API ---

/**
 * Requests a screen wake lock.
 */
async function requestWakeLock() {
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Screen Wake Lock is active.');
        } catch (err) {
            console.error(`${err.name}, ${err.message}`);
        }
    }
}

/**
 * Releases the screen wake lock.
 */
function releaseWakeLock() {
    if (wakeLock !== null) {
        wakeLock.release().then(() => {
            wakeLock = null;
            console.log('Screen Wake Lock released.');
        });
    }
}

// --- Event Listeners ---
startPauseBtn.addEventListener('click', () => {
    if (isRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
});

resetBtn.addEventListener('click', resetTimer);

// Update total time whenever a setting is changed
document.querySelectorAll('.settings input').forEach(input => {
    input.addEventListener('change', updateTotalTime);
});

// Initialize the display on page load
window.addEventListener('load', updateTotalTime);