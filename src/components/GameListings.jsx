"use client";

// This components handles the game listings page
// It receives data from src/app/page.jsx, such as the initial games and search params from the URL

import Link from "next/link";
import { React, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import renderStars from "@/src/components/Stars.jsx";
import { getGamesSnapshot } from "@/src/lib/firebase/firestore.js";
import Filters from "@/src/components/Filters.jsx";

const GameItem = ({ game }) => (
  <li key={game.id}>
    <Link href={`/game/${game.id}`}>
      <ActiveGame game={game} />
    </Link>
  </li>
);

const ActiveGame = ({ game }) => (
  <div>
    <ImageCover photo={game.photo} name={game.name} />
    <GameDetails game={game} />
  </div>
);

const ImageCover = ({ photo, name }) => (
  <div className="image-cover">
    <img src={photo} alt={name} />
  </div>
);

const GameDetails = ({ game }) => (
  <div className="game__details">
    <h2>{game.name}</h2>
    <GameRating game={game} />
    <GameMetadata game={game} />
  </div>
);

const GameRating = ({ game }) => (
  <div className="game__rating">
    <ul>{renderStars(game.avgRating)}</ul>
    <span>({game.numRatings})</span>
  </div>
);

const GameMetadata = ({ game }) => (
  <div className="game__meta">
    <p>
      {game.genre} | {game.platform}
    </p>
    <p>{"$".repeat(game.price)}</p>
  </div>
);

export default function GameListings({
  initialGames,
  searchParams,
}) {
  const router = useRouter();

  // The initial filters are the search params from the URL, useful for when the user refreshes the page
  const initialFilters = {
    platform: searchParams.platform || "",
    genre: searchParams.genre || "",
    price: searchParams.price || "",
    sort: searchParams.sort || "",
  };

  const [games, setGames] = useState(initialGames);
  const [filters, setFilters] = useState(initialFilters);

  useEffect(() => {
    routerWithFilters(router, filters);
  }, [router, filters]);

  useEffect(() => {
    return getGamesSnapshot((data) => {
      setGames(data);
    }, filters);
  }, [filters]);

  return (
    <article>
      <Filters filters={filters} setFilters={setFilters} />
      <ul className="games">
        {games.map((game) => (
          <GameItem key={game.id} game={game} />
        ))}
      </ul>
    </article>
  );
}

function routerWithFilters(router, filters) {
  const queryParams = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") {
      queryParams.append(key, value);
    }
  }

  const queryString = queryParams.toString();
  router.push(`?${queryString}`);
}
