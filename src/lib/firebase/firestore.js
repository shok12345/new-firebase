import { generateFakeRestaurantsAndReviews } from "@/src/lib/fakeRestaurants.js"; // Import utility to generate fake data for testing/demo

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

// Updates the 'photo' field of a restaurant document with a new image URL
export async function updateRestaurantImageReference(
  restaurantId,
  publicImageUrl
) {
  const restaurantRef = doc(collection(db, "restaurants"), restaurantId); // Reference to the restaurant document
  if (restaurantRef) {
    await updateDoc(restaurantRef, { photo: publicImageUrl }); // Update the 'photo' field
  }
}

// Internal helper to update rating data in a Firestore transaction
const updateWithRating = async (
  transaction,
  docRef,
  newRatingDocument,
  review
) => {
  const restaurant = await transaction.get(docRef); // Get current restaurant data
  const data = restaurant.data(); // Extract restaurant data
  const newNumRatings = data?.numRatings ? data.numRatings + 1 : 1; // Increment total number of ratings
  const newSumRating = (data?.sumRating || 0) + Number(review.rating); // Add new rating to sum
  const newAverage = newSumRating / newNumRatings; // Calculate new average rating

  transaction.update(docRef, {
    numRatings: newNumRatings,
    sumRating: newSumRating,
    avgRating: newAverage,
  }); // Update restaurant stats

  transaction.set(newRatingDocument, {
    ...review,
    timestamp: Timestamp.fromDate(new Date()), // Add a timestamp to the new review
  }); // Save the new review under the 'ratings' subcollection
};

// Adds a new review to a restaurant and updates rating stats atomically
export async function addReviewToRestaurant(db, restaurantId, review) {
  if (!restaurantId) {
    throw new Error("No restaurant ID has been provided."); // Error if no restaurant ID
  }

  if (!review) {
    throw new Error("A valid review has not been provided."); // Error if no review object
  }

  try {
    const docRef = doc(collection(db, "restaurants"), restaurantId); // Reference to the restaurant doc
    const newRatingDocument = doc(
      collection(db, `restaurants/${restaurantId}/ratings`) // Reference to new rating doc in subcollection
    );

    // Run transaction to update restaurant and add rating
    await runTransaction(db, transaction =>
      updateWithRating(transaction, docRef, newRatingDocument, review)
    );
  } catch (error) {
    console.error(
      "There was an error adding the rating to the restaurant",
      error
    );
    throw error; // Rethrow error after logging
  }
}

// Applies Firestore query filters based on provided filter object
function applyQueryFilters(q, { category, city, price, sort }) {
  if (category) {
    q = query(q, where("category", "==", category)); // Filter by category
  }
  if (city) {
    q = query(q, where("city", "==", city)); // Filter by city
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

// Fetches restaurants from Firestore and applies optional filters
export async function getRestaurants(db = db, filters = {}) {
  let q = query(collection(db, "restaurants")); // Base query

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

// Subscribes to real-time updates for restaurants using Firestore's onSnapshot
export function getRestaurantsSnapshot(cb, filters = {}) {
  if (typeof cb !== "function") {
    console.log("Error: The callback parameter is not a function"); // Validate callback
    return;
  }

  let q = query(collection(db, "restaurants")); // Base query
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

// Fetch a single restaurant by ID
export async function getRestaurantById(db, restaurantId) {
  if (!restaurantId) {
    console.log("Error: Invalid ID received: ", restaurantId); // Log error if ID is missing
    return;
  }
  const docRef = doc(db, "restaurants", restaurantId); // Reference to the restaurant doc
  const docSnap = await getDoc(docRef); // Get the document
  return {
    ...docSnap.data(),
    timestamp: docSnap.data().timestamp.toDate(), // Convert timestamp
  };
}

// Placeholder function – does nothing currently
export function getRestaurantSnapshotById(restaurantId, cb) {
  return;
}

// Fetch all reviews for a specific restaurant, ordered by timestamp descending
export async function getReviewsByRestaurantId(db, restaurantId) {
  if (!restaurantId) {
    console.log("Error: Invalid restaurantId received: ", restaurantId); // Log error if ID is missing
    return;
  }

  const q = query(
    collection(db, "restaurants", restaurantId, "ratings"), // Reference to ratings subcollection
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

// Subscribes to real-time updates for a restaurant’s reviews
export function getReviewsSnapshotByRestaurantId(restaurantId, cb) {
  if (!restaurantId) {
    console.log("Error: Invalid restaurantId received: ", restaurantId); // Log error if missing ID
    return;
  }

  const q = query(
    collection(db, "restaurants", restaurantId, "ratings"), // Reference to ratings
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

// Populates the database with randomly generated restaurants and their reviews
export async function addFakeRestaurantsAndReviews() {
  const data = await generateFakeRestaurantsAndReviews(); // Generate mock data

  for (const { restaurantData, ratingsData } of data) {
    try {
      const docRef = await addDoc(
        collection(db, "restaurants"), // Add a restaurant doc
        restaurantData
      );

      for (const ratingData of ratingsData) {
        await addDoc(
          collection(db, "restaurants", docRef.id, "ratings"), // Add each review to subcollection
          ratingData
        );
      }
    } catch (e) {
      console.log("There was an error adding the document"); // Log general error message
      console.error("Error adding document: ", e); // Log actual error
    }
  }
}
