import os
import re
import requests
from typing import Optional, Tuple


class OmdbClient:
    BASE_URL = "https://www.omdbapi.com/"

    def __init__(self, api_key: str):
        if not api_key:
            raise ValueError("OMDb API key is required")
        self.api_key = api_key

    def _request(self, params: dict) -> Optional[dict]:
        params["apikey"] = self.api_key
        try:
            response = requests.get(self.BASE_URL, params=params, timeout=10)
            response.raise_for_status()
        except requests.RequestException as e:
            print(f"Error during API request: {e}")
            return None

        data = response.json()
        return data if data.get("Response") == "True" else None

    def get_movie_or_series(self, title: str, is_series: bool) -> Optional[dict]:
        return self._request({
            "t": title,
            "type": "series" if is_series else "movie"
        })

    def get_episode(self, series_imdb_id: str, season: int, episode: int) -> Optional[dict]:
        return self._request({
            "i": series_imdb_id,
            "Season": season,
            "Episode": episode
        })


class FilenameParser:
    CLEANUP_PATTERN = re.compile(
        r'\b(UHD|1080p|2160p|Blu[- ]?ray|HEVC|HDR|Atmos|WEB|DVDRip|H264|H265)\b',
        re.IGNORECASE
    )

    TV_PATTERN = re.compile(r"(.*?)\s*S(\d{2})E(\d{2})", re.IGNORECASE)
    MOVIE_PATTERN = re.compile(r"(.+?)\b(19|20)\d{2}\b", re.IGNORECASE)

    VALID_EXTENSIONS = {".mkv", ".mp4", ".m4v", ".avi", ".mov", ".webm", ".flv", ".wmv", ".mpg"}

    @staticmethod
    def parse(filepath: str) -> Tuple[str, Optional[int], Optional[int]]:
        name, ext = os.path.splitext(os.path.basename(filepath))

        # Ensure the file has a valid extension
        if ext.lower() not in FilenameParser.VALID_EXTENSIONS:
            return None, None, None # type: ignore

        name = name.replace(".", " ")
        name = FilenameParser.CLEANUP_PATTERN.sub("", name).strip()

        # Check if it's a TV show
        tv_match = FilenameParser.TV_PATTERN.search(name)
        if tv_match:
            return tv_match.group(1).strip(), int(tv_match.group(2)), int(tv_match.group(3))

        # Check if it's a movie
        movie_match = FilenameParser.MOVIE_PATTERN.match(name)
        if movie_match:
            return movie_match.group(1).strip(), None, None

        # Default return if no pattern matches
        return name.strip(), None, None


class PosterDownloader:
    @staticmethod
    def download(movie_data: dict, media_path: str) -> str:
        poster_url = movie_data.get("Poster")
        if not poster_url or poster_url == "N/A":
            return ""

        # Use the media's directory and filename for poster saving
        image_path = media_path + ".jpg"
        try:
            response = requests.get(poster_url, timeout=10)
            response.raise_for_status()
        except requests.RequestException as e:
            print(f"Error downloading poster: {e}")
            return ""

        with open(image_path, "wb") as f:
            f.write(response.content)
        return image_path


class MetadataWriter:
    @staticmethod
    def write(movie_data: dict, media_path: str, image_path: str):
        # Generate the txt filename in the same directory as the original media
        txt_path = media_path + ".txt"
        is_episode = movie_data.get("Type") == "episode"

        series_id = movie_data.get("seriesID") or movie_data.get("imdbID")

        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(f"title : {movie_data.get('Title')}\n")
            f.write(f"movieYear : {movie_data.get('Year')}\n")
            f.write(f"programId : {series_id}\n")
            f.write(f"seriesId : {series_id}\n")

            if is_episode:
                f.write(f"episodeId : {movie_data.get('imdbID')}\n")

            f.write(f"description : {movie_data.get('Plot')}\n")
            f.write(f"isEpisode : {'true' if is_episode else 'false'}\n")
            f.write(
                f"isEpisodic : {'true' if movie_data.get('Type') in ('series', 'episode') else 'false'}\n"
            )

            for genre in movie_data.get("Genre", "").split(", "):
                if genre:
                    f.write(f"vProgramGenre : {genre}\n")

            for director in movie_data.get("Director", "").split(", "):
                if director:
                    f.write(f"vDirector : {director}\n")

            for writer in movie_data.get("Writer", "").split(", "):
                if writer:
                    f.write(f"vWriter : {writer}\n")

            for actor in movie_data.get("Actors", "").split(", "):
                if actor:
                    f.write(f"vActor : {actor}\n")

            f.write(f"mpaaRating : {movie_data.get('Rated', 'N/A')}\n")
            f.write(f"starRating : {movie_data.get('imdbRating', 'N/A')}\n")
            f.write(f"image : {os.path.basename(image_path) if image_path else 'N/A'}\n")


class MediaProcessor:
    def __init__(self, omdb_client: OmdbClient):
        self.omdb = omdb_client

    def process(self, media_path: str):
        title, season, episode = FilenameParser.parse(media_path)
        if title is None:
            print(f"Skipping unsupported file: {media_path}")
            return

        is_tv = season is not None and episode is not None

        base_data = self.omdb.get_movie_or_series(title, is_tv)
        if not base_data:
            print(f"Metadata not found for {title}")
            return

        if is_tv:
            episode_data = self.omdb.get_episode(base_data["imdbID"], season, episode) # type: ignore
            if not episode_data:
                print("Episode metadata not found")
                return
            movie_data = episode_data
        else:
            movie_data = base_data

        image_path = PosterDownloader.download(movie_data, media_path)
        MetadataWriter.write(movie_data, media_path, image_path)

        print(f"Processed: {media_path}")


# ------------------- Batch Folder Processor -------------------

def process_folder(directory: str, omdb_api_key: str):
    processor = MediaProcessor(OmdbClient(omdb_api_key))

    # Recursively walk through the folder
    for root, dirs, files in os.walk(directory):
        for file in files:
            file_path = os.path.join(root, file)
            processor.process(file_path)


# ------------------- USAGE -------------------

if __name__ == "__main__":
    OMDB_API_KEY = '34aef2c3'
    TARGET_DIRECTORY = r"D:\videos\TV Shows\The Adventures of Mowgli 1973"

    process_folder(TARGET_DIRECTORY, OMDB_API_KEY)