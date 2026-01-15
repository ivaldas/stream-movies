import os
import json

def parse_movie_data(file_content, root_dir, f_path):
    """
    Parses the content of a single text file into a dictionary (movie object).
    Assumes content is in the format:
    Title: Inception
    Year: 2010
    Director: Christopher Nolan
    """
    movie_data = {"file_path": root_dir,"f_path": f_path, 'directors': [], 'writers': [], 'actors': []}
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
                if key == 'vwriter':
                    movie_data['writers'].append(value)
            except ValueError:
                pass # keep as string if not a number
            movie_data[key] = value
        except ValueError:
            # Handle lines that don't fit the key: value pattern
            print(f"Skipping line due to formatting error: {line}")
            continue
    return movie_data

def text_files_to_json(root_dir, output_json_file):
    """
    Reads all text files in a root directory and its subdirectories, 
    and converts their content into a single JSON file.

    Args:
        root_dir (str): The root directory to start searching for text files.
        output_json_file (str): The path for the output JSON file.
    """
    data_list = []

    # Walk through the directory and its subdirectories
    for dirpath, dirnames, filenames in os.walk(root_dir):
        for filename in filenames:
            # Check if the file is a text file
            if filename.endswith('.txt'):
                file_path = os.path.join(dirpath, filename)
                f_path = os.path.realpath(dirpath) + '\\' + filename
                try:
                    # Read the content of the text file
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        movie = parse_movie_data(content, file_path, f_path)
                        if movie:
                            data_list.append(movie)
                    
                    # Create a dictionary for the file data
                except Exception as e:
                    print(f"Error reading file {file_path}: {e}")

    # Write the collected data to a single JSON file
    try:
        with open(output_json_file, 'w', encoding='utf-8') as f:
            json.dump(data_list, f, indent=4)
        print(f"Successfully wrote data from {len(data_list)} files to {output_json_file}")
    except Exception as e:
        print(f"Error writing to JSON file {output_json_file}: {e}")

if __name__ == "__main__":
    # Define your input and output paths
    input_directory = "../../Films" # Change this to your source directory path
    output_file = "./test5.json" # Change this to your desired output file path
    
    # Run the function
    text_files_to_json(input_directory, output_file)
