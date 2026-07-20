import json
import os

from skills.app_launcher import launch_app
from skills.file_manager import create_folder, list_files, open_path
from skills.system_info import get_system_summary
from skills.volume_control import get_volume, mute, set_volume
from skills.web_search import web_search


def execute_tool(tool_name, args):
    """Map tool names emitted by the model to local Python functions."""
    if tool_name == "set_volume":
        return set_volume(args.get("level", 50))
    if tool_name == "create_folder":
        path = args.get("path", os.getcwd())
        return create_folder(path, args.get("folder_name", "New Folder"))
    if tool_name == "launch_app":
        return launch_app(args.get("app_name", ""))
    if tool_name == "list_files":
        path = args.get("path", os.getcwd())
        return list_files(path)
    if tool_name == "get_system_summary":
        return get_system_summary()
    if tool_name == "web_search":
        return web_search(args.get("query", ""))
    if tool_name == "shutdown_system":
        return "Shutting down systems, sir. Goodnight."
    if tool_name == "open_debug_console":
        os.system('start "JARVIS Debug Console" cmd /k "powershell Get-Content jarvis.log -Wait"')
        return "Opening debugging console, sir. All system logs are now being streamed."
    if tool_name == "close_debug_console":
        os.system('taskkill /F /FI "WINDOWTITLE eq JARVIS Debug Console*"')
        return "Terminating debug console, sir. Normal operational parameters restored."
    if tool_name == "open_path":
        return open_path(args.get("path", os.getcwd()))
    if tool_name == "get_volume":
        return get_volume()
    if tool_name == "mute":
        return mute()
    return f"Tool {tool_name} is not recognized, sir."


def process_response(response_text):
    """Extract tool calls from a model response, execute them, and return clean text."""
    lines = response_text.splitlines()
    clean_text_lines = []
    tools_executed = []

    for line in lines:
        if line.startswith("TOOL_CALL:"):
            try:
                tool_json = line.replace("TOOL_CALL:", "", 1).strip()
                tool_data = json.loads(tool_json)
                tool_name = tool_data["name"]
                tool_args = tool_data.get("args", {})
                result = execute_tool(tool_name, tool_args)
                tools_executed.append({"name": tool_name, "result": result})
            except Exception as exc:
                tools_executed.append({"name": "error", "result": str(exc)})
        else:
            clean_text_lines.append(line)

    final_text = "\n".join(clean_text_lines).strip()
    return final_text, tools_executed
