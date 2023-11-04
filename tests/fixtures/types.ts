export interface Movie {
  name: string;
  year: number;
  rating: number;
  votes: number;
  description: string;
  storyline: string;
  director: string[];
  actors: string[];
  genres: string[];
  tags: string[];
  country: string[];
  runtime: number;
  reviews_count: number;
}

export interface Movie_id extends Movie {
  _id: number;
}

export interface MovieId extends Movie {
  id: number;
}

export interface MovieUuid extends Movie {
  uuid: number;
}

export interface Item {
  id: number;
  name: string;
  tags: string[];
  actors: string[];
  year: number;
  in_cinema: boolean;
  category: string;
}

export type DeepWriteable<T> = {
  -readonly [P in keyof T]: DeepWriteable<T[P]>;
};
