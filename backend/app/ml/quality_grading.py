"""
Produce Quality Grading Module — YOLOv8 / Computer Vision Pipeline.

Analyzes uploaded crop images for:
  - Produce classification (wheat, onion, potato, tomato, cotton)
  - Visible defect detection (discoloration, pest damage, size uniformity)
  - Quality grade estimation (Grade A, Grade B, Grade C)
  - Confidence score
"""
from __future__ import annotations

import random
from pathlib import Path


def analyze_produce_quality(image_bytes: bytes | None = None, filename: str = "sample_crop.jpg") -> dict:
    """Simulates YOLOv8 computer vision inference on crop image."""
    crop_lower = filename.lower()
    
    detected_crop = "Wheat"
    if "onion" in crop_lower:
        detected_crop = "Onion"
    elif "potato" in crop_lower:
        detected_crop = "Potato"
    elif "cotton" in crop_lower:
        detected_crop = "Cotton"
    elif "tomato" in crop_lower:
        detected_crop = "Tomato"

    # Deterministic simulation based on filename hash or length for reproducible testing
    val = sum(ord(c) for c in filename) % 10
    
    if val < 6:
        grade = "Grade A"
        defects = ["Minor size variation"]
        defect_pct = round(val * 0.8 + 1.2, 1)
        confidence = 0.94
        summary = "Premium produce with high color uniformity and negligible defects."
    elif val < 8:
        grade = "Grade B"
        defects = ["Surface discoloration", "Slight mechanical abrasion"]
        defect_pct = round(val * 1.5 + 3.0, 1)
        confidence = 0.88
        summary = "Good quality suitable for wholesale and processing."
    else:
        grade = "Grade C"
        defects = ["Sprouting", "High size heterogeneity", "Minor pest marks"]
        defect_pct = round(val * 2.2 + 5.0, 1)
        confidence = 0.85
        summary = "Fair quality lot. Recommend discount selling or industrial processor buyer."

    return {
        "filename": filename,
        "detected_crop": detected_crop,
        "quality_grade": grade,
        "defect_percentage": defect_pct,
        "detected_defects": defects,
        "confidence": confidence,
        "summary": summary,
    }
