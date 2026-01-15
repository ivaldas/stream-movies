import os
import json
import re
from typing import Optional

def extract_season_from_path(path: str) -> Optional[int]:
    """
    Extract season number from parent folders of a file.
    Handles folder names like:
    - Season 1
    - season_02
    - S03
    - Season 02 - 2008
    - s3 comedy
    """
    normalized_path = os.path.normpath(path)
    parts = normalized_path.split(os.sep)

    # Check folders from bottom up (skip the filename)
    for folder in reversed(parts[:-1]):
        folder_lower = folder.lower()
        # Match 'season' or 's' followed by 1-2 digit number anywhere in the folder name
        match = re.search(r"(?:season[\s._-]*|s)(\d{1,2})", folder_lower)
        if match:
            return int(match.group(1))
    return None

def parse_movie_data(file_content, file_path, full_path):
    """
    Parses the content of a single text file into a dictionary (movie object).
    """
    movie_data = {
        "file_path": file_path,
        "full_path": full_path,
        "directors": [],
        "writers": [],
        "actors": [],
        "programgenre": []
    }

    lines = file_content.strip().split('\n')
    for line in lines:
        try:
            key, value = line.split(': ', 1)
            key = key.strip().lower().replace(' ', '_')
            value = value.strip()

            # Convert numeric and boolean values
            if key in ['movieyear', 'episodenumber']:
                try:
                    value = int(value)
                except ValueError:
                    pass
            elif key in ['isepisode', 'isepisodic']:
                value_lower = value.lower()
                if value_lower == 'true':
                    value = True
                elif value_lower == 'false':
                    value = False

            # Handle list fields
            if key == 'vactor':
                movie_data['actors'].append(value)
                continue
            elif key == 'vdirector':
                movie_data['directors'].append(value)
                continue
            elif key == 'vwriter':
                movie_data['writers'].append(value)
                continue
            elif key == 'vprogramgenre':
                movie_data['programgenre'].append(value)
                continue
            elif key == 'starrating':
                try:
                    value = float(value)
                except ValueError:
                    pass

            movie_data[key] = value

        except ValueError:
            print(f"Skipping line due to formatting error: {line}")
            continue

    # ---------- TV SHOW SEASON HANDLING ----------
    is_tvshow = bool(movie_data.get("isepisode") or movie_data.get("isepisodic"))

    if is_tvshow:
        season = movie_data.get("season")
        if not isinstance(season, int) or season < 1:
            season_from_path = extract_season_from_path(full_path)
            movie_data["season"] = season_from_path if season_from_path else 1
    else:
        movie_data.pop("season", None)

    return movie_data

def text_files_to_json(root_dir, output_json_file):
    """
    Reads all text files in a root directory and its subdirectories,
    and converts their content into a single JSON file.
    """
    data_list = []

    for dirpath, dirnames, filenames in os.walk(root_dir):
        for filename in filenames:
            if filename.endswith('.txt'):
                file_path = os.path.join(dirpath, filename)
                full_path = os.path.join(os.path.realpath(dirpath), filename)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        movie = parse_movie_data(content, file_path, full_path)
                        if movie:
                            data_list.append(movie)
                except Exception as e:
                    print(f"Error reading file {file_path}: {e}")

    try:
        with open(output_json_file, 'w', encoding='utf-8') as f:
            json.dump(data_list, f, indent=4)
        print(f"Successfully wrote data from {len(data_list)} files to {output_json_file}")
    except Exception as e:
        print(f"Error writing to JSON file {output_json_file}: {e}")

if __name__ == "__main__":
    input_directory = "../../TV Shows"  # Change to your source directory
    output_file = "./tv_shows_data.json"  # Desired output JSON path
    text_files_to_json(input_directory, output_file)
