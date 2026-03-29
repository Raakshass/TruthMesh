import os
import zipfile
import glob

def zip_dir(directory, zipf, arcname_prefix=""):
    for root, dirs, files in os.walk(directory):
        if "__pycache__" in root:
            continue
        for file in files:
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, start=".") 
            zipf.write(file_path, arcname)

def create_payload():
    print("Creating fast_payload.zip...")
    with zipfile.ZipFile("fast_payload.zip", 'w', zipfile.ZIP_DEFLATED) as zipf:
        for py_file in glob.glob("*.py"):
            zipf.write(py_file)
        zipf.write("requirements.txt")
        if os.path.exists(".env"):
            zipf.write(".env")
        zip_dir("pipeline", zipf)
    print("Zip creation complete.")

if __name__ == "__main__":
    create_payload()
