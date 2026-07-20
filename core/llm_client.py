import os
import json
import requests
from groq import Groq
from google import genai
from dotenv import load_dotenv
from core.personality import JARVIS_SYSTEM_PROMPT
from core.memory import save_memory, load_memory
from core.profile import load_profile

try:
    from llama_cpp import Llama
    LLAMA_CPP_AVAILABLE = True
except ImportError:
    LLAMA_CPP_AVAILABLE = False

load_dotenv()

class JARVISEngine:
    def __init__(self):
        self.groq_key = None
        self.google_key = None
        self.google_client = None
        self.client = None
        self.llama_client = None
        self.provider = None
        self.model_name = "unknown"
        self.provider_priority = []
        self.llama_cpp_enabled = False
        self.llama_cpp_model_path = ""
        self._active_llama_model_path = None
        
        self.load_engines()
        
        profile = load_profile()
        self.system_prompt = f"{JARVIS_SYSTEM_PROMPT}\n\n### Current User Profile:\n{json.dumps(profile, indent=2)}"
        
        # Initialize memory
        self.messages = load_memory()
        if not self.messages:
            self.messages = [{"role": "system", "content": self.system_prompt}]

    def load_engines(self):
        """Dynamically loads or reloads the AI engines from environment configuration."""
        load_dotenv(override=True)
        
        # Re-fetch keys
        self.groq_key = os.getenv("GROQ_API_KEY")
        self.google_key = os.getenv("GOOGLE_API_KEY")
        self.llama_cpp_enabled = os.getenv("LLAMA_CPP_ENABLED", "").lower() in ("1", "true", "yes", "on")
        self.llama_cpp_model_path = os.getenv("LLAMA_CPP_MODEL_PATH", "")
        
        # Get provider priority from environment
        priority_str = os.getenv("AI_PROVIDER_PRIORITY", "groq,gemini,llama_cpp")
        self.provider_priority = [p.strip().lower() for p in priority_str.split(",") if p.strip()]
        previous_provider = self.provider
        self.provider = None
        self.model_name = "unknown"
        
        # Determine provider and initialize clients according to priority
        for provider in self.provider_priority:
            if provider == "groq" and self.groq_key and len(self.groq_key) > 10 and not self.groq_key.startswith("PASTE_YOUR_"):
                if self.client is None:
                    print("[*] Initializing Groq Engine (Llama 3.3)...")
                    self.client = Groq(api_key=self.groq_key)
                self.provider = "groq"
                self.model_name = "llama-3.3-70b-versatile"
                break
            elif provider == "gemini" and self.google_key and len(self.google_key) > 10 and not self.google_key.startswith("PASTE_YOUR_"):
                if self.google_client is None:
                    print("[*] Initializing Gemini Engine (Google GenAI SDK)...")
                    self.google_client = genai.Client(api_key=self.google_key)
                    
                    # Diagnostic: Check available models
                    try:
                        for m in self.google_client.models.list():
                            if "flash" in m.name.lower():
                                print(f"[*] Found Flash Model: {m.name}")
                    except Exception as e:
                        print(f"[!] Warning: Could not list models: {e}")

                    # Allow user to override model in .env, otherwise use the most stable latest flash
                self.provider = "gemini"
                self.model_name = os.getenv("GOOGLE_MODEL", "gemini-flash-latest")
                print(f"[*] Gemini Model Selected: {self.model_name}")
                break
            elif provider == "llama_cpp" and self.llama_cpp_enabled and self.llama_cpp_model_path:
                if previous_provider != "llama_cpp":
                    print("[*] Initializing llama.cpp Engine (Local Model)...")
                    print(f"[*] llama.cpp Model: {self.llama_cpp_model_path}")
                self.provider = "llama_cpp"
                self.model_name = os.path.basename(self.llama_cpp_model_path) or "llama.cpp"
                break
        
        if self.provider is None and previous_provider is not None:
            print("[WARN] Engines disabled/reset: No active providers found.")

    def chat(self, user_input: str):
        # Reload configuration dynamically in case of updates
        self.load_engines()

        if not self.provider:
            return (
                "Sir, I cannot process your request because no AI engine is configured. "
                "Please add your API keys in the settings menu, configure them in your environment, "
                "or enable a local llama.cpp model."
            )

        if self.provider == "llama_cpp":
            return self.call_llama_cpp(user_input)
        elif self.provider == "gemini":
            print("[*] Attempting Gemini request...")
            response = self.call_gemini(user_input)
            
            # If Gemini hits a rate limit or not found, fall back to Groq as a fail-safe
            if "429" in response or "404" in response or "RESOURCE_EXHAUSTED" in response:
                if self.groq_key:
                    print("[!] Gemini Rate Limit/Error. Falling back to Groq fail-safe...")
                    return self.call_groq(user_input)
            return response
        else:
            return self.call_groq(user_input)

    def _ensure_system_message(self):
        if not any(m["role"] == "system" for m in self.messages):
            self.messages.insert(0, {"role": "system", "content": self.system_prompt})

    def _resolve_llama_model_path(self):
        normalized_path = os.path.normpath(self.llama_cpp_model_path)
        if os.path.isabs(normalized_path):
            return normalized_path

        script_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(script_dir)
        return os.path.normpath(os.path.join(project_root, normalized_path))

    def _get_llama_client(self, model_path):
        if not LLAMA_CPP_AVAILABLE:
            return None

        if self.llama_client is None or self._active_llama_model_path != model_path:
            n_ctx = int(os.getenv("LLAMA_CPP_N_CTX", "2048"))
            n_threads = int(os.getenv("LLAMA_CPP_THREADS", str(max(1, min(8, os.cpu_count() or 4)))))
            self.llama_client = Llama(
                model_path=model_path,
                n_ctx=n_ctx,
                n_threads=n_threads,
                verbose=False
            )
            self._active_llama_model_path = model_path

        return self.llama_client

    def call_llama_cpp(self, user_input: str):
        if not LLAMA_CPP_AVAILABLE:
            return "Sir, llama.cpp support is not installed. Please install `llama-cpp-python` first."

        normalized_path = self._resolve_llama_model_path()
        print(f"[*] Looking for model at: {normalized_path}")

        if not os.path.exists(normalized_path):
            return f"Sir, the model file was not found at {normalized_path}. Please download a model first."

        self._ensure_system_message()

        self.messages.append({"role": "user", "content": user_input})
        
        try:
            llm = self._get_llama_client(normalized_path)
            
            # Format messages for llama.cpp
            prompt = ""
            for msg in self.messages:
                if msg["role"] == "system":
                    prompt += f"System: {msg['content']}\n"
                elif msg["role"] == "user":
                    prompt += f"User: {msg['content']}\n"
                elif msg["role"] == "assistant":
                    prompt += f"Assistant: {msg['content']}\n"
            prompt += "Assistant:"
            
            # Generate response
            output = llm(
                prompt,
                max_tokens=int(os.getenv("LLAMA_CPP_MAX_TOKENS", "512")),
                temperature=float(os.getenv("LLAMA_CPP_TEMPERATURE", "0.7")),
                stop=["User:", "System:"],
                echo=False
            )
            
            assistant_response = output['choices'][0]['text'].strip()
            self.messages.append({"role": "assistant", "content": assistant_response})
            save_memory(self.messages)
            return assistant_response
            
        except Exception as e:
            self.messages.pop()
            return f"Sir, the local llama.cpp core stumbled: {str(e)}"

    def call_groq(self, user_input: str):
        # Ensure we have the system prompt for the fallback
        self._ensure_system_message()
            
        self.messages.append({"role": "user", "content": user_input})
        try:
            response = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=self.messages,
                temperature=0.7,
                max_tokens=1024,
            )
            assistant_response = response.choices[0].message.content
            self.messages.append({"role": "assistant", "content": assistant_response})
            save_memory(self.messages)
            return assistant_response
        except Exception as e:
            return f"Sir, even my fail-safe Groq processors are struggling: {str(e)}"

    def call_gemini(self, user_input: str):
        try:
            # New SDK usage
            response = self.google_client.models.generate_content(
                model=self.model_name,
                contents=f"{self.system_prompt}\n\nUser: {user_input}"
            )
            
            if not response.text:
                return "Sir, Gemini returned an empty response."
                
            assistant_response = response.text
            
            # Record in history
            self.messages.append({"role": "user", "content": user_input})
            self.messages.append({"role": "assistant", "content": assistant_response})
            save_memory(self.messages)
            
            return assistant_response
        except Exception as e:
            error_msg = str(e)
            print(f"[!] Gemini Error: {error_msg}")
            return f"Gemini Error: {error_msg}"

    def clear_history(self):
        self.messages = [{"role": "system", "content": self.system_prompt}]
        if os.path.exists("memory.json"):
            os.remove("memory.json")
