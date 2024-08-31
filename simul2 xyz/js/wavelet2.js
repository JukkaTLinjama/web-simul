// js/wavelet2.js

/** 240830 JLA
 /**
 * Generates a 1-dimensional wavelet sequence with random variations in frequency and decay (tau).
 * Applies sin^2 weighting to the wavelet and scales amplitude for visibility.
 * @param {number} length - The length of the wavelet sequence.
 * @param {number} baseFrequency - The base frequency of the wavelet.
 * @param {number} freqVariation - The maximum variation in frequency.
 * @param {number} baseTau - The base decay parameter (tau), normalized by frequency.
 * @param {number} tauVariation - The maximum variation in tau, also normalized by frequency.
 * @param {number} amplitudeScale - Scaling factor for amplitude.
 * @returns {Array} - An array representing the wavelet sequence.
 */
function generate1DWavelet(length = 100, baseFrequency = 1, freqVariation = 0.02, baseTau = 1, tauVariation = 0.1, amplitudeScale = 100) {
    let sequence = new Array(length).fill(0);

    // Generate random frequency
    const frequency = baseFrequency + (Math.random() * 2 - 1) * freqVariation;

    // Normalize baseTau and tauVariation with respect to frequency
    const tau = frequency * (baseTau + (Math.random() * 2 - 1) * tauVariation);

    for (let i = 0; i < length; i++) {
        const time = i / length;
        const sinWeight = Math.sin(Math.PI * time) ** 2;  // sin^2 window

        // Generate wavelet value and apply sin^2 window and scaling
        const value = Math.sin(2 * Math.PI * frequency * time) * Math.exp(-tau * time) * sinWeight * amplitudeScale;

        sequence[i] = value;
    }

    return sequence;
}

