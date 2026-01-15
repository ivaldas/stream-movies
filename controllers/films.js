import films_data from "../models/films_data.json" with { type: 'json' }

export const getFilms = async (req, res) => {
  try {
    res.status(200).send(films_data);
  } catch (err) {
    res.status(404).send(err.message);
  }
};

export const getSingleFilm = async (req, res) => {
  try {
    const { id } = req.params;
    const foundFilm = films_data.find(
      (film) => String(film.programid) === String(id)
    );
    if (foundFilm) {
      res.status(200).send(foundFilm)
    } else {
      res.status(404).send("Film not found.");
    }
  } catch (err) {
    res.status(404).send(err.message);
  }
};

export const createFilm = async (req, res) => {
  const {
    file_path,
    directors,
    actors,
    movieyear,
    title,
    description,
    isepisode,
    isepisodic,
    seriesid,
    programid,
    starrating,
    mpaarating,
    vprogramgenre,
    image
  } = req.body;
  try {
    const newMovie = {
      id: String(allMovies.length + 1),
      file_path,
      directors,
      actors,
      movieyear,
      title,
      description,
      isepisode,
      isepisodic,
      seriesid,
      programid,
      starrating,
      mpaarating,
      vprogramgenre,
      image
    };
    films_data.push(newMovie);
    res.status(201).send(newMovie);
  } catch (err) {
    res.status(404).send(err.message)
  }
}

export const updateFilm = async (req, res) => {
  const { id } = req.params;
  const {
    file_path,
    directors,
    actors,
    movieyear,
    title,
    description,
    isepisode,
    isepisodic,
    seriesid,
    programid,
    starrating,
    mpaarating,
    vprogramgenre,
    image
  } = req.body;
  try {
    const foundFilm = films_data.find(
      (film) => String(film.programid) === String(id)
    );
    if (foundFilm) {
      foundFilm.file_path = file_path
      foundFilm.directors = directors
      foundFilm.actors = actors
      foundFilm.movieyear = movieyear
      foundFilm.title = title
      foundFilm.description = description
      foundFilm.isepisode = isepisode
      foundFilm.isepisodic = isepisodic
      foundFilm.seriesid = seriesid
      foundFilm.programid = programid
      foundFilm.starrating = starrating
      foundFilm.mpaarating = mpaarating
      foundFilm.vprogramgenre = vprogramgenre
      foundFilm.image = image
      res.status(200).send(foundFilm)
    } else {
      res.status(404).send("Film not found.");
    }
  } catch (err) {
    res.status(404).send(err.message)
  }
}

export const deleteFilm = async (req, res) => {
  const {id} = req.params;
  try {
    const foundFilm = films_data.find(
      (film) => String(film.programid) === String(id)
    );
    if (foundFilm) {
      const matchingFilm = films_data.indexOf(foundFilm);
      films_data.splice(matchingFilm, 1);
      res.status(200).send('Film deleted successfully.');
    } else {
      res.status(404).send('Film not found');
    }
  } catch (err) {res.status(404).send(err.message)};
}