import requests
import os
import sys

def test_indexing(workspace_id, file_path):
    url = "http://localhost:8005/api/v1/documents/index"
    
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return

    print(f"🚀 Testing indexing with file: {file_path}")
    print(f"📂 Workspace ID: {workspace_id}")
    
    try:
        with open(file_path, 'rb') as f:
            files = {'file': f}
            data = {
                'workspace_id': workspace_id,
                'title': 'AI Engineering Book',
                'chunking_strategy': 'paragraph',
                'chunk_size': 768,
                'embedding_provider': 'huggingface'
            }
            
            response = requests.post(url, files=files, data=data)
            
            if response.status_code == 201:
                print("✅ Indexing successful!")
                print(response.json())
            else:
                print(f"❌ Indexing failed with status {response.status_code}")
                print(response.text)
                
    except Exception as e:
        print(f"❌ Error during request: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 test_indexing.py <workspace_id>")
        sys.exit(1)
        
    workspace_id = sys.argv[1]
    file_path = "/home/thanhnx/naver/naver-hackathon-2025/data_sample/OReilly - AI Engineering.pdf"
    test_indexing(workspace_id, file_path)
