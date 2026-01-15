import os
import json

movie_collection_path = "./Films"
movies_data = []

for root, dirs, files in os.walk(movie_collection_path):
        for file in files:
            # Filter for common video file extensions
            if file.lower().endswith(('.mp4', '.mkv', '.avi', '.mov', '.flv')):
                file_path = os.path.join(root, file)
                # Extract movie title from filename (or folder name)
                movie_title = os.path.splitext(file)[0] 
                # You might want to extract more metadata here, 
                # e.g., using a library like 'mutagen' for media files
                
                movie_info = {
                    "title": movie_title,
                    "path": file_path,
                    # Add other relevant information like year, genre, etc.
                }
                movies_data.append(movie_info)

output_json_path = "movies.json"
with open(output_json_path, 'w') as f:
     json.dump(movies_data, f, indent=4) # indent for pretty-printing