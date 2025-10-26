import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"; // Import Firebase Storage utilities

import { storage } from "@/src/lib/firebase/clientApp"; // Import initialized Firebase Storage instance

import { updateGameImageReference } from "@/src/lib/firebase/firestore"; // Import function to update image URL in Firestore

// Main function to handle uploading an image and updating the game document with the image URL
export async function updateGameImage(gameId, image) {
  try {
    if (!gameId) {
      throw new Error("No game ID has been provided."); // Throw error if no ID
    }

    if (!image || !image.name) {
      throw new Error("A valid image has not been provided."); // Throw error if image is missing or invalid
    }

    const publicImageUrl = await uploadImage(gameId, image); // Upload image to Firebase Storage and get public URL
    await updateGameImageReference(gameId, publicImageUrl); // Update Firestore with new image URL

    return publicImageUrl; // Return the public image URL
  } catch (error) {
    console.error("Error processing request:", error); // Log any errors during process
  }
}

// Helper function to handle the upload logic
async function uploadImage(gameId, image) {
  const filePath = `images/${gameId}/${image.name}`; // Define path for storing the image
  const newImageRef = ref(storage, filePath); // Create a reference to the file path in Firebase Storage
  await uploadBytesResumable(newImageRef, image); // Upload the image with resumable support

  return await getDownloadURL(newImageRef); // Retrieve and return the public URL of the uploaded image
}
