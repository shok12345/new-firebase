import { gemini20Flash, googleAI } from "@genkit-ai/googleai"; // Import Gemini model and plugin from Genkit Google AI SDK
import { genkit } from "genkit"; // Import Genkit core to configure and use AI models
import { getReviewsByRestaurantId } from "@/src/lib/firebase/firestore.js"; // Import Firestore helper to fetch reviews for a specific restaurant
import { getAuthenticatedAppForUser } from "@/src/lib/firebase/serverApp"; // Import function to get authenticated Firebase app instance
import { getFirestore } from "firebase/firestore"; // Import Firestore SDK to interact with the database

// Define an asynchronous component that fetches and summarizes reviews for a restaurant
export async function GeminiSummary({ restaurantId }) {
  const { firebaseServerApp } = await getAuthenticatedAppForUser(); // Get the authenticated Firebase server app
  const reviews = await getReviewsByRestaurantId( // Fetch all reviews for the given restaurant ID
    getFirestore(firebaseServerApp), // Use Firestore instance from the authenticated app
    restaurantId // Target restaurant ID
  );

  const reviewSeparator = "@"; // Character used to separate reviews in the prompt
  const prompt = `
    Based on the following restaurant reviews, 
    where each review is separated by a '${reviewSeparator}' character, 
    create a one-sentence summary of what people think of the restaurant. 

    Here are the reviews: ${reviews.map((review) => review.text).join(reviewSeparator)}
  `; // Create a prompt string that includes all reviews separated by '@'

  try {
    if (!process.env.GEMINI_API_KEY) { // Check if the Gemini API key is set in environment variables
      // Make sure GEMINI_API_KEY environment variable is set:
      // https://firebase.google.com/docs/genkit/get-started
      throw new Error(
        'GEMINI_API_KEY not set. Set it with "firebase apphosting:secrets:set GEMINI_API_KEY"'
      ); // Throw an error if the API key is missing
    }

    // Configure a Genkit instance.
    const ai = genkit({
      plugins: [googleAI()], // Use the Google AI plugin
      model: gemini20Flash, // Set Gemini 2.0 Flash as the default model
    });

    const { text } = await ai.generate(prompt); // Generate summary text from the AI model using the prompt

    return (
      <div className="restaurant__review_summary"> {/* Return a JSX element with the summary */}
        <p>{text}</p> {/* Display the generated summary */}
        <p>✨ Summarized with Gemini</p> {/* Add a visual indicator for the AI summary */}
      </div>
    );
  } catch (e) {
    console.error(e); // Log any errors to the console
    return <p>Error summarizing reviews.</p>; // Show fallback error message to the user
  }
}

// Define a fallback skeleton UI for loading state
export function GeminiSummarySkeleton() {
  return (
    <div className="restaurant__review_summary"> {/* Container for the loading state */}
      <p>✨ Summarizing reviews with Gemini...</p> {/* Placeholder message shown while summary is loading */}
    </div>
  );
}
