import os

# Define the base directory
base_dir = '/Users/temiolufore/Desktop/CIS 4375/4375_Project/myfrontend/public/img/'

# Range of folder numbers to create
start = 21
end = 28

# Create folders in the specified range
for folder_number in range(start, end + 1):
    folder_name = str(folder_number)  # Convert the number to a string
    folder_path = os.path.join(base_dir, folder_name)
    try:
        os.makedirs(folder_path, exist_ok=True)  # Create folder if it doesn't exist
        print(f"Folder created: {folder_path}")
    except Exception as e:
        print(f"Failed to create folder {folder_path}: {e}")
