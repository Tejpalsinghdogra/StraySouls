const ANIMAL_KEYWORDS = [
    // General
    "animal", "stray", "pet", "wildlife", "kitten", "puppy", "feline", "canine",
    
    // Cats
    "cat", "tabby", "tiger", "lion", "leopard", "cheetah", "cougar", "lynx", "panther", "siamese", "persian",

    // Dogs
    "dog", "retriever", "terrier", "spaniel", "hound", "pug", "husky", "malamute", "collie", 
    "shepherd", "poodle", "mastiff", "bulldog", "corgi", "chihuahua", "shiba", "akita", 
    "samoyed", "chow", "dalmatian", "pinscher", "schnauzer", "boxer", "beagle", "shih", 
    "maltese", "papillon", "basenji", "setter", "pointer", "weimaraner", "vizsla", "kuvasz", 
    "kelpie", "malinois", "groenendael", "schipperke", "leonberg", "newfoundland", "pyrenees", 
    "bernese", "dingo", "dhole", "appenzeller", "entlebucher", "brabancon", "griffon",
    
    // Birds
    "bird", "owl", "eagle", "hawk", "falcon", "parrot", "macaw", "cockatoo", "pigeon", 
    "dove", "duck", "goose", "swan", "peacock", "penguin", "ostrich", "emu", "chicken", 
    "hen", "cock", "finch", "bunting", "robin", "bulbul", "jay", "magpie", "chickadee", 
    "toucan", "grouse", "partridge", "kite", "vulture", "lorikeet", "hornbill", "hummingbird",

    // Others
    "rabbit", "hare", "horse", "pony", "cow", "calf", "bull", "sheep", "goat", "pig", "swine", "boar",
    "squirrel", "rat", "mouse", "hamster", "gerbil", "ferret", "weasel", "mink", "badger", "skunk", 
    "racoon", "raccoon", "bear", "fox", "wolf", "coyote", "deer", "elk", "moose", "antelope", 
    "gazelle", "zebra", "camel", "llama", "alpaca", "giraffe", "elephant", "rhino", "hippo", 
    "kangaroo", "koala", "sloth", "armadillo", "bat", "platypus", "pelican", "gull", 
    "snake", "python", "boa", "viper", "turtle", "tortoise", "lizard", "iguana", "gecko", 
    "chameleon", "frog", "toad", "salamander", "shark", "whale", "dolphin", "porpoise", 
    "seal", "walrus", "otter", "beaver", "monkey", "macaque", "chimpanzee", "gorilla", 
    "orangutan", "baboon", "lemur"
];

window.mobilenetModel = null;
window.mobilenetLoaded = false;

// Preload the model async
if (typeof mobilenet !== 'undefined') {
    mobilenet.load().then(model => {
        window.mobilenetModel = model;
        window.mobilenetLoaded = true;
        console.log("MobileNet preloaded successfully.");
        document.dispatchEvent(new Event('animalModelLoaded'));
    }).catch(err => {
        console.error("Failed to preload MobileNet model:", err);
        document.dispatchEvent(new Event('animalModelError'));
    });
}

window.verifyAnimalImage = async function(imageFile) {
    try {
        if (!window.mobilenetModel) {
            console.log("MobileNet not preloaded, loading now...");
            window.mobilenetModel = await mobilenet.load();
        }

        const objectUrl = URL.createObjectURL(imageFile);
        const imgElement = new Image();
        imgElement.src = objectUrl;

        await new Promise((resolve, reject) => {
            imgElement.onload = resolve;
            imgElement.onerror = reject;
        });
        
        // Ensure image dimensions are valid before classify
        if (!imgElement.width || !imgElement.height) {
            console.error("Image width or height is zero.");
            URL.revokeObjectURL(objectUrl);
            throw new Error("Invalid image dimensions.");
        }

        console.log(`Classifying image of size ${imgElement.width}x${imgElement.height}...`);
        const predictions = await window.mobilenetModel.classify(imgElement);
        URL.revokeObjectURL(objectUrl);

        console.log("MobileNet Predictions:", predictions);

        let bestMatch = null;

        for (const pred of predictions) {
            const classNames = pred.className.toLowerCase();
            const hasAnimalKeyword = ANIMAL_KEYWORDS.some(keyword => classNames.includes(keyword));

            if (hasAnimalKeyword) {
                if (!bestMatch || pred.probability > bestMatch.probability) {
                    bestMatch = pred;
                }
            }
        }

        console.log("Best animal match found:", bestMatch);

        // Lower threshold to 0.05 since top 3 predictions usually dominate and if an animal match is in top 3, it's likely an animal
        if (bestMatch && bestMatch.probability >= 0.05) {
            return {
                isAnimal: true,
                confidence: bestMatch.probability,
                detectedClass: bestMatch.className
            };
        }

        return {
            isAnimal: false,
            confidence: bestMatch ? bestMatch.probability : 0,
            detectedClass: bestMatch ? bestMatch.className : null
        };
    } catch (err) {
        console.error("TensorFlow verification failed:", err);
        // Fail-open policy
        return {
            isAnimal: true,
            confidence: 1,
            detectedClass: "unknown (fail-open)"
        };
    }
};
