from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from minio import Minio
from collections import Counter
from transformers import AutoModelForAudioClassification, Wav2Vec2ConformerForPreTraining, Wav2Vec2FeatureExtractor
import torch
from sklearn.ensemble import GradientBoostingClassifier
import numpy as np
import torchaudio
import uvicorn
import tempfile
import os
import json
import joblib
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = FastAPI()

# Initialize MinIO client using environment variables
minio_client = Minio(
    endpoint=f"{os.getenv('MINIO_HOST', 'localhost')}:{os.getenv('MINIO_PORT', '9000')}",
    access_key=os.getenv("MINIO_ROOT_USER"),
    secret_key=os.getenv("MINIO_ROOT_PASSWORD"),
    secure=os.getenv("MINIO_USE_SSL", "False").lower() == "true"
)

# Initialize transformer models
deepfake_model = AutoModelForAudioClassification.from_pretrained("MelodyMachine/Deepfake-audio-detection-V2")
deepfake_processor = Wav2Vec2FeatureExtractor.from_pretrained("MelodyMachine/Deepfake-audio-detection-V2")
wav2vec2_model = Wav2Vec2ConformerForPreTraining.from_pretrained("facebook/wav2vec2-conformer-rel-pos-large")

# Directories for persistent storage
MODELS_DIR = Path("models")
USERS_DATA_FILE = Path("users_data.json")
MODELS_DIR.mkdir(exist_ok=True)

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
        response = minio_client.get_object(os.getenv("MINIO_BUCKET_NAME", "profile-pictures"), minio_path)
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

def get_training_data(target_user_id):
    """Prepare training data for a user."""
    users_data = load_users_data()
    all_embeddings = []
    all_labels = []
    for uid, data in users_data.items():
        for emb, _ in data:
            label = 1 if uid == target_user_id else 0
            all_embeddings.append(np.array(emb).flatten())
            all_labels.append(label)
    return np.array(all_embeddings), np.array(all_labels)

def train_gbm_for_user(user_id):
    """Train and save GBM model for a user."""
    users_data = load_users_data()
    if user_id not in users_data or len(users_data[user_id]) == 0:
        return

    X, y = get_training_data(user_id)

    if len(set(y)) < 2:
        print(f"Only positive samples for {user_id}, adding dummy negatives for training.")
        n_pos = X.shape[0]
        dummy_negatives = np.random.normal(loc=0.0, scale=1.0, size=X.shape)
        X = np.concatenate([X, dummy_negatives], axis=0)
        y = np.concatenate([y, np.zeros(n_pos, dtype=int)], axis=0)

    gbm = GradientBoostingClassifier()
    gbm.fit(X, y)
    
    # Save model to disk
    model_path = MODELS_DIR / f"{user_id}_gbm.joblib"
    joblib.dump(gbm, model_path)
    print(f"Trained and saved GBM for {user_id}. Label distribution: {Counter(y)}")

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

    # Deepfake detection
    inputs = deepfake_processor(audio.squeeze(0), sampling_rate=sr, return_tensors="pt")
    with torch.no_grad():
        outputs = deepfake_model(**inputs)
        logits = outputs.logits
        predicted_class = torch.argmax(logits, dim=1).item()
    if predicted_class == 1:  # Assuming 1 is fake
        raise HTTPException(status_code=400, detail="Audio is a deepfake")

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

    # Train and save GBM
    train_gbm_for_user(user.user_id)

    return {"message": "User registered successfully", "minio_path": user.minio_path}

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
    """Authenticate a user with audio sample."""
    model_path = MODELS_DIR / f"{user.user_id}_gbm.joblib"
    if not model_path.exists():
        raise HTTPException(status_code=400, detail="User not registered or GBM not trained")

    audio, sr = load_audio_from_minio(user.minio_path)

    # Deepfake detection
    inputs = deepfake_processor(audio.squeeze(0), sampling_rate=sr, return_tensors="pt")
    with torch.no_grad():
        outputs = deepfake_model(**inputs)
        logits = outputs.logits
        predicted_class = torch.argmax(logits, dim=1).item()
    if predicted_class == 1:  # Assuming 1 is fake
        return {"authenticated": False, "reason": "Audio is a deepfake", "minio_path": user.minio_path}

    # Extract embeddings
    with torch.no_grad():
        outputs = wav2vec2_model(audio, output_hidden_states=True)
        embeddings = outputs.hidden_states[-1].mean(dim=1)
    embeddings = embeddings.numpy()

    # Load GBM model
    gbm = joblib.load(model_path)
    prediction = gbm.predict(embeddings.flatten().reshape(1, -1))
    is_authenticated = bool(prediction[0] == 1)

    return {"authenticated": is_authenticated, "minio_path": user.minio_path}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=5002,
        workers=1,
        log_level="info"
    )