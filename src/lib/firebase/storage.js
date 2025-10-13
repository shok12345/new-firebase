import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"; // Import Firebase Storage utilities

import { storage } from "@/src/lib/firebase/clientApp"; // Import initialized Firebase Storage instance

import { updateRestaurantImageReference } from "@/src/lib/firebase/firestore"; // Import function to update image URL in Firestore

// Main function to handle uploading an image and updating the restaurant document with the image URL
export async function updateRestaurantImage(restaurantId, image) {
  try {
    if (!restaurantId) {
      throw new Error("No restaurant ID has been provided."); // Throw error if no ID
    }

    if (!image || !image.name) {
      throw new Error("A valid image has not been provided."); // Throw error if image is missing or invalid
    }

    const publicImageUrl = await uploadImage(restaurantId, image); // Upload image to Firebase Storage and get public URL
    await updateRestaurantImageReference(restaurantId, publicImageUrl); // Update Firestore with new image URL

    return publicImageUrl; // Return the public image URL
  } catch (error) {
    console.error("Error processing request:", error); // Log any errors during process
  }
}

// Helper function to handle the upload logic
async function uploadImage(restaurantId, image) {
  const filePath = `images/${restaurantId}/${image.name}`; // Define path for storing the image
  const newImageRef = ref(storage, filePath); // Create a reference to the file path in Firebase Storage
  await uploadBytesResumable(newImageRef, image); // Upload the image with resumable support

  return await getDownloadURL(newImageRef); // Retrieve and return the public URL of the uploaded image
}
