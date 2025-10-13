"use client"; // Tells Next.js that this is a Client Component and can use hooks like useState, useEffect, etc.

// This component shows one individual restaurant
// It receives data from src/app/restaurant/[id]/page.jsx

import { React, useState, useEffect, Suspense } from "react"; // Import core React and hooks
import dynamic from "next/dynamic"; // Import Next.js dynamic import function
import { getRestaurantSnapshotById } from "@/src/lib/firebase/firestore.js"; // Import function to subscribe to restaurant data from Firestore
import { useUser } from "@/src/lib/getUser"; // Import custom hook to get the current user
import RestaurantDetails from "@/src/components/RestaurantDetails.jsx"; // Import component to show restaurant details
import { updateRestaurantImage } from "@/src/lib/firebase/storage.js"; // Import function to upload a new restaurant image

const ReviewDialog = dynamic(() => import("@/src/components/ReviewDialog.jsx")); // Dynamically import the ReviewDialog component (for performance)

export default function Restaurant({
  id, // Restaurant ID
  initialRestaurant, // Initial restaurant data passed as prop
  initialUserId, // Initial user ID passed as prop
  children, // Any child components
}) {
  const [restaurantDetails, setRestaurantDetails] = useState(initialRestaurant); // State for current restaurant data
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

  async function handleRestaurantImage(target) {
    const image = target.files ? target.files[0] : null; // Get the uploaded image file
    if (!image) {
      return; // Exit if no image was selected
    }

    const imageURL = await updateRestaurantImage(id, image); // Upload image and get its URL
    setRestaurantDetails({ ...restaurantDetails, photo: imageURL }); // Update restaurant state with new image URL
  }

  const handleClose = () => {
    setIsOpen(false); // Close the review dialog
    setReview({ rating: 0, text: "" }); // Reset the review form
  };

  useEffect(() => {
    return getRestaurantSnapshotById(id, (data) => {
      setRestaurantDetails(data); // Subscribe to restaurant data updates from Firestore
    });
  }, [id]); // Re-run if the restaurant ID changes

  return (
    <>
      <RestaurantDetails
        restaurant={restaurantDetails} // Pass restaurant data to child component
        userId={userId} // Pass user ID
        handleRestaurantImage={handleRestaurantImage} // Pass image upload handler
        setIsOpen={setIsOpen} // Pass function to open review dialog
        isOpen={isOpen} // Pass current dialog state
      >
        {children} {/* Render any children inside RestaurantDetails */}
      </RestaurantDetails>

      {userId && ( // Only show the review dialog if user is logged in
        <Suspense fallback={<p>Loading...</p>}> {/* Show loading fallback while dialog loads */}
          <ReviewDialog
            isOpen={isOpen} // Pass state to control dialog visibility
            handleClose={handleClose} // Function to close dialog
            review={review} // Current review data
            onChange={onChange} // Function to update review
            userId={userId} // User ID to associate with the review
            id={id} // Restaurant ID
          />
        </Suspense>
      )}
    </>
  );
}
