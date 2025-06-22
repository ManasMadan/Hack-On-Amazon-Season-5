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

# File for persistent storage
USERS_DATA_FILE = Path("users_data.json")

# Similarity threshold for authentication
SIMILARITY_THRESHOLD = 0.85  # Adjust based on testing

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

        os.remove(temp_audio_path)
        return audio, sr

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch or load audio: {str(e)}")
    finally:
        if 'response' in locals():
            response.close()
            response.release_conn()

class UserRegister(BaseModel):
    user_id: str
    minio_path: str

class UserAuthenticate(BaseModel):
    user_id: str
    minio_path: str

@app.post("/user")
def register_user(user: UserRegister):
    """Register a new user with audio sample."""
    audio, sr = load_audio_from_minio(user.minio_path)

    # Extract embeddings
    with torch.no_grad():
        outputs = wav2vec2_model(audio, output_hidden_states=True)
        embeddings = outputs.hidden_states[-1].mean(dim=1)
    embeddings = embeddings.numpy().tolist()  # Convert to list for JSON serialization

    # Update users data
    users_data = load_users_data()
    if user.user_id not in users_data:
        users_data[user.user_id] = []
    users_data[user.user_id].append((embeddings, user.minio_path))
    save_users_data(users_data)

    return {"message": "User registered successfully", "minio_path": user.minio_path}


@app.delete("/user")
def delete_user_sample(user: UserRegister):
    """Delete a user's audio sample."""
    # Update users data
    users_data = load_users_data()
    if user.user_id not in users_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Find and remove the sample with matching minio_path
    users_data[user.user_id] = [(emb, path) for emb, path in users_data[user.user_id] 
                               if path != user.minio_path]
    save_users_data(users_data)

    return {"message": "User sample deleted successfully", "minio_path": user.minio_path}


@app.get("/user")
def get_user_audio_samples(user_id: str):
    """Retrieve audio sample paths for a user."""
    users_data = load_users_data()
    if user_id not in users_data:
        raise HTTPException(status_code=404, detail="User not found")
    paths = [path for _, path in users_data[user_id]]
    return {"minio_paths": paths}

@app.post("/user/authenticate")
def authenticate_user(user: UserAuthenticate):
    """Authenticate a user with audio sample using cosine similarity."""
    users_data = load_users_data()
    if user.user_id not in users_data or not users_data[user.user_id]:
        raise HTTPException(status_code=400, detail="User not registered or no samples available")

    audio, sr = load_audio_from_minio(user.minio_path)

    # Extract embeddings
    with torch.no_grad():
        outputs = wav2vec2_model(audio, output_hidden_states=True)
        current_embedding = outputs.hidden_states[-1].mean(dim=1).detach().numpy().flatten().reshape(1, -1)
    
    # Compare with stored embeddings using cosine similarity
    max_similarity = 0.0
    for stored_embedding, _ in users_data[user.user_id]:
        stored_embedding = np.array(stored_embedding).flatten().reshape(1, -1)
        similarity = float(cosine_similarity(current_embedding, stored_embedding)[0][0])
        max_similarity = max(max_similarity, similarity)
    
    is_authenticated = bool(max_similarity >= SIMILARITY_THRESHOLD)

    return {"authenticated": is_authenticated, 
            "similarity_score": float(max_similarity),
            "minio_path": user.minio_path}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=3533,
        workers=1,
        log_level="info"
    )
