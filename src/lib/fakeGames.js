import {
  randomNumberBetween,
  getRandomDateAfter,
  getRandomDateBefore,
} from "@/src/lib/utils.js";
import { randomData } from "@/src/lib/randomData.js";

import { Timestamp } from "firebase/firestore";

export async function generateFakeGamesAndReviews() {
  const gamesToAdd = 5;
  const data = [];

  for (let i = 0; i < gamesToAdd; i++) {
    const gameTimestamp = Timestamp.fromDate(getRandomDateBefore());

    const ratingsData = [];

    // Generate a random number of ratings/reviews for this game
    for (let j = 0; j < randomNumberBetween(0, 5); j++) {
      const ratingTimestamp = Timestamp.fromDate(
        getRandomDateAfter(gameTimestamp.toDate())
      );

      const ratingData = {
        rating:
          randomData.gameReviews[
            randomNumberBetween(0, randomData.gameReviews.length - 1)
          ].rating,
        text: randomData.gameReviews[
          randomNumberBetween(0, randomData.gameReviews.length - 1)
        ].text,
        userId: `User #${randomNumberBetween()}`,
        timestamp: ratingTimestamp,
      };

      ratingsData.push(ratingData);
    }

    const avgRating = ratingsData.length
      ? ratingsData.reduce(
          (accumulator, currentValue) => accumulator + currentValue.rating,
          0
        ) / ratingsData.length
      : 0;

    const gameData = {
      genre:
        randomData.gameGenres[
          randomNumberBetween(0, randomData.gameGenres.length - 1)
        ],
      name: randomData.gameNames[
        randomNumberBetween(0, randomData.gameNames.length - 1)
      ],
      avgRating,
      platform: randomData.gamePlatforms[
        randomNumberBetween(0, randomData.gamePlatforms.length - 1)
      ],
      numRatings: ratingsData.length,
      sumRating: ratingsData.reduce(
        (accumulator, currentValue) => accumulator + currentValue.rating,
        0
      ),
      price: randomNumberBetween(1, 4),
      //photo: `games/game-image-1.jpg`,

      photo: `/games/game-image-${randomNumberBetween(1, 22)}.jpg`,
      
      // photo: `https://storage.googleapis.com/firestorequickstarts.appspot.com/food_${randomNumberBetween(
      //   1,
      //   22
      // )}.png`,
      timestamp: gameTimestamp,
    };
    
    data.push({
      gameData,
      ratingsData,
    });
  }
  return data;
}
