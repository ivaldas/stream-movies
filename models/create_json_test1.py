import os
import json

def create_movies_json(root_dir, output_file):
    movies_data = []

    # Traverse the directory structure
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Focus on movie folders, usually the ones containing video files
        if any(f.endswith(('.mp4', '.mkv', '.avi', '.mov')) for f in filenames):
            folder_name = os.path.basename(dirpath)

            # Basic parsing of folder name (example: "Inception (2010)")
            title = folder_name.split(" (")[0] if " (" in folder_name else folder_name
            year = folder_name.strip(" ").split("(")[-1].strip(")") if "(" in folder_name else None

            # Find the main video file
            video_file = next((f for f in filenames if f.endswith(('.mp4', '.mkv', '.avi', '.mov'))), None)

            movie_info = {
                "title": title,
                "year": year,
                "folder_path": os.path.realpath(dirpath),
                "filename": video_file,
                "path": os.path.realpath(dirpath) +'/'+ video_file,
                "full_path": os.path.join(dirpath, video_file) if video_file else None
            }
            movies_data.append(movie_info)
    
    # Write the data to JSON file
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(movies_data, f, indent=4) # Use indent for readability
    
    print(f"Successfully created {output_file} with {len(movies_data)} entries.")

# --- How to use script ---
# Specify the path to your main movies directory
movies_root_directory = '../../Films'
# Specify the name for the output JSON file
output_json_file = 'test1.json'

create_movies_json(movies_root_directory, output_json_file)