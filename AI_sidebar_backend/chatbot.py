import os
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

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


class Chatbot:

    def __init__(self):
        self.client = genai.Client()
        self.chat = self.client.chats.create(model="gemini-2.5-flash", config=configs)

    def send_message(self, message):
        response = self.chat.send_message_stream(message)
        return ''.join(chunk.text for chunk in response)
    
    def summarize(self,page_chunk):
        response = self.chat.send_message_stream(f"you are being given web page content in chunks, summarize the content and keep it meaningful {page_chunk}")
        return ''.join(chunk.text for chunk in response)