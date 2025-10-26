"use client"; // Tells Next.js that this is a Client Component and can use hooks like useState, useEffect, etc.

// This component shows one individual game
// It receives data from src/app/game/[id]/page.jsx

import { React, useState, useEffect, Suspense } from "react"; // Import core React and hooks
import dynamic from "next/dynamic"; // Import Next.js dynamic import function
import { getGameSnapshotById } from "@/src/lib/firebase/firestore.js"; // Import function to subscribe to game data from Firestore
import { useUser } from "@/src/lib/getUser"; // Import custom hook to get the current user
import GameDetails from "@/src/components/GameDetails.jsx"; // Import component to show game details
import { updateGameImage } from "@/src/lib/firebase/storage.js"; // Import function to upload a new game image

const ReviewDialog = dynamic(() => import("@/src/components/ReviewDialog.jsx")); // Dynamically import the ReviewDialog component (for performance)

export default function Game({
  id, // Game ID
  initialGame, // Initial game data passed as prop
  initialUserId, // Initial user ID passed as prop
  children, // Any child components
}) {
  const [gameDetails, setGameDetails] = useState(initialGame); // State for current game data
  const [isOpen, setIsOpen] = useState(false); // State to control visibility of the review dialog

  // The only reason this component needs to know the user ID is to associate a review with the user, and to know whether to show the review dialog
  const userId = useUser()?.uid || initialUserId; // Get current user ID from hook or fallback to initialUserId

  const [review, setReview] = useState({
    rating: 0, // Initial review rating
    text: "", // Initial review text
  });

  const onChange = (value, name) => {
    setReview({ ...review, [name]: value }); // Update review state when form input changes
  };

  async function handleGameImage(target) {
    const image = target.files ? target.files[0] : null; // Get the uploaded image file
    if (!image) {
      return; // Exit if no image was selected
    }

    const imageURL = await updateGameImage(id, image); // Upload image and get its URL
    setGameDetails({ ...gameDetails, photo: imageURL }); // Update game state with new image URL
  }

  const handleClose = () => {
    setIsOpen(false); // Close the review dialog
    setReview({ rating: 0, text: "" }); // Reset the review form
  };

  useEffect(() => {
    return getGameSnapshotById(id, (data) => {
      setGameDetails(data); // Subscribe to game data updates from Firestore
    });
  }, [id]); // Re-run if the game ID changes

  return (
    <>
      <GameDetails
        game={gameDetails} // Pass game data to child component
        userId={userId} // Pass user ID
        handleGameImage={handleGameImage} // Pass image upload handler
        setIsOpen={setIsOpen} // Pass function to open review dialog
        isOpen={isOpen} // Pass current dialog state
      >
        {children} {/* Render any children inside GameDetails */}
      </GameDetails>

      {userId && ( // Only show the review dialog if user is logged in
        <Suspense fallback={<p>Loading...</p>}> {/* Show loading fallback while dialog loads */}
          <ReviewDialog
            isOpen={isOpen} // Pass state to control dialog visibility
            handleClose={handleClose} // Function to close dialog
            review={review} // Current review data
            onChange={onChange} // Function to update review
            userId={userId} // User ID to associate with the review
            id={id} // Game ID
          />
        </Suspense>
      )}
    </>
  );
}
