from flask import Flask, request, jsonify
from flask_cors import CORS
from chatbot import Chatbot
import json
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)

chatbot = Chatbot()

CHAT_DIR = "chat_logs"
os.makedirs(CHAT_DIR, exist_ok=True)


@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    print(f"Received data: {data}")

    if data and data.get('action') == 'greet':
        name = data.get('name', 'Guest')
        reply = chatbot.send_message(f"greet {name}")
        return jsonify({"status": "success", "response": reply})

    elif data and data.get('action') == "ask":
        question = data.get("question", "ask to send the question again")
        reply = chatbot.send_message(question)
        return jsonify({"status": "success", "response": reply})

    elif data and data.get('action') == "summarize":
        page_content = data.get("content", "")
        reply = chatbot.summarize(page_content)
        return jsonify({"status": "success", "response": reply})

    elif data and data.get("action") == "storeHistory":
        history = data.get("history", [])
        if not history:
            return jsonify({"status": "error", "response": "No chat history provided."})

        try:
            date_str = datetime.now().strftime("%Y-%m-%d")
            filename = os.path.join(CHAT_DIR, f"chat_history_{date_str}.json")

            if os.path.exists(filename):
                with open(filename, "r", encoding="utf-8") as f:
                    existing_data = json.load(f)
            else:
                existing_data = []

            existing_data.append({
                "timestamp": datetime.now().isoformat(),
                "history": history
            })

            with open(filename, "w", encoding="utf-8") as f:
                json.dump(existing_data, f, indent=2, ensure_ascii=False)

            return jsonify({"status": "success", "response": f"Chat history appended to {filename}"})
        
        except Exception as e:
            return jsonify({"status": "error", "response": f"Failed to store history: {str(e)}"})

    return jsonify({"status": "error", "response": "Invalid request"})


@app.route('/chatlogs', methods=['GET'])
def get_logs():
    try:
        logs = {}
        for filename in os.listdir(CHAT_DIR):
            if filename.endswith(".json"):
                path = os.path.join(CHAT_DIR, filename)
                with open(path, "r", encoding="utf-8") as f:
                    logs[filename] = json.load(f)
        return jsonify({"status": "success", "response": logs})
    except Exception as e:
        return jsonify({"status": "error", "response": str(e)})


if __name__ == "__main__":
    app.run(debug=True)
