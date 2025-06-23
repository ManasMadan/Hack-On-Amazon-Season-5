from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from minio import Minio
from transformers import Wav2Vec2ConformerForPreTraining
import torch
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import torchaudio
import uvicorn
import tempfile
import os
import json
from pathlib import Path
from dotenv import load_dotenv
import speech_recognition as sr
import re

# Load environment variables from .env file
load_dotenv()

app = FastAPI()

# Initialize MinIO client using environment variables
minio_client = Minio(
    endpoint=f"{os.getenv('MINIO_ENDPOINT', 'localhost')}:{os.getenv('MINIO_PORT', '9000')}",
    access_key=os.getenv("MINIO_ROOT_USER"),
    secret_key=os.getenv("MINIO_ROOT_PASSWORD"),
    secure=os.getenv("MINIO_USE_SSL", "False").lower() == "true"
)

# Initialize transformer models
wav2vec2_model = Wav2Vec2ConformerForPreTraining.from_pretrained("facebook/wav2vec2-conformer-rel-pos-large")

# Initialize speech recognition
recognizer = sr.Recognizer()

# File for persistent storage
USERS_DATA_FILE = Path("users_data.json")

# Thresholds
VOICE_SIMILARITY_THRESHOLD = 0.75  # Reduced since PIN has more weight
PIN_WEIGHT = 0.7  # PIN contributes 70%
VOICE_WEIGHT = 0.3  # Voice contributes 30%
COMBINED_THRESHOLD = 0.85  # Combined score threshold

def load_users_data():
    """Load users data from JSON file."""
    if USERS_DATA_FILE.exists():
        with open(USERS_DATA_FILE, "r") as f:
            return json.load(f)
    return {}

def save_users_data(data):
    """Save users data to JSON file."""
    with open(USERS_DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)

def extract_pin_from_audio(audio_path):
    """Extract PIN from audio using speech recognition."""
    try:
        with sr.AudioFile(audio_path) as source:
            audio_data = recognizer.record(source)
            text = recognizer.recognize_google(audio_data)
            
            # Extract digits from the recognized text
            digits = re.findall(r'\d+', text)
            if digits:
                return ''.join(digits)
            return None
    except Exception as e:
        print(f"Error in speech recognition: {e}")
        return None

def load_audio_from_minio(minio_path):
    """Load and process audio from MinIO."""
    try:
        response = minio_client.get_object(os.getenv("MINIO_VOICE_BUCKET_NAME", "voice-auth"), minio_path)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
            tmp_file.write(response.read())
            temp_audio_path = tmp_file.name

        audio, sr = torchaudio.load(temp_audio_path)

        if sr != 16000:
            resampler = torchaudio.transforms.Resample(orig_freq=sr, new_freq=16000)
            audio = resampler(audio)
            sr = 16000

        # Extract PIN from audio
        extracted_pin = extract_pin_from_audio(temp_audio_path)
        
        os.remove(temp_audio_path)
        return audio, sr, extracted_pin

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch or load audio: {str(e)}")
    finally:
        if 'response' in locals():
            response.close()
            response.release_conn()

class UserRegister(BaseModel):
    user_id: str
    minio_path: str
    pin: str

class UserAuthenticate(BaseModel):
    user_id: str
    minio_path: str

@app.post("/user")
def register_user(user: UserRegister):
    """Register a new user with audio sample and PIN."""
    audio, sr, extracted_pin = load_audio_from_minio(user.minio_path)
    
    # Verify that the extracted PIN matches the provided PIN
    if extracted_pin != user.pin:
        raise HTTPException(
            status_code=400, 
            detail=f"PIN mismatch. Expected: {user.pin}, Extracted: {extracted_pin}"
        )

    # Extract embeddings
    with torch.no_grad():
        outputs = wav2vec2_model(audio, output_hidden_states=True)
        embeddings = outputs.hidden_states[-1].mean(dim=1)
    embeddings = embeddings.numpy().tolist()

    # Update users data
    users_data = load_users_data()
    if user.user_id not in users_data:
        users_data[user.user_id] = {
            "pin": user.pin,
            "samples": []
        }
    
    users_data[user.user_id]["samples"].append((embeddings, user.minio_path))
    save_users_data(users_data)

    return {
        "message": "User registered successfully", 
        "minio_path": user.minio_path,
        "extracted_pin": extracted_pin
    }

@app.delete("/user")
def delete_user_sample(user: UserRegister):
    """Delete a user's audio sample."""
    users_data = load_users_data()
    if user.user_id not in users_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Find and remove the sample with matching minio_path
    users_data[user.user_id]["samples"] = [
        (emb, path) for emb, path in users_data[user.user_id]["samples"] 
        if path != user.minio_path
    ]
    save_users_data(users_data)

    return {"message": "User sample deleted successfully", "minio_path": user.minio_path}

@app.get("/user")
def get_user_audio_samples(user_id: str):
    """Retrieve audio sample paths for a user."""
    users_data = load_users_data()
    if user_id not in users_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    paths = [path for _, path in users_data[user_id]["samples"]]
    return {"minio_paths": paths}

@app.post("/user/authenticate")
def authenticate_user(user: UserAuthenticate):
    """Authenticate a user with audio sample using voice similarity and PIN matching."""
    users_data = load_users_data()
    if user.user_id not in users_data or not users_data[user.user_id]["samples"]:
        raise HTTPException(status_code=400, detail="User not registered or no samples available")

    audio, sr, extracted_pin = load_audio_from_minio(user.minio_path)
    
    # Get stored PIN
    stored_pin = users_data[user.user_id]["pin"]
    
    # Calculate PIN match score
    pin_match_score = 1.0 if extracted_pin == stored_pin else 0.0
    
    # Extract voice embeddings
    with torch.no_grad():
        outputs = wav2vec2_model(audio, output_hidden_states=True)
        current_embedding = outputs.hidden_states[-1].mean(dim=1).detach().numpy().flatten().reshape(1, -1)
    
    # Compare with stored voice embeddings
    max_voice_similarity = 0.0
    for stored_embedding, _ in users_data[user.user_id]["samples"]:
        stored_embedding = np.array(stored_embedding).flatten().reshape(1, -1)
        similarity = float(cosine_similarity(current_embedding, stored_embedding)[0][0])
        max_voice_similarity = max(max_voice_similarity, similarity)
    
    # Calculate combined score (PIN weighted more heavily)
    combined_score = (PIN_WEIGHT * pin_match_score) + (VOICE_WEIGHT * max_voice_similarity)
    
    is_authenticated = bool(combined_score >= COMBINED_THRESHOLD)

    return {
        "authenticated": is_authenticated,
        "combined_score": float(combined_score),
        "pin_match": pin_match_score == 1.0,
        "voice_similarity": float(max_voice_similarity),
        "extracted_pin": extracted_pin,
        "expected_pin": stored_pin,
        "minio_path": user.minio_path
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=3533,
        workers=1,
        log_level="info"
    )
