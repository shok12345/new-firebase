"use client"; // This directive indicates that the component is a Client Component in Next.js (required for using hooks and browser APIs)

// This components handles the review dialog and uses a next.js feature known as Server Actions to handle the form submission

import { useEffect, useLayoutEffect, useRef } from "react"; // Import React hooks: useEffect, useLayoutEffect, and useRef
import RatingPicker from "@/src/components/RatingPicker.jsx"; // Import a custom RatingPicker component
import { handleReviewFormSubmission } from "@/src/app/actions.js"; // Import a server action to handle form submission

// Define the ReviewDialog component with destructured props
const ReviewDialog = ({
  isOpen, // Boolean indicating if the dialog should be open
  handleClose, // Function to close the dialog
  review, // Review object containing text
  onChange, // Function to handle text input changes
  userId, // ID of the user submitting the review
  id, // ID of the restaurant being reviewed
}) => {
  const dialog = useRef(); // Create a ref to access the dialog DOM element

  // dialogs only render their backdrop when called with `showModal`
  useLayoutEffect(() => {
    if (isOpen) { // If the dialog should be open
      dialog.current.showModal(); // Show the modal dialog
    } else {
      dialog.current.close(); // Close the dialog
    }
  }, [isOpen, dialog]); // Re-run this effect whenever `isOpen` or `dialog` changes

  const handleClick = (e) => {
    // close if clicked outside the modal
    if (e.target === dialog.current) { // If the click target is the dialog backdrop
      handleClose(); // Close the dialog
    }
  };

  return (
    <dialog ref={dialog} onMouseDown={handleClick}> {/* Render the <dialog> element and assign the ref, handle backdrop clicks */}
      <form
        action={handleReviewFormSubmission} // Assign server action for form submission
        onSubmit={() => {
          handleClose(); // Close the dialog when the form is submitted
        }}
      >
        <header>
          <h3>Add your review</h3> {/* Title of the review form */}
        </header>
        <article>
          <RatingPicker /> {/* Render the RatingPicker component */}

          <p>
            <input
              type="text" // Input field for review text
              name="text" // Name of the input field for form data
              id="review" // ID of the input field
              placeholder="Write your thoughts here" // Placeholder text
              required // Make the input required
              value={review.text} // Bind the input value to `review.text`
              onChange={(e) => onChange(e.target.value, "text")} // Handle text changes
            />
          </p>

          <input type="hidden" name="restaurantId" value={id} /> {/* Hidden input for restaurant ID */}
          <input type="hidden" name="userId" value={userId} /> {/* Hidden input for user ID */}
        </article>
        <footer>
          <menu> {/* Button group for dialog actions */}
            <button
              autoFocus // Automatically focus this button
              type="reset" // Reset the form
              onClick={handleClose} // Close the dialog when clicked
              className="button--cancel" // CSS class for cancel button
            >
              Cancel
            </button>
            <button type="submit" value="confirm" className="button--confirm"> {/* Submit button */}
              Submit
            </button>
          </menu>
        </footer>
      </form>
    </dialog>
  );
};

export default ReviewDialog; // Export the ReviewDialog component as the default export
