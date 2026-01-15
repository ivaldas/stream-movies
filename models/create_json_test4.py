import os
import json

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
                try:
                    # Read the content of the text file
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Create a dictionary for the file data
                    file_data = {
                        "file_path": file_path,
                        "content": content.strip().split('\n')
                    }
                    data_list.append(file_data)
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
    input_directory = "./Films" # Change this to your source directory path
    output_file = "./output_data.json" # Change this to your desired output file path
    
    # Run the function
    text_files_to_json(input_directory, output_file)
