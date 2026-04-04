// MobileNet Client-Side Task Verification
// Uses TensorFlow.js to perform local inference on uploaded images to detect animals.

let mobilenetModel = null;

// Animal keywords array as requested
const ACCEPTED_ANIMAL_KEYWORDS = [
    'cat', 'dog', 'bird', 'animal', 'kitten', 'puppy', 'feline', 'canine',
    'tabby', 'stray', 'pet', 'mammal', 'pup', 'kitty', 'hound', 'retriever',
    'terrier', 'spaniel', 'shepherd', 'bulldog', 'poodle', 'beagle', 'rabbit',
    'hamster', 'parrot', 'pigeon', 'crow', 'sparrow', 'goat', 'cattle', 'calf',
    'cow', 'bull', 'buffalo', 'ox', 'goat', 'sheep', 'pig', 'horse', 'pony',
    'donkey', 'mule', 'camel', 'chicken', 'hen', 'rooster', 'duck', 'goose'
];

async function loadMobileNet() {
    if (mobilenetModel) return mobilenetModel;
    try {
        console.log("Loading MobileNet model...");
        // Check if mobilenet is available globally
        if (typeof mobilenet === 'undefined') {
            throw new Error("MobileNet library not loaded. Check script tags.");
        }
        mobilenetModel = await mobilenet.load();
        console.log("MobileNet loaded successfully!");
        return mobilenetModel;
    } catch (err) {
        console.error("Failed to load MobileNet:", err);
        throw err;
    }
}

// Preload on script load
loadMobileNet().catch(console.error);

/**
 * Validates an image file locally using MobileNet
 * @param {File} file - The selected image file
 * @param {HTMLImageElement} imgElement - Hidden or visible image element to run prediction on
 * @returns {Promise<boolean>} TRUE if animal detected, FALSE otherwise
 */
async function validateProofImage(file, imgElement) {
    return new Promise(async (resolve, reject) => {
        try {
            const model = await loadMobileNet();

            // Load file into the image element
            const reader = new FileReader();
            reader.onload = async (e) => {
                imgElement.src = e.target.result;
                // Wait for image to load to get dimensions
                imgElement.onload = async () => {
                    try {
                        const predictions = await model.classify(imgElement);
                        console.log("MobileNet Predictions (Task Proof):", predictions);

                        // Check top 3 predictions
                        let animalDetected = false;
                        for (let i = 0; i < Math.min(3, predictions.length); i++) {
                            const className = predictions[i].className.toLowerCase();
                            const prob = predictions[i].probability;
                            
                            // Check if any accepted keyword is in the class name
                            // Lower probability threshold to 0.03 for broad detection (same as imageVerifier)
                            if (prob > 0.03 && ACCEPTED_ANIMAL_KEYWORDS.some(keyword => className.includes(keyword))) {
                                animalDetected = true;
                                break;
                            }
                        }
                        resolve(animalDetected);
                    } catch (err) {
                        console.error("Prediction error:", err);
                        reject(err);
                    }
                };
            };
            reader.readAsDataURL(file);
        } catch (err) {
            reject(err);
        }
    });
}

// Make globally available
window.validateProofImage = validateProofImage;
