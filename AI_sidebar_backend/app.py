from flask import Flask, request, jsonify
from flask_cors import CORS   #type: ignore
from chatbot import Chatbot
import json
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)

chatbot = Chatbot()

CHAT_DIR = "chat_logs"
os.makedirs(CHAT_DIR, exist_ok=True)

# Global variable to store summarize chunks
summarize_chunks = {}


@app.route('/chat', methods=['POST'])
def chat():
    global summarize_chunks
    
    data = request.json
    print(f"Received data: {data}")

    if data and data.get('action') == 'greet':
        name = data.get('name', 'Guest')
        reply = chatbot.send_message(f"greet {name}")
        return jsonify({"status": "success", "response": reply})

    elif data and data.get('action') == "ask":
        question = data.get("question", "ask to send the question again")
        reply = chatbot.send_message(question)
        print(f"Chatbot reply: {reply}")
        return jsonify({"status": "success", "response": reply})

    elif data and data.get('action') == "summarize":
        page_content = data.get("content", "")
        chunk_index = data.get("chunk_index", 0)
        total_chunks = data.get("total_chunks", 1)
        
        print(f"Summarize request received - Chunk {chunk_index + 1}/{total_chunks}")
        print(f"Content length: {len(page_content)}")
        print(f"Content preview: {page_content[:100]}...")
        
        # Store chunks in a session-like manner
        
        # Generate a unique session ID for this summarize request
        session_id = data.get("session_id", "default")
        
        if session_id not in summarize_chunks:
            summarize_chunks[session_id] = []
        
        # Add current chunk to the collection
        summarize_chunks[session_id].append(page_content)
        
        print(f"Received chunk {chunk_index + 1}/{total_chunks} for session {session_id}")
        
        # If this is the last chunk, process all chunks together
        if chunk_index + 1 == total_chunks:
            all_content = " ".join(summarize_chunks[session_id])
            print(f"Processing final summary for session {session_id} with {len(all_content)} characters")
            
            reply = chatbot.summarize(all_content)
            print(f"Final chatbot reply: {reply}")
            
            # Clean up the session
            del summarize_chunks[session_id]
            
            return jsonify({"status": "success", "response": reply, "is_final": True})
        else:
            # Return acknowledgment for intermediate chunks
            return jsonify({"status": "success", "response": f"Chunk {chunk_index + 1} received", "is_final": False})

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

    elif data and data.get('action') == "terminate":
        session_id = data.get("session_id", "default")
        
        # Clean up the session if it exists
        if session_id in summarize_chunks:
            del summarize_chunks[session_id]
            print(f"Terminated session {session_id}")
            return jsonify({"status": "success", "response": "Generation terminated"})
        else:
            return jsonify({"status": "success", "response": "No active session to terminate"})

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



@app.route('/log', methods=['POST'])
def log():
    data = request.json
    print("Frontend Log:", data.get("message"))
    return jsonify({"status": "logged"})


if __name__ == "__main__":
    app.run(debug=True, threaded=True)
