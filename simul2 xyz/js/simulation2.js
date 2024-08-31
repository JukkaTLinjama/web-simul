// js/simulation.js   v1.5
// xy motion and z mapped to size of target and mass Element
// decay param is STILL not fully properly scaled ...

// Physics parameters
const mass = 1.0; // kg
const naturalFrequency = 0.5; // Hz
const springConstant = (2 * Math.PI * naturalFrequency) ** 2 * mass; // N/m
const criticalDamping = 2 * Math.sqrt(springConstant * mass); // Critical damping
let dampingFactor = 0.3 * criticalDamping; // Default to 30% of critical damping

// Default sequence and settings
let sequenceX = [];
let sequenceY = [];
let sequenceZ = [];  // Z direction readiness
let posX = window.innerWidth / 2;
let posY = window.innerHeight / 2;
let posZ = 1;  // Start with nominal distance
let velocityX = 0;
let velocityY = 0;
let velocityZ = 0;
let frame = 0;
let sequenceLength = 0;
let updateInterval = null;
let lastFrameTime = performance.now();  // For frame rate calculation

// Select DOM elements
const element = document.getElementById('animatedElement');
const targetElement = document.getElementById('targetElement');
const updateRateSlider = document.getElementById('updateRate');
const updateRateValue = document.getElementById('updateRateValue');
const scalingFactorSlider = document.getElementById('scalingFactor');
const scalingFactorValue = document.getElementById('scalingFactorValue');
const progressIndicator = document.getElementById('progress');
const frameRateIndicator = document.getElementById('frameRate');
const generateWaveletButton = document.getElementById('generateWaveletButton');
const stopButton = document.getElementById('stopButton');  // New Stop button
const debugLog = document.getElementById('debugLog');

// Initialize controls and listeners
updateRateSlider.addEventListener('input', () => {
    updateRateValue.textContent = `${updateRateSlider.value} ms`;
    if (updateInterval) {
        clearInterval(updateInterval);
        startAnimation();
    }
});

scalingFactorSlider.addEventListener('input', () => {
    scalingFactorValue.textContent = scalingFactorSlider.value;
});

generateWaveletButton.addEventListener('click', generateWaveletAndStart);
stopButton.addEventListener('click', stopAnimation);  // Add Stop button listener

// Function to generate wavelet sequences for X, Y, and Z and start simulation
function generateWaveletAndStart() {
    const length = 100;
    const numWavelets = parseInt(document.getElementById('numWavelets').value);
    const baseFrequency = parseFloat(document.getElementById('baseFrequency').value) || 1;  // Default 1 Hz
    const freqVariation = parseFloat(document.getElementById('freqVariation').value) || 0.02;  // Default variation
    const baseTau = parseFloat(document.getElementById('baseTau').value) || 0.5;  // Default tau
    const tauVariation = parseFloat(document.getElementById('tauVariation').value) || 0.1;  // Default tau variation

    // Generate separate wavelet sequences for X, Y, and Z directions
    let waveletX = new Array(length + (length / 2) * (numWavelets - 1)).fill(0);
    let waveletY = new Array(length + (length / 2) * (numWavelets - 1)).fill(0);
    let waveletZ = new Array(length + (length / 2) * (numWavelets - 1)).fill(0);  // Z direction readiness

    let overlapOffset = Math.floor(length / 2);  // 50% overlap

    for (let w = 0; w < numWavelets; w++) {
        const xWavelet = generate1DWavelet(length, baseFrequency, freqVariation, baseTau, tauVariation);
        const yWavelet = generate1DWavelet(length, baseFrequency, freqVariation, baseTau, tauVariation);
        const zWavelet = generate1DWavelet(length, baseFrequency, freqVariation, baseTau, tauVariation);  // For future use

        for (let i = 0; i < length; i++) {
            waveletX[w * overlapOffset + i] += xWavelet[i];
            waveletY[w * overlapOffset + i] += yWavelet[i];
            waveletZ[w * overlapOffset + i] += zWavelet[i];  // Z direction readiness
        }
    }

    // Assign the wavelet sequences directly to the sequences
    sequenceX = waveletX;
    sequenceY = waveletY;
    sequenceZ = waveletZ;
    sequenceLength = Math.min(sequenceX.length, sequenceY.length, sequenceZ.length);  // Ensure correct length
    frame = 0; // Reset the animation frame

    initializeStaticView();
    startAnimation();  // Start the animation now that everything is set up

    // Plot the wavelets each time this button is pressed
    plotWavelets(waveletX, waveletY, waveletZ);
}

// Initialize the static view of the simulation
function initializeStaticView() {
    if (sequenceLength === 0) return;

    const scaleFactor = parseFloat(scalingFactorSlider.value);
    const targetX = window.innerWidth / 2 + sequenceX[frame] * scaleFactor;
    const targetY = window.innerHeight / 2 + sequenceY[frame] * scaleFactor;

    // Update the position, size, and opacity of the animated element based on Z value
    element.style.left = `${posX}px`;
    element.style.top = `${posY}px`;

    updateElementAppearance(targetX, targetY, sequenceZ[frame]);
    updateTargetElement(targetX, targetY, sequenceZ[frame]);

    // Update progress indicator
    progressIndicator.textContent = `Time Step: ${frame + 1} / ${sequenceLength}`;
}

// Known range of Z from wavelets
const zMin = -100;
const zMax = 100;

// Function to update the size, position, and opacity of the element based on Z value
function updateElementAppearance(x, y, z) {
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;

    // Map Z to different ranges for the element, target, and opacity
    const elementScale = mapRange(z, zMin, zMax, 0.7, 1.3);  // Animated element scaling
    const elementOpacity = mapRange(z, zMin, zMax, 0.2, 1);  // Opacity mapping

    // Apply the mapped scale to element's size and opacity
    element.style.transform = `translate(-50%, -50%) scale(${elementScale})`;
    element.style.opacity = `${elementOpacity}`;
}

// Function to update the size and position of the target element based on Z value
function updateTargetElement(x, y, z) {
    targetElement.style.left = `${x}px`;
    targetElement.style.top = `${y}px`;

    // Use the mapped Z for scaling the target element
    const targetScale = mapRange(z, zMin, zMax, 0.5, 1.5);  // Target element scaling

    targetElement.style.transform = `translate(-50%, -50%) scale(${targetScale})`;
}

// Start animation function
function startAnimation() {
    if (sequenceLength === 0) return;  // Ensure there is a sequence loaded
    clearInterval(updateInterval); // Clear any existing interval
    updateInterval = setInterval(animate, updateRateSlider.value);
    lastFrameTime = performance.now();  // Reset frame time for frame rate calculation
}

// Stop animation function
function stopAnimation() {
    if (updateInterval) {
        clearInterval(updateInterval); // Clear the animation interval
        updateInterval = null;
    }
}

// Function to update the element's position for each frame
function updateElementPosition(targetX, targetY) {
    const forceX = -springConstant * (posX - targetX);
    const forceY = -springConstant * (posY - targetY);
    const dampingX = -dampingFactor * velocityX;
    const dampingY = -dampingFactor * velocityY;
    const netForceX = forceX + dampingX;
    const netForceY = forceY + dampingY;
    const accelerationX = netForceX / mass;
    const accelerationY = netForceY / mass;

    // For Z direction logic
    const targetZ = sequenceZ[frame];  // Get the normalized Z value for scaling
    const forceZ = -springConstant * (posZ - targetZ);
    const dampingZ = -dampingFactor * velocityZ;
    const netForceZ = forceZ + dampingZ;
    const accelerationZ = netForceZ / mass;

    velocityX += accelerationX * (updateRateSlider.value / 1000);
    velocityY += accelerationY * (updateRateSlider.value / 1000);
    velocityZ += accelerationZ * (updateRateSlider.value / 1000);  // Z-direction calculation
    posX += velocityX * (updateRateSlider.value / 1000);
    posY += velocityY * (updateRateSlider.value / 1000);
    posZ += velocityZ * (updateRateSlider.value / 1000);  // Z-direction calculation

    // Debugging information
    console.log(`Frame: ${frame}, posX: ${posX.toFixed(2)}, posY: ${posY.toFixed(2)}, velocityX: ${velocityX.toFixed(2)}, velocityY: ${velocityY.toFixed(2)}, posZ: ${posZ.toFixed(2)}`);
    debugLog.innerHTML = `
        Frame: ${frame}<br>
        posX: ${posX.toFixed(2)}, posY: ${posY.toFixed(2)}, posZ: ${posZ.toFixed(2)}<br>
        velocityX: ${velocityX.toFixed(2)}, velocityY: ${velocityY.toFixed(2)}, velocityZ: ${velocityZ.toFixed(2)}<br>
        accelerationX: ${accelerationX.toFixed(2)}, accelerationY: ${accelerationY.toFixed(2)}, accelerationZ: ${accelerationZ.toFixed(2)}
    `;

    // Ensure the element stays within the viewport bounds
    posX = Math.max(0, Math.min(window.innerWidth - 50, posX));
    posY = Math.max(0, Math.min(window.innerHeight - 50, posY));

    // Update positions on the page
    updateElementAppearance(posX, posY, posZ);
    updateTargetElement(targetX, targetY, targetZ);  // Update the target size
}

// Function to animate the sequence
function animate() {
    if (frame < sequenceLength) {
        const scaleFactor = parseFloat(scalingFactorSlider.value);
        const targetX = window.innerWidth / 2 + sequenceX[frame] * scaleFactor;
        const targetY = window.innerHeight / 2 + sequenceY[frame] * scaleFactor;

        updateElementPosition(targetX, targetY);
        progressIndicator.textContent = `Time Step: ${frame + 1} / ${sequenceLength}`;

        // Calculate and display frame rate
        const currentTime = performance.now();
        const frameDuration = currentTime - lastFrameTime;
        lastFrameTime = currentTime;
        const fps = Math.round(1000 / frameDuration);
        frameRateIndicator.textContent = `Frame Rate: ${fps} FPS`;

        frame++;
    } else {
        frame = 0;  // Loop the sequence
    }
}

// Function to plot wavelets using Chart.js
function plotWavelets(waveletX, waveletY, waveletZ) {
    const ctx = document.getElementById('waveletChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({length: waveletX.length}, (_, i) => i),  // X-axis labels (time steps)
            datasets: [
                {
                    label: 'Wavelet X',
                    data: waveletX,
                    borderColor: 'blue',
                    fill: false,
                },
                {
                    label: 'Wavelet Y',
                    data: waveletY,
                    borderColor: 'red',
                    fill: false,
                },
                {
                    label: 'Wavelet Z',
                    data: waveletZ,
                    borderColor: 'green',
                    fill: false,
                }
            ]
        },
        options: {
            responsive: true,
            title: {
                display: true,
                text: 'Wavelets X, Y, and Z Over Time'
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: 'Time Step'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Amplitude'
                    }
                }
            }
        }
    });
}

// Utility function to map a value from one range to another
function mapRange(value, inMin, inMax, outMin, outMax) {
    return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}
