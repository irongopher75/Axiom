import os
import logging
import joblib # Already in requirements.txt
from typing import Optional, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

class ModelManager:
    """
    Handles loading and versioning of ML models (sklearn, XGBoost, etc.).
    Follows a strict failsafe pattern: if model is missing, falls back 
    to rule-based indicator heuristics.
    """
    
    _MODELS = {}

    @classmethod
    def load_model(cls, strategy_name: str) -> Optional[Any]:
        """
        Loads a serialized model from the data/models directory.
        Returns None if model file is missing or corrupted.
        """
        if strategy_name in cls._MODELS:
            return cls._MODELS[strategy_name]

        model_path = os.path.join(settings.DATA_DIR, "models", f"{strategy_name}.pkl")
        
        if not os.path.exists(model_path):
            logger.info(f"Model file {model_path} not found. Using HEURISTIC mode for {strategy_name}.")
            return None

        try:
            model = joblib.load(model_path)
            cls._MODELS[strategy_name] = model
            logger.info(f"Successfully loaded ML model: {strategy_name}")
            return model
        except Exception as e:
            logger.error(f"Failed to load model {strategy_name}: {e}")
            return None

    @classmethod
    def predict(cls, strategy_name: str, features: Any) -> Optional[Any]:
        """
        Predict using the loaded model.
        """
        model = cls.load_model(strategy_name)
        if model and hasattr(model, "predict"):
            return model.predict(features)
        return None
