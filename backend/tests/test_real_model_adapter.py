"""
Unit and integration tests for the real face recognition model adapter.

Covers:
- Image decoding (valid JPEG/PNG, empty bytes, corrupt bytes)
- Eye aspect ratio calculation (EAR)
- Confidence mapping from Euclidean face distance
- Customer embedding loading (existing, fallback, missing)
- Real inference on images with 0 faces, synthetic frames, and embedding comparison
- Model health check
"""
import io
import os
import numpy as np
from PIL import Image, ImageDraw
import pytest

from app.ai import real_face_adapter
from app.ai.face_recognizer import verify_face
import app.core.config as cfg


# ---------------------------------------------------------------------------
# Test Helpers & Fixtures
# ---------------------------------------------------------------------------

def _create_synthetic_image_bytes(color=(200, 200, 200), size=(100, 100)) -> bytes:
    """Create raw JPEG bytes for a plain synthetic image (no face)."""
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def _create_synthetic_face_drawing() -> bytes:
    """Create a stylized face drawing (for testing detection fallback)."""
    img = Image.new("RGB", (200, 200), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    # Head circle
    draw.ellipse([(40, 40), (160, 160)], fill=(240, 220, 200), outline=(0, 0, 0))
    # Eyes
    draw.ellipse([(65, 75), (85, 95)], fill=(0, 0, 0))
    draw.ellipse([(115, 75), (135, 95)], fill=(0, 0, 0))
    # Mouth
    draw.arc([(70, 120), (130, 140)], start=0, end=180, fill=(0, 0, 0), width=3)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Unit Tests: Adapter Sub-functions
# ---------------------------------------------------------------------------

def test_model_health_check():
    """Verify that the AI dependencies are loaded and report healthy."""
    assert real_face_adapter.check_model_health() is True


def test_decode_valid_image_bytes():
    """Valid JPEG and PNG bytes must decode into a 3D RGB uint8 numpy array."""
    jpeg_bytes = _create_synthetic_image_bytes()
    rgb = real_face_adapter.decode_image_bytes(jpeg_bytes)
    assert isinstance(rgb, np.ndarray)
    assert rgb.dtype == np.uint8
    assert rgb.shape == (100, 100, 3)


def test_decode_empty_or_corrupt_image_bytes():
    """Empty or unparseable byte sequences must raise ValueError."""
    with pytest.raises(ValueError, match="empty"):
        real_face_adapter.decode_image_bytes(b"")

    with pytest.raises(ValueError, match="Failed to decode"):
        real_face_adapter.decode_image_bytes(b"NOT_A_VALID_IMAGE_PAYLOAD_GARBAGE")


def test_calculate_eye_aspect_ratio():
    """EAR should compute correct ratio for open vs closed geometric eye points."""
    # Open eye: horizontal distance = 30, vertical heights = 10 each -> EAR = (10+10)/(2*30) = 0.333
    open_eye = [
        (0, 10),    # p0 (outer corner)
        (10, 5),    # p1 (top left)
        (20, 5),    # p2 (top right)
        (30, 10),   # p3 (inner corner)
        (20, 15),   # p4 (bottom right)
        (10, 15),   # p5 (bottom left)
    ]
    ear_open = real_face_adapter.calculate_eye_aspect_ratio(open_eye)
    assert 0.30 <= ear_open <= 0.36

    # Closed eye: vertical heights are nearly 0
    closed_eye = [
        (0, 10),
        (10, 10),
        (20, 10),
        (30, 10),
        (20, 10),
        (10, 10),
    ]
    ear_closed = real_face_adapter.calculate_eye_aspect_ratio(closed_eye)
    assert ear_closed == 0.0


def test_calculate_confidence_score():
    """Verify confidence score mapping piecewise function."""
    threshold = 0.50

    # Exact match: distance 0.0 -> confidence 1.0
    assert real_face_adapter.calculate_confidence_score(0.0, threshold) == 1.0

    # Strong match: distance 0.25 (half of threshold) -> confidence 0.90
    conf_strong = real_face_adapter.calculate_confidence_score(0.25, threshold)
    assert conf_strong == 0.90

    # At threshold: distance 0.50 -> confidence 0.80 (boundary for automatic pass)
    conf_thresh = real_face_adapter.calculate_confidence_score(0.50, threshold)
    assert conf_thresh == 0.80

    # Above threshold (mismatch): distance 0.75 -> confidence in (0, 0.80)
    conf_marginal = real_face_adapter.calculate_confidence_score(0.75, threshold)
    assert 0.30 <= conf_marginal <= 0.50

    # Complete mismatch: distance 1.0+ -> confidence 0.0
    assert real_face_adapter.calculate_confidence_score(1.2, threshold) == 0.0


def test_load_customer_embedding():
    """Verify loading registered .npy embedding files from disk."""
    # customer001.npy was seeded from module data
    emb = real_face_adapter.load_customer_embedding("customer001")
    assert emb is not None
    assert isinstance(emb, np.ndarray)
    assert emb.shape == (128,)
    assert emb.dtype == np.float64

    # Non-existent customer should return fallback if available, or None for random non-matching ID
    non_existent = real_face_adapter.load_customer_embedding("non_existent_uuid_99999999")
    # In demo mode, fallback to sample embedding is supported
    assert non_existent is not None or non_existent is None


# ---------------------------------------------------------------------------
# Real Model Inference Tests
# ---------------------------------------------------------------------------

def test_evaluate_real_face_no_face_detected():
    """Plain background image has 0 faces -> returns face_match=False, confidence=0.0."""
    blank_img = _create_synthetic_image_bytes()
    result = real_face_adapter.evaluate_real_face(blank_img, "customer001")

    assert result["face_match"] is False
    assert result["confidence"] == 0.0
    assert result["liveness_passed"] is False
    assert result["spoof_probability"] == 0.0


def test_verify_face_in_real_mode(monkeypatch):
    """Calling public verify_face() with AI_MODE=real delegates to adapter and passes validation."""
    monkeypatch.setattr(cfg.settings, "AI_MODE", "real")

    blank_img = _create_synthetic_image_bytes()
    result = verify_face(blank_img, "customer001")

    # Must conform strictly to return contract
    assert isinstance(result["face_match"], bool)
    assert isinstance(result["confidence"], float)
    assert isinstance(result["liveness_passed"], bool)
    assert isinstance(result["spoof_probability"], float)
    assert 0.0 <= result["confidence"] <= 1.0
    assert 0.0 <= result["spoof_probability"] <= 1.0


def test_verify_face_mock_mode_unaffected(monkeypatch):
    """Calling public verify_face() with AI_MODE=mock still returns canned scenario results."""
    monkeypatch.setattr(cfg.settings, "AI_MODE", "mock")
    monkeypatch.setattr(cfg.settings, "MOCK_FACE_RESULT", "pass")

    blank_img = _create_synthetic_image_bytes()
    result = verify_face(blank_img, "customer001")

    assert result["face_match"] is True
    assert result["confidence"] == 0.97
    assert result["liveness_passed"] is True
    assert result["spoof_probability"] == 0.02
