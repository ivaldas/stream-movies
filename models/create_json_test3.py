import os
import json
import glob

def parse_movie_data(file_content):
    """
    Parses the content of a single text file into a dictionary (movie object).
    Assumes content is in the format:
    Title: Inception
    Year: 2010
    Director: Christopher Nolan
    """
    movie_data = {'directors': [], 'actors': []}
    lines = file_content.strip().split('\n')
    for line in lines:
        try:
            # Split each line at the first colon (or a similar delimiter)
            key, value = line.split(': ', 1)
            # Clean up key and value
            key = key.strip().lower().replace(' ', '_')
            value = value.strip()
            # Attempt to convert numeric values if appropriate (e.g., Year)
            try:
                if key == 'year':
                    value = int(value)
                if key == 'vactor':
                    movie_data['actors'].append(value)
                if key == 'vdirector':
                    movie_data['directors'].append(value)
            except ValueError:
                pass # keep as string if not a number
            movie_data[key] = value
        except ValueError:
            # Handle lines that don't fit the key: value pattern
            print(f"Skipping line due to formatting error: {line}")
            continue
    return movie_data

def create_movies_json(folder_path, output_filename="movies.json"):
    """
    Reads all text files in a folder and creates a single JSON file.
    """
    all_movies = []
    # Find all .txt files in the specified folder
    for filepath in glob.glob(os.path.join(folder_path, "*.txt")):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            movie = parse_movie_data(content)
            if movie:
                all_movies.append(movie)

    # Write the list of movie objects to a single JSON file
    with open(output_filename, 'w', encoding='utf-8') as outfile:
        # Use json.dump with indent for a human-readable JSON file
        json.dump(all_movies, outfile, indent=4)
    
    print(f"Successfully created {output_filename} with {len(all_movies)} movies.")

# Example usage:
# Replace 'your_movie_folder' with the actual path to your folder
create_movies_json('./Films/A Bad Moms Christmas 2017 1080p x264 DTS-HD MA 5.1')
