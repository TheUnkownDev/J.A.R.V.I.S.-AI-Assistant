import argparse
import asyncio
import os
import shlex
import sys

from core.llm_client import JARVISEngine
from core.llama_manager import LlamaManager
from core.runtime import process_response

try:
    from colorama import Fore, Style, init as colorama_init

    colorama_init()
except ImportError:
    class _ColorFallback:
        BLACK = ""
        BLUE = ""
        CYAN = ""
        GREEN = ""
        MAGENTA = ""
        RED = ""
        WHITE = ""
        YELLOW = ""
        RESET_ALL = ""
        BRIGHT = ""
        DIM = ""

    Fore = Style = _ColorFallback()


class CLITheme:
    brand = Fore.CYAN + Style.BRIGHT
    prompt = Fore.GREEN + Style.BRIGHT
    assistant = Fore.CYAN + Style.BRIGHT
    tool = Fore.YELLOW + Style.BRIGHT
    info = Fore.BLUE + Style.BRIGHT
    warning = Fore.YELLOW + Style.BRIGHT
    error = Fore.RED + Style.BRIGHT
    muted = Style.DIM + Fore.WHITE
    reset = Style.RESET_ALL


HISTORY_FILE = os.path.join(os.path.expanduser("~"), ".jarvis_cli_history")
HISTORY_LIMIT = 250
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
ENV_FILE = os.path.join(PROJECT_ROOT, ".env")


def build_parser():
    parser = argparse.ArgumentParser(description="J.A.R.V.I.S. command-line interface")
    parser.add_argument("-p", "--prompt", help="Run a single prompt and exit instead of interactive mode.")
    parser.add_argument("--speak", action="store_true", help="Enable spoken responses in the CLI.")
    parser.add_argument("--clear-history", action="store_true", help="Clear saved conversation history before starting.")
    parser.add_argument("--groq", type=str, help="Groq API key for this CLI session.")
    parser.add_argument("--gemini", type=str, help="Gemini API key for this CLI session.")
    parser.add_argument("--llama-cpp", action="store_true", help="Enable local llama.cpp model support.")
    parser.add_argument("--llama-cpp-model", type=str, help="Path to a GGUF model file for llama.cpp.")
    parser.add_argument(
        "--provider-priority",
        type=str,
        help="Comma-separated provider order, for example: llama_cpp,groq,gemini",
    )
    return parser


def style(label, text):
    return f"{label}{text}{CLITheme.reset}"


def print_info(message):
    print(style(CLITheme.info, f"[*] {message}"))


def print_warning(message):
    print(style(CLITheme.warning, f"[!] {message}"))


def print_error(message):
    print(style(CLITheme.error, f"[x] {message}"))


def print_tool(message):
    print(style(CLITheme.tool, f"[*] {message}"))


def print_assistant(message):
    print(style(CLITheme.assistant, f"JARVIS: {message}"))


def build_prompt():
    return style(CLITheme.prompt, "jarvis> ")


def print_banner():
    print(style(CLITheme.brand, "J.A.R.V.I.S. CLI"))
    print(style(CLITheme.muted, "Type /help for commands. Use Up/Down arrows for history."))


class InputHistory:
    def __init__(self, file_path, limit=HISTORY_LIMIT):
        self.file_path = file_path
        self.limit = limit
        self.entries = self._load_entries()
        self.index = None
        self.pending_buffer = ""

    def _load_entries(self):
        if not os.path.exists(self.file_path):
            return []
        try:
            with open(self.file_path, "r", encoding="utf-8") as history_file:
                return [line.rstrip("\n") for line in history_file if line.strip()]
        except OSError:
            return []

    def _save_entries(self):
        try:
            with open(self.file_path, "w", encoding="utf-8") as history_file:
                history_file.write("\n".join(self.entries[-self.limit :]))
                if self.entries:
                    history_file.write("\n")
        except OSError:
            pass

    def add(self, entry):
        if not entry or not entry.strip():
            return
        cleaned = entry.strip()
        if not self.entries or self.entries[-1] != cleaned:
            self.entries.append(cleaned)
            self.entries = self.entries[-self.limit :]
            self._save_entries()
        self.reset_navigation()

    def clear(self):
        self.entries = []
        self.reset_navigation()
        try:
            if os.path.exists(self.file_path):
                os.remove(self.file_path)
        except OSError:
            pass

    def reset_navigation(self):
        self.index = None
        self.pending_buffer = ""

    def previous(self, current_buffer):
        if not self.entries:
            return current_buffer
        if self.index is None:
            self.pending_buffer = current_buffer
            self.index = len(self.entries) - 1
        elif self.index > 0:
            self.index -= 1
        return self.entries[self.index]

    def next(self):
        if self.index is None:
            return self.pending_buffer
        if self.index < len(self.entries) - 1:
            self.index += 1
            return self.entries[self.index]
        self.index = None
        return self.pending_buffer

    def tail(self, count=10):
        return self.entries[-count:]


def redraw_console_input(prompt_text, buffer_chars, cursor_pos):
    full_text = "".join(buffer_chars)
    visible_text = "".join(buffer_chars[:cursor_pos])
    sys.stdout.write("\r")
    sys.stdout.write(f"{prompt_text}{full_text} ")
    sys.stdout.write("\r")
    sys.stdout.write(f"{prompt_text}{visible_text}")
    sys.stdout.flush()


def read_input_with_history(prompt_text, history):
    try:
        import msvcrt
    except ImportError:
        return input(prompt_text)

    buffer_chars = []
    cursor_pos = 0
    history.reset_navigation()
    sys.stdout.write(prompt_text)
    sys.stdout.flush()

    while True:
        char = msvcrt.getwch()

        if char in ("\r", "\n"):
            sys.stdout.write("\n")
            sys.stdout.flush()
            history.reset_navigation()
            return "".join(buffer_chars)
        if char == "\003":
            raise KeyboardInterrupt
        if char in ("\x00", "\xe0"):
            special = msvcrt.getwch()
            if special == "H":
                recalled = history.previous("".join(buffer_chars))
                buffer_chars = list(recalled)
                cursor_pos = len(buffer_chars)
            elif special == "P":
                recalled = history.next()
                buffer_chars = list(recalled)
                cursor_pos = len(buffer_chars)
            elif special == "K" and cursor_pos > 0:
                cursor_pos -= 1
            elif special == "M" and cursor_pos < len(buffer_chars):
                cursor_pos += 1
            elif special == "S" and cursor_pos < len(buffer_chars):
                del buffer_chars[cursor_pos]
            redraw_console_input(prompt_text, buffer_chars, cursor_pos)
            continue
        if char == "\b":
            if cursor_pos > 0:
                del buffer_chars[cursor_pos - 1]
                cursor_pos -= 1
                redraw_console_input(prompt_text, buffer_chars, cursor_pos)
            continue
        if char == "\x1a":
            raise EOFError
        if char.isprintable():
            buffer_chars.insert(cursor_pos, char)
            cursor_pos += 1
            redraw_console_input(prompt_text, buffer_chars, cursor_pos)


def print_help():
    print(style(CLITheme.info, "Available commands:"))
    print("  /help          Show this help message")
    print("  /clear         Clear conversation history")
    print("  /history       Show recent CLI command history")
    print("  /history clear Clear saved CLI command history")
    print("  /models        Show downloaded local models")
    print("  /models help   Show model management commands")
    print("  /provider      Show the active AI provider and priority")
    print("  /speech on     Enable spoken replies")
    print("  /speech off    Disable spoken replies")
    print("  /exit          Quit the CLI")


def print_history(history):
    items = history.tail()
    if not items:
        print_info("No CLI history recorded yet.")
        return
    print(style(CLITheme.info, "Recent CLI history:"))
    for index, item in enumerate(items, start=1):
        print(style(CLITheme.muted, f"  {index:>2}. {item}"))


def format_model_line(prefix, model):
    description = model.get("description", "")
    size_gb = model.get("size_gb", "?")
    file_name = model.get("file", model.get("name", "unknown"))
    line = f"{prefix}{file_name} | {size_gb} GB"
    if description:
        line += f" | {description}"
    return line


def print_models_help():
    print(style(CLITheme.info, "Model commands:"))
    print("  /models                 Show downloaded GGUF models")
    print("  /models available       Show recommended downloadable models")
    print("  /models recommend       Show hardware info and the recommended model")
    print("  /models use <file>      Set the active GGUF model and enable llama.cpp")
    print("  /models download <name> Download a recommended model by name")
    print("  /models delete <file>   Delete a downloaded GGUF model")


def update_env_file(updates):
    lines = []
    if os.path.exists(ENV_FILE):
        try:
            with open(ENV_FILE, "r", encoding="utf-8") as env_file:
                lines = env_file.read().splitlines()
        except OSError:
            lines = []

    remaining = dict(updates)
    new_lines = []
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in line:
            new_lines.append(line)
            continue

        key = line.split("=", 1)[0].strip()
        if key in remaining:
            value = str(remaining.pop(key)).replace('"', '\\"')
            new_lines.append(f'{key}="{value}"')
        else:
            new_lines.append(line)

    for key, value in remaining.items():
        escaped = str(value).replace('"', '\\"')
        new_lines.append(f'{key}="{escaped}"')

    with open(ENV_FILE, "w", encoding="utf-8") as env_file:
        env_file.write("\n".join(new_lines).rstrip() + "\n")


def make_project_relative(path):
    try:
        return os.path.relpath(path, PROJECT_ROOT)
    except ValueError:
        return path


def configure_llama_model(jarvis, model_path):
    relative_path = make_project_relative(model_path)
    os.environ["LLAMA_CPP_ENABLED"] = "true"
    os.environ["LLAMA_CPP_MODEL_PATH"] = relative_path
    os.environ["AI_PROVIDER_PRIORITY"] = "llama_cpp,groq,gemini"
    update_env_file(
        {
            "LLAMA_CPP_ENABLED": "true",
            "LLAMA_CPP_MODEL_PATH": relative_path,
            "AI_PROVIDER_PRIORITY": "llama_cpp,groq,gemini",
        }
    )
    jarvis.load_engines()
    return relative_path


def clear_active_llama_model(jarvis):
    os.environ["LLAMA_CPP_ENABLED"] = "false"
    os.environ["LLAMA_CPP_MODEL_PATH"] = ""
    update_env_file(
        {
            "LLAMA_CPP_ENABLED": "false",
            "LLAMA_CPP_MODEL_PATH": "",
        }
    )
    jarvis.load_engines()


def print_downloaded_models(manager, jarvis):
    downloaded = manager.get_downloaded_models()
    active_path = os.getenv("LLAMA_CPP_MODEL_PATH", "")
    active_name = os.path.basename(active_path) if active_path else ""

    if not downloaded:
        print_info("No downloaded GGUF models found.")
        return

    print(style(CLITheme.info, "Downloaded models:"))
    for model in downloaded:
        marker = "* " if model["file"] == active_name else "  "
        print(style(CLITheme.muted, format_model_line(marker, model)))

    if active_name:
        print_info(f"Active local model: {active_name}")


def print_available_models(manager):
    available = manager.get_available_models()
    print(style(CLITheme.info, "Available recommended models:"))
    for index, model in enumerate(available, start=1):
        badge = "[recommended] " if model.get("recommended") == "MAIN" else ""
        print(style(CLITheme.muted, f"  {index}. {badge}{format_model_line('', model)}"))


def print_recommended_model(manager):
    hardware = manager.get_hardware_info()
    recommendation = hardware.get("recommended_model")
    print_info(
        f"Hardware: {hardware['ram_gb']} GB RAM | CPU cores: {hardware['cpu_cores']} | "
        f"GPU: {hardware['gpu_info'].get('gpu_name') or 'none'}"
    )
    if recommendation:
        print(style(CLITheme.info, f"Recommended model: {recommendation['file']}"))
        print(style(CLITheme.muted, f"  {recommendation['description']}"))


def resolve_available_model(manager, selector):
    available = manager.get_available_models()
    selector_lower = selector.lower()
    if selector_lower in {"recommended", "main"}:
        for model in available:
            if model.get("recommended") == "MAIN":
                return model
    for model in available:
        if model["name"].lower() == selector_lower or model["file"].lower() == selector_lower:
            return model
    return None


def resolve_downloaded_model(manager, selector):
    selector_lower = selector.lower()
    if os.path.exists(selector):
        return {"file": os.path.basename(selector), "path": selector}

    for model in manager.get_downloaded_models():
        if model["file"].lower() == selector_lower or model["name"].lower() == selector_lower:
            return model
    return None


def handle_models_command(raw_input, jarvis):
    try:
        parts = shlex.split(raw_input, posix=False)
    except ValueError as exc:
        print_error(f"Could not parse model command: {exc}")
        return

    manager = LlamaManager(PROJECT_ROOT)
    subcommand = parts[1].lower() if len(parts) > 1 else "downloaded"

    if subcommand in {"help", "--help"}:
        print_models_help()
        return

    if subcommand in {"downloaded", "list"}:
        print_downloaded_models(manager, jarvis)
        return

    if subcommand == "available":
        print_available_models(manager)
        return

    if subcommand == "recommend":
        print_recommended_model(manager)
        return

    if subcommand == "use":
        if len(parts) < 3:
            print_error("Usage: /models use <file>")
            return
        model = resolve_downloaded_model(manager, parts[2])
        if not model:
            print_error("Model not found. Use /models to see downloaded files.")
            return
        relative_path = configure_llama_model(jarvis, model["path"])
        print_info(f"Active llama.cpp model set to {relative_path}")
        return

    if subcommand == "download":
        if len(parts) < 3:
            print_error("Usage: /models download <name>")
            print_available_models(manager)
            return
        model = resolve_available_model(manager, parts[2])
        if not model:
            print_error("Recommended model not found. Use /models available to see valid names.")
            return

        progress_state = {"last_bucket": -1}

        def progress_callback(progress, downloaded, total):
            bucket = int(progress // 10)
            if bucket > progress_state["last_bucket"] or progress >= 100:
                progress_state["last_bucket"] = bucket
                downloaded_mb = round(downloaded / (1024 * 1024), 1)
                total_mb = round(total / (1024 * 1024), 1) if total else 0
                print_info(f"Downloading {model['file']}: {progress:.1f}% ({downloaded_mb}/{total_mb} MB)")

        print_info(f"Starting download for {model['file']}")
        result = manager.download_model(model["repo"], model["file"], progress_callback)
        if result.get("success"):
            print_info(result["message"])
            print_info(f"Use /models use \"{model['file']}\" to activate it.")
        else:
            print_error(result.get("message", "Download failed."))
        return

    if subcommand == "delete":
        if len(parts) < 3:
            print_error("Usage: /models delete <file>")
            return
        model = resolve_downloaded_model(manager, parts[2])
        if not model:
            print_error("Model not found. Use /models to see downloaded files.")
            return

        active_path = os.getenv("LLAMA_CPP_MODEL_PATH", "")
        active_name = os.path.basename(active_path) if active_path else ""
        result = manager.delete_model(model["file"])
        if result.get("success"):
            if model["file"] == active_name:
                clear_active_llama_model(jarvis)
                print_warning("Deleted the active model, so local llama.cpp was disabled.")
            print_info(result["message"])
        else:
            print_error(result.get("message", "Delete failed."))
        return

    print_error("Unknown model command.")
    print_models_help()


def init_speech():
    from core.speech import JARVISSpeech

    return JARVISSpeech()


async def maybe_speak(speech, text):
    if speech is not None:
        await speech.speak(text)


async def run_turn(jarvis, user_input, speech=None):
    raw_response = jarvis.chat(user_input)
    final_text, tools_executed = process_response(raw_response)

    for tool in tools_executed:
        if tool["name"] == "error":
            print_error(f"Tool error: {tool['result']}")
        else:
            print_tool(f"Executed {tool['name']}: {tool['result']}")

    if final_text:
        print_assistant(final_text)
        await maybe_speak(speech, final_text)

    if any(tool["name"] == "shutdown_system" for tool in tools_executed):
        return False

    return True


async def interactive_cli(jarvis, speech=None):
    history = InputHistory(HISTORY_FILE)
    print_banner()
    welcome_msg = "At your service, sir. Systems are fully operational."
    print_assistant(welcome_msg)
    await maybe_speak(speech, welcome_msg)

    while True:
        try:
            loop = asyncio.get_running_loop()
            user_input = await loop.run_in_executor(None, read_input_with_history, build_prompt(), history)
        except KeyboardInterrupt:
            print()
            print_assistant("Goodbye, sir.")
            break
        except EOFError:
            print()
            print_assistant("Session terminated, sir.")
            break

        normalized = user_input.strip()
        lowered = normalized.lower()

        if not normalized:
            continue

        history.add(normalized)

        if lowered in {"/exit", "/quit", "exit", "quit", "goodnight jarvis"}:
            goodbye = "Goodnight, sir. Systems powering down."
            print_assistant(goodbye)
            await maybe_speak(speech, goodbye)
            break
        if lowered == "/help":
            print_help()
            continue
        if lowered.startswith("/models"):
            handle_models_command(normalized, jarvis)
            continue
        if lowered == "/history":
            print_history(history)
            continue
        if lowered == "/history clear":
            history.clear()
            print_info("CLI command history cleared.")
            continue
        if lowered == "/clear":
            jarvis.clear_history()
            print_info("Conversation history cleared.")
            continue
        if lowered == "/provider":
            jarvis.load_engines()
            provider = jarvis.provider or "none"
            model_name = getattr(jarvis, "model_name", "unknown")
            priority = ",".join(getattr(jarvis, "provider_priority", [])) or "unset"
            print_info(f"Provider: {provider} | Model: {model_name} | Priority: {priority}")
            continue
        if lowered == "/speech on":
            if speech is None:
                try:
                    speech = init_speech()
                    print_info("Speech output enabled.")
                except Exception as exc:
                    print_warning(f"Could not enable speech: {exc}")
            else:
                print_info("Speech output is already enabled.")
            continue
        if lowered == "/speech off":
            if speech is not None:
                speech.stop()
                speech = None
                print_info("Speech output disabled.")
            else:
                print_info("Speech output is already disabled.")
            continue

        try:
            keep_running = await run_turn(jarvis, normalized, speech)
            if not keep_running:
                break
        except KeyboardInterrupt:
            print()
            print_assistant("Goodbye, sir.")
            break
        except Exception as exc:
            print_error(f"Unexpected error: {exc}")


async def main():
    args = build_parser().parse_args()
    cli_history = InputHistory(HISTORY_FILE)

    if args.groq:
        os.environ["GROQ_API_KEY"] = args.groq
    if args.gemini:
        os.environ["GOOGLE_API_KEY"] = args.gemini
    if args.llama_cpp:
        os.environ["LLAMA_CPP_ENABLED"] = "true"
    if args.llama_cpp_model:
        os.environ["LLAMA_CPP_MODEL_PATH"] = args.llama_cpp_model
    if args.provider_priority:
        os.environ["AI_PROVIDER_PRIORITY"] = args.provider_priority

    try:
        jarvis = JARVISEngine()
    except Exception as exc:
        print_error(str(exc))
        return

    if args.clear_history:
        jarvis.clear_history()
        cli_history.clear()
        print_info("Conversation and CLI history cleared.")

    speech = None
    if args.speak:
        try:
            speech = init_speech()
        except Exception as exc:
            print_warning(f"Speech could not be enabled: {exc}")

    if args.prompt:
        cli_history.add(args.prompt)
        if args.prompt.strip().lower().startswith("/models"):
            handle_models_command(args.prompt.strip(), jarvis)
            return
        if args.prompt.strip().lower() == "/provider":
            jarvis.load_engines()
            provider = jarvis.provider or "none"
            model_name = getattr(jarvis, "model_name", "unknown")
            priority = ",".join(getattr(jarvis, "provider_priority", [])) or "unset"
            print_info(f"Provider: {provider} | Model: {model_name} | Priority: {priority}")
            return
        await run_turn(jarvis, args.prompt, speech)
        return

    await interactive_cli(jarvis, speech)


if __name__ == "__main__":
    asyncio.run(main())
