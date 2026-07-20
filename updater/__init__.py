"""
J.A.R.V.I.S. Updater Module
A modular updater system with version detection, backup, rollback, and smart dependency management.
"""

from .version_checker import VersionChecker
from .backup_manager import BackupManager
from .rollback import RollbackManager
from .dependency_manager import DependencyManager
from .update_manifest import UpdateManifest

__all__ = [
    'VersionChecker',
    'BackupManager', 
    'RollbackManager',
    'DependencyManager',
    'UpdateManifest'
]
