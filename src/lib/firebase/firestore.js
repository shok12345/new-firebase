import { generateFakeGamesAndReviews } from "@/src/lib/fakeGames.js"; // Import utility to generate fake data for testing/demo

// Import Firestore functions needed to read, write, and observe data
import {
  collection,
  onSnapshot,
  query,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  orderBy,
  Timestamp,
  runTransaction,
  where,
  addDoc,
  getFirestore,
} from "firebase/firestore";

import { db } from "@/src/lib/firebase/clientApp"; // Import initialized Firestore client instance

// Updates the 'photo' field of a game document with a new image URL
export async function updateGameImageReference(
  gameId,
  publicImageUrl
) {
  const gameRef = doc(collection(db, "games"), gameId); // Reference to the game document
  if (gameRef) {
    await updateDoc(gameRef, { photo: publicImageUrl }); // Update the 'photo' field
  }
}

// Internal helper to update rating data in a Firestore transaction
const updateWithRating = async (
  transaction,
  docRef,
  newRatingDocument,
  review
) => {
  const game = await transaction.get(docRef); // Get current game data
  const data = game.data(); // Extract game data
  const newNumRatings = data?.numRatings ? data.numRatings + 1 : 1; // Increment total number of ratings
  const newSumRating = (data?.sumRating || 0) + Number(review.rating); // Add new rating to sum
  const newAverage = newSumRating / newNumRatings; // Calculate new average rating

  transaction.update(docRef, {
    numRatings: newNumRatings,
    sumRating: newSumRating,
    avgRating: newAverage,
  }); // Update game stats

  transaction.set(newRatingDocument, {
    ...review,
    timestamp: Timestamp.fromDate(new Date()), // Add a timestamp to the new review
  }); // Save the new review under the 'ratings' subcollection
};

// Adds a new review to a game and updates rating stats atomically
export async function addReviewToGame(db, gameId, review) {
  if (!gameId) {
    throw new Error("No game ID has been provided."); // Error if no game ID
  }

  if (!review) {
    throw new Error("A valid review has not been provided."); // Error if no review object
  }

  try {
    const docRef = doc(collection(db, "games"), gameId); // Reference to the game doc
    const newRatingDocument = doc(
      collection(db, `games/${gameId}/ratings`) // Reference to new rating doc in subcollection
    );

    // Run transaction to update game and add rating
    await runTransaction(db, transaction =>
      updateWithRating(transaction, docRef, newRatingDocument, review)
    );
  } catch (error) {
    console.error(
      "There was an error adding the rating to the game",
      error
    );
    throw error; // Rethrow error after logging
  }
}

// Applies Firestore query filters based on provided filter object
function applyQueryFilters(q, { genre, platform, price, sort }) {
  if (genre) {
    q = query(q, where("genre", "==", genre)); // Filter by genre
  }
  if (platform) {
    q = query(q, where("platform", "==", platform)); // Filter by platform
  }
  if (price) {
    q = query(q, where("price", "==", price.length)); // Filter by price level (assumes price is "$" repeated)
  }
  if (sort === "Rating" || !sort) {
    q = query(q, orderBy("avgRating", "desc")); // Sort by average rating descending
  } else if (sort === "Review") {
    q = query(q, orderBy("numRatings", "desc")); // Sort by number of ratings descending
  }
  return q; // Return the updated query
}

// Fetches games from Firestore and applies optional filters
export async function getGames(db = db, filters = {}) {
  let q = query(collection(db, "games")); // Base query

  q = applyQueryFilters(q, filters); // Apply filters
  const results = await getDocs(q); // Execute query
  return results.docs.map((doc) => {
    return {
      id: doc.id,
      ...doc.data(),
      // Only plain objects can be passed to Client Components from Server Components
      timestamp: doc.data().timestamp.toDate(), // Convert Firestore timestamp to JS Date
    };
  });
}

// Subscribes to real-time updates for games using Firestore's onSnapshot
export function getGamesSnapshot(cb, filters = {}) {
  if (typeof cb !== "function") {
    console.log("Error: The callback parameter is not a function"); // Validate callback
    return;
  }

  let q = query(collection(db, "games")); // Base query
  q = applyQueryFilters(q, filters); // Apply filters

  return onSnapshot(q, (querySnapshot) => {
    const results = querySnapshot.docs.map((doc) => {
      return {
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate(), // Convert timestamp
      };
    });

    cb(results); // Call the provided callback with the updated results
  });
}

// Fetch a single game by ID
export async function getGameById(db, gameId) {
  if (!gameId) {
    console.log("Error: Invalid ID received: ", gameId); // Log error if ID is missing
    return;
  }
  const docRef = doc(db, "games", gameId); // Reference to the game doc
  const docSnap = await getDoc(docRef); // Get the document
  return {
    ...docSnap.data(),
    timestamp: docSnap.data().timestamp.toDate(), // Convert timestamp
  };
}

// Placeholder function – does nothing currently
export function getGameSnapshotById(gameId, cb) {
  return;
}

// Fetch all reviews for a specific game, ordered by timestamp descending
export async function getReviewsByGameId(db, gameId) {
  if (!gameId) {
    console.log("Error: Invalid gameId received: ", gameId); // Log error if ID is missing
    return;
  }

  const q = query(
    collection(db, "games", gameId, "ratings"), // Reference to ratings subcollection
    orderBy("timestamp", "desc") // Order by latest first
  );

  const results = await getDocs(q); // Execute query
  return results.docs.map((doc) => {
    return {
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate(), // Convert timestamp
    };
  });
}

// Subscribes to real-time updates for a game's reviews
export function getReviewsSnapshotByGameId(gameId, cb) {
  if (!gameId) {
    console.log("Error: Invalid gameId received: ", gameId); // Log error if missing ID
    return;
  }

  const q = query(
    collection(db, "games", gameId, "ratings"), // Reference to ratings
    orderBy("timestamp", "desc") // Order by timestamp descending
  );
  return onSnapshot(q, (querySnapshot) => {
    const results = querySnapshot.docs.map((doc) => {
      return {
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate(), // Convert timestamp
      };
    });
    cb(results); // Pass updated data to callback
  });
}

// Populates the database with randomly generated games and their reviews
export async function addFakeGamesAndReviews() {
  const data = await generateFakeGamesAndReviews(); // Generate mock data

  for (const { gameData, ratingsData } of data) {
    try {
      const docRef = await addDoc(
        collection(db, "games"), // Add a game doc
        gameData
      );

      for (const ratingData of ratingsData) {
        await addDoc(
          collection(db, "games", docRef.id, "ratings"), // Add each review to subcollection
          ratingData
        );
      }
    } catch (e) {
      console.log("There was an error adding the document"); // Log general error message
      console.error("Error adding document: ", e); // Log actual error
    }
  }
}
