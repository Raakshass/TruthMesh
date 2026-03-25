"""Observability and structured logging setup.

Prepares logging format for integration with Azure Monitor / Application Insights.
"""
import logging
import json
import os
from datetime import datetime

def configure_opentelemetry():
    """Configures Azure Monitor OpenTelemetry if the connection string is present."""
    conn_string = os.getenv("APPLICATIONINSIGHTS_CONNECTION_STRING")
    if conn_string:
        try:
            from azure.monitor.opentelemetry import configure_azure_monitor
            configure_azure_monitor(connection_string=conn_string)
            print("Azure Monitor OpenTelemetry configured successfully.")
        except ImportError:
            pass
        except Exception as e:
            print(f"Failed to configure Azure Monitor: {e}")

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_obj = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        
        # Add extra dimensions if provided
        if hasattr(record, "custom_dimensions"):
            log_obj.update(record.custom_dimensions)
            
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)
            
        return json.dumps(log_obj)

def setup_logging():
    """Configure structured JSON logging for the application."""
    logger = logging.getLogger("truthmesh")
    logger.setLevel(logging.INFO)
    
    # Prevent duplicate handlers
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(JSONFormatter())
        logger.addHandler(handler)
        
    return logger

configure_opentelemetry()
logger = setup_logging()
