import os
from dotenv import load_dotenv

load_dotenv()

try:
    from google import genai
    from google.genai import types
    
    # Define a grounding tool for Google Search
    grounding_tool = types.Tool(
        google_search=types.GoogleSearch()
    )

    configs = types.GenerateContentConfig(
        system_instruction="""You are a helpful AI assistant embedded in a browser sidebar.
    Your primary source of information is the current webpage. Always answer questions
    based on the page content provided to you. If the answer cannot be found in the webpage,
    if the question is not about the web page then give a witty and concise response.
    Respond concisely using 1 or 2 short sentences. Avoid making assumptions or adding unrelated information.
    Be factual, clear, and relevant to the user's question.
    """,
        thinking_config=types.ThinkingConfig(
            thinking_budget=0
        ),
        tools = [grounding_tool]
    )
except ImportError:
    print("Warning: google-genai not available")
    configs = None

class Chatbot:

    def __init__(self):
        try:
            self.client = genai.Client()
            self.chat = self.client.chats.create(model="gemini-2.5-flash", config=configs)
            self.use_ai = True
        except Exception as e:
            print(f"Error initializing AI client: {e}")
            self.use_ai = False

    def send_message(self, message):
        if not self.use_ai:
            # Fallback responses
            if "greet" in message.lower():
                name = message.split()[-1] if len(message.split()) > 1 else "there"
                return f"Hello {name}! I'm your AI assistant. How can I help you today?"
            else:
                return "I'm currently in offline mode. Please check your API key configuration."
        
        try:
            response = self.chat.send_message_stream(message)
            return ''.join(chunk.text for chunk in response)
        except Exception as e:
            print(f"Error in AI response: {e}")
            return "Sorry, I encountered an error. Please try again."
    
    def summarize(self, page_chunk):
        if not self.use_ai:
            return "Summarization is not available in offline mode."
        
        try:
            response = self.chat.send_message_stream(f"you are being given web page content in chunks, summarize the content and keep it meaningful {page_chunk}")
            return ''.join(chunk.text for chunk in response)
        except Exception as e:
            print(f"Error in summarization: {e}")
            return "Sorry, I couldn't summarize this content."