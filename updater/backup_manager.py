"""
Backup Manager Module
Handles creating and managing backups of critical J.A.R.V.I.S. files.
"""

import shutil
import os
from datetime import datetime
from typing import List, Tuple


class BackupManager:
    """Manages backup operations for critical files."""
    
    def __init__(self, base_dir: str):
        self.base_dir = base_dir
        self.backup_dir = os.path.join(base_dir, "backup")
        self.files_to_backup = [
            "memory.json",
            ".env",
            "profile.json"
        ]
    
    def create_backup(self) -> Tuple[bool, str]:
        """
        Create a timestamped backup of critical files.
        
        Returns:
            Tuple of (success, backup_path or error_message)
        """
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        backup_path = os.path.join(self.backup_dir, timestamp)
        
        try:
            # Create backup directory
            os.makedirs(backup_path, exist_ok=True)
            
            # Copy each critical file if it exists
            backed_up_files = []
            for filename in self.files_to_backup:
                src_file = os.path.join(self.base_dir, filename)
                if os.path.exists(src_file):
                    dest_file = os.path.join(backup_path, filename)
                    shutil.copy2(src_file, dest_file)
                    backed_up_files.append(filename)
                    print(f"[OK] Backed up: {filename}")
            
            if not backed_up_files:
                print("[WARN] No critical files found to backup")
                return True, backup_path
            
            # Create backup manifest
            manifest_path = os.path.join(backup_path, "backup_manifest.txt")
            with open(manifest_path, 'w') as f:
                f.write(f"Backup created: {datetime.now().isoformat()}\n")
                f.write(f"Files backed up: {', '.join(backed_up_files)}\n")
                f.write(f"Backup location: {backup_path}\n")
            
            print(f"[OK] Backup created at: {backup_path}")
            return True, backup_path
            
        except Exception as e:
            error_msg = f"Backup failed: {str(e)}"
            print(f"[ERROR] {error_msg}")
            return False, error_msg
    
    def list_backups(self) -> List[str]:
        """List all available backup directories."""
        if not os.path.exists(self.backup_dir):
            return []
        
        backups = []
        for item in os.listdir(self.backup_dir):
            item_path = os.path.join(self.backup_dir, item)
            if os.path.isdir(item_path):
                backups.append(item)
        
        return sorted(backups, reverse=True)
    
    def get_latest_backup(self) -> str:
        """Get the most recent backup directory."""
        backups = self.list_backups()
        return backups[0] if backups else None
    
    def restore_backup(self, backup_name: str) -> Tuple[bool, str]:
        """
        Restore files from a specific backup.
        
        Args:
            backup_name: Name of the backup directory to restore from
            
        Returns:
            Tuple of (success, message)
        """
        backup_path = os.path.join(self.backup_dir, backup_name)
        
        if not os.path.exists(backup_path):
            return False, f"Backup not found: {backup_name}"
        
        try:
            restored_files = []
            for filename in self.files_to_backup:
                backup_file = os.path.join(backup_path, filename)
                target_file = os.path.join(self.base_dir, filename)
                
                if os.path.exists(backup_file):
                    shutil.copy2(backup_file, target_file)
                    restored_files.append(filename)
                    print(f"[OK] Restored: {filename}")
            
            if not restored_files:
                return False, "No files found in backup"
            
            print(f"[OK] Restored {len(restored_files)} files from backup")
            return True, f"Restored from backup: {backup_name}"
            
        except Exception as e:
            error_msg = f"Restore failed: {str(e)}"
            print(f"[ERROR] {error_msg}")
            return False, error_msg
    
    def cleanup_old_backups(self, keep_count: int = 5) -> Tuple[int, str]:
        """
        Remove old backups, keeping only the most recent ones.
        
        Args:
            keep_count: Number of recent backups to keep
            
        Returns:
            Tuple of (removed_count, message)
        """
        backups = self.list_backups()
        
        if len(backups) <= keep_count:
            return 0, "No old backups to remove"
        
        backups_to_remove = backups[keep_count:]
        removed_count = 0
        
        try:
            for backup_name in backups_to_remove:
                backup_path = os.path.join(self.backup_dir, backup_name)
                shutil.rmtree(backup_path)
                removed_count += 1
                print(f"[OK] Removed old backup: {backup_name}")
            
            return removed_count, f"Removed {removed_count} old backup(s)"
            
        except Exception as e:
            error_msg = f"Cleanup failed: {str(e)}"
            print(f"[ERROR] {error_msg}")
            return removed_count, error_msg
