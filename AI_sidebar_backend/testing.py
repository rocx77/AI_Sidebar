import requests
import json
def send_to_backend(data):
    url = "http://localhost:5000/chat"
    headers = {'Content-Type': 'application/json'}
    response = requests.post(url, data=json.dumps(data), headers=headers)
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error: {response.status_code} - {response.text}")
        return None

query = "What is the capital of France?"
response = send_to_backend({"action": "ask", "question": query})

print(response)