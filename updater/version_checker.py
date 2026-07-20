"""
Version Checker Module
Handles version detection and comparison for J.A.R.V.I.S. updates.
"""

import subprocess
import json
import os
import urllib.request
import urllib.error
from typing import Tuple, Optional


class VersionChecker:
    """Manages version checking and comparison operations."""
    
    def __init__(self, base_dir: str, repo_dir: str):
        self.base_dir = base_dir
        self.repo_dir = repo_dir
        self.github_repo_url = "https://github.com/Aetex/J.A.R.V.I.S.-AI-Assistant.git"
        self.package_json_path = os.path.join(base_dir, "ui", "package.json")
        self.repo_package_json_path = os.path.join(repo_dir, "ui", "package.json")
    
    def get_current_version(self) -> Optional[str]:
        """Get the current version from local package.json."""
        try:
            if os.path.exists(self.package_json_path):
                with open(self.package_json_path, 'r') as f:
                    data = json.load(f)
                    return data.get("version")
        except Exception as e:
            print(f"[WARN] Could not read current version: {e}")
        return None
    
    def get_latest_version(self) -> Optional[str]:
        """Get the latest version from repository package.json."""
        try:
            # First try to get from local repository clone
            if os.path.exists(self.repo_package_json_path):
                with open(self.repo_package_json_path, 'r') as f:
                    data = json.load(f)
                    return data.get("version")
            
            # If local clone doesn't exist, try to fetch from GitHub API
            print("[*] Local repository not found, checking GitHub API for version...")
            return self.get_latest_version_from_github()
        except Exception as e:
            print(f"[WARN] Could not read latest version: {e}")
        return None
    
    def get_latest_version_from_github(self) -> Optional[str]:
        """Get the latest version from GitHub repository using GitHub API."""
        try:
            # GitHub API endpoint for the repository's package.json
            api_url = "https://api.github.com/repos/Aetex/J.A.R.V.I.S.-AI-Assistant/contents/ui/package.json"
            
            request = urllib.request.Request(api_url)
            request.add_header('User-Agent', 'JARVIS-Updater')
            
            with urllib.request.urlopen(request, timeout=30) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode('utf-8'))
                    # Decode base64 content
                    import base64
                    content = base64.b64decode(data['content']).decode('utf-8')
                    package_data = json.loads(content)
                    return package_data.get("version")
                elif response.status == 403:
                    print("[WARN] GitHub API rate limit exceeded, using local repository version")
                    return None
                else:
                    print(f"[WARN] GitHub API returned status {response.status}")
                    
        except urllib.error.HTTPError as e:
            if e.code == 403:
                print("[WARN] GitHub API rate limit exceeded, using local repository version")
                return None
            print(f"[WARN] Could not fetch from GitHub API: {e}")
        except urllib.error.URLError as e:
            print(f"[WARN] Could not fetch from GitHub API: {e}")
        except Exception as e:
            print(f"[WARN] Could not parse GitHub API response: {e}")
        
        return None
    
    def get_current_commit_hash(self) -> Optional[str]:
        """Get the current commit hash from the local repository."""
        try:
            result = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                cwd=self.repo_dir,
                capture_output=True,
                text=True,
                timeout=30
            )
            if result.returncode == 0:
                return result.stdout.strip()
        except Exception as e:
            print(f"[WARN] Could not get current commit hash: {e}")
        return None
    
    def get_remote_commit_hash(self) -> Optional[str]:
        """Get the latest commit hash from the remote repository."""
        try:
            result = subprocess.run(
                ["git", "ls-remote", "origin", "HEAD"],
                cwd=self.repo_dir,
                capture_output=True,
                text=True,
                timeout=30
            )
            if result.returncode == 0:
                # Parse the output to get the commit hash
                lines = result.stdout.strip().split('\n')
                if lines:
                    return lines[0].split('\t')[0]
        except Exception as e:
            print(f"[WARN] Could not get remote commit hash: {e}")
        return None
    
    def get_git_latest_tag(self) -> Optional[str]:
        """Get the latest git tag from the repository."""
        try:
            result = subprocess.run(
                ["git", "describe", "--tags", "--abbrev=0"],
                cwd=self.repo_dir,
                capture_output=True,
                text=True,
                timeout=30
            )
            if result.returncode == 0:
                return result.stdout.strip()
        except Exception as e:
            print(f"[WARN] Could not get git tag: {e}")
        return None
    
    def check_update_available(self) -> Tuple[bool, str, str]:
        """
        Check if an update is available using both version and commit hash.
        
        Returns:
            Tuple of (update_available, current_version, latest_version)
        """
        current_version = self.get_current_version()
        latest_version = self.get_latest_version()
        
        # First check version changes
        if current_version and latest_version and current_version != latest_version:
            print(f"[INFO] Update available: {current_version} -> {latest_version}")
            return True, current_version, latest_version
        
        # If versions are the same or unavailable, check for new commits
        if os.path.exists(self.repo_dir):
            current_commit = self.get_current_commit_hash()
            remote_commit = self.get_remote_commit_hash()
            
            if current_commit and remote_commit:
                if current_commit != remote_commit:
                    print(f"[INFO] New commits available (version unchanged at {current_version})")
                    return True, current_version or "unknown", current_version or "unknown"
                else:
                    print(f"[OK] Already up to date (version {current_version}, commit {current_commit[:7]})")
                    return False, current_version or "unknown", current_version or "unknown"
        
        # Fallback: if both versions are the same and we couldn't check commits, assume up to date
        if current_version and latest_version and current_version == latest_version:
            print(f"[OK] Already up to date (version {current_version})")
            return False, current_version, latest_version
        
        # If we can't determine versions, check if we should update
        if not current_version or not latest_version:
            print("[WARN] Could not determine versions or commits, assuming up to date")
            return False, current_version or "unknown", latest_version or "unknown"
        
        print(f"[OK] Already up to date (version {current_version})")
        return False, current_version, latest_version
    
    def compare_versions(self, v1: str, v2: str) -> int:
        """
        Compare two version strings.
        
        Returns:
            -1 if v1 < v2, 0 if v1 == v2, 1 if v1 > v2
        """
        try:
            v1_parts = [int(x) for x in v1.split('.')]
            v2_parts = [int(x) for x in v2.split('.')]
            
            for i in range(max(len(v1_parts), len(v2_parts))):
                v1_part = v1_parts[i] if i < len(v1_parts) else 0
                v2_part = v2_parts[i] if i < len(v2_parts) else 0
                
                if v1_part < v2_part:
                    return -1
                elif v1_part > v2_part:
                    return 1
            
            return 0
        except Exception:
            # If version parsing fails, compare as strings
            if v1 < v2:
                return -1
            elif v1 > v2:
                return 1
            return 0
