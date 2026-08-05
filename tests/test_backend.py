import requests

try:
    response = requests.post("http://127.0.0.1:8000/chat", json={"message": "hey"})
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.json()}")
except Exception as e:
    print(f"Error: {e}")
