"""
Rollback Manager Module
Handles rollback operations when updates fail.
"""

import os
import shutil
from typing import Tuple, Optional


class RollbackManager:
    """Manages rollback operations for failed updates."""
    
    def __init__(self, base_dir: str, backup_manager):
        """
        Initialize RollbackManager.
        
        Args:
            base_dir: Base directory of JARVIS installation
            backup_manager: BackupManager instance for backup operations
        """
        self.base_dir = base_dir
        self.backup_manager = backup_manager
        self.state_file = os.path.join(base_dir, "backup", "update_state.json")
    
    def save_pre_update_state(self, backup_path: str) -> Tuple[bool, str]:
        """
        Save the state before update begins.
        
        Args:
            backup_path: Path to the backup created before update
            
        Returns:
            Tuple of (success, message)
        """
        try:
            import json
            from datetime import datetime
            
            state = {
                "backup_path": backup_path,
                "timestamp": datetime.now().isoformat(),
                "status": "pre_update"
            }
            
            os.makedirs(os.path.dirname(self.state_file), exist_ok=True)
            with open(self.state_file, 'w') as f:
                json.dump(state, f, indent=2)
            
            print(f"[OK] Pre-update state saved")
            return True, "Pre-update state saved"
            
        except Exception as e:
            error_msg = f"Failed to save pre-update state: {str(e)}"
            print(f"[ERROR] {error_msg}")
            return False, error_msg
    
    def mark_update_complete(self) -> Tuple[bool, str]:
        """
        Mark the update as complete.
        
        Returns:
            Tuple of (success, message)
        """
        try:
            import json
            from datetime import datetime
            
            if os.path.exists(self.state_file):
                with open(self.state_file, 'r') as f:
                    state = json.load(f)
                
                state["status"] = "complete"
                state["complete_timestamp"] = datetime.now().isoformat()
                
                with open(self.state_file, 'w') as f:
                    json.dump(state, f, indent=2)
                
                print(f"[OK] Update marked as complete")
                return True, "Update marked as complete"
            
            return True, "No state file found (update may not have started)"
            
        except Exception as e:
            error_msg = f"Failed to mark update complete: {str(e)}"
            print(f"[ERROR] {error_msg}")
            return False, error_msg
    
    def mark_update_failed(self) -> Tuple[bool, str]:
        """
        Mark the update as failed.
        
        Returns:
            Tuple of (success, message)
        """
        try:
            import json
            from datetime import datetime
            
            if os.path.exists(self.state_file):
                with open(self.state_file, 'r') as f:
                    state = json.load(f)
                
                state["status"] = "failed"
                state["failed_timestamp"] = datetime.now().isoformat()
                
                with open(self.state_file, 'w') as f:
                    json.dump(state, f, indent=2)
                
                print(f"[OK] Update marked as failed")
                return True, "Update marked as failed"
            
            return True, "No state file found"
            
        except Exception as e:
            error_msg = f"Failed to mark update failed: {str(e)}"
            print(f"[ERROR] {error_msg}")
            return False, error_msg
    
    def get_update_state(self) -> Optional[dict]:
        """
        Get the current update state.
        
        Returns:
            State dictionary or None if no state file exists
        """
        try:
            import json
            
            if os.path.exists(self.state_file):
                with open(self.state_file, 'r') as f:
                    return json.load(f)
            
            return None
            
        except Exception as e:
            print(f"[ERROR] Failed to read update state: {str(e)}")
            return None
    
    def perform_rollback(self) -> Tuple[bool, str]:
        """
        Perform a rollback to the pre-update state.
        
        Returns:
            Tuple of (success, message)
        """
        state = self.get_update_state()
        
        if not state:
            print("[WARN] No update state found, attempting to restore from latest backup")
            latest_backup = self.backup_manager.get_latest_backup()
            if not latest_backup:
                return False, "No backup available for rollback"
            return self.backup_manager.restore_backup(latest_backup)
        
        if state.get("status") == "complete":
            return False, "Update already completed, rollback not needed"
        
        backup_path = state.get("backup_path")
        if not backup_path or not os.path.exists(backup_path):
            print("[WARN] Backup path not found in state, trying latest backup")
            latest_backup = self.backup_manager.get_latest_backup()
            if not latest_backup:
                return False, "No backup available for rollback"
            return self.backup_manager.restore_backup(latest_backup)
        
        # Extract backup name from path
        backup_name = os.path.basename(backup_path)
        success, message = self.backup_manager.restore_backup(backup_name)
        
        if success:
            print("[OK] Rollback completed successfully")
        else:
            print(f"[ERROR] Rollback failed: {message}")
        
        return success, message
    
    def cleanup_after_rollback(self) -> Tuple[bool, str]:
        """
        Clean up state files after a successful rollback.
        
        Returns:
            Tuple of (success, message)
        """
        try:
            if os.path.exists(self.state_file):
                os.remove(self.state_file)
                print("[OK] Cleaned up update state file")
            
            return True, "Cleanup completed"
            
        except Exception as e:
            error_msg = f"Cleanup failed: {str(e)}"
            print(f"[ERROR] {error_msg}")
            return False, error_msg
