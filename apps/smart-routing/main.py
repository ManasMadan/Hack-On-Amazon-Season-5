from flask import Flask, request, jsonify
import pandas as pd
import pickle
from datetime import datetime
from dateutil import parser

app = Flask(__name__)

# Load the trained model
try:
    with open('payment_model.pkl', 'rb') as f:
        model = pickle.load(f)
except FileNotFoundError:
    app.logger.error("Model file 'payment_model.pkl' not found")
    raise FileNotFoundError("Model file 'payment_model.pkl' not found")
except Exception as e:
    app.logger.error(f"Error loading model: {str(e)}")
    raise Exception(f"Error loading model: {str(e)}")

# Define expected feature columns from the model (exact order)
feature_columns = [
    'hour', 'day_of_week',
    'payment_method_bank', 'payment_method_credit_card',
    'payment_method_debit_card', 'payment_method_upi_id'
]

@app.route('/best_payment', methods=['POST'])
def best_payment():
    """Predict the best payment method based on timestamp."""
    try:
        # Validate JSON payload
        data = request.json
        if not isinstance(data, dict):
            return jsonify({'error': 'Invalid JSON payload: dictionary required'}), 400

        # Get timestamp from payload or default to current time
        timestamp_str = data.get('timestamp')
        if not timestamp_str:
            dt = datetime.now()  # Default to 07:25 AM IST, Sunday, June 22, 2025
            timestamp_str = dt.isoformat()
            used_default = True
        else:
            if not isinstance(timestamp_str, str):
                return jsonify({'error': 'Timestamp must be a string in ISO 8601 format, e.g., 2025-06-22T07:25:00'}), 400
            try:
                # Parse flexible timestamp formats
                dt = parser.parse(timestamp_str)
            except ValueError as e:
                return jsonify({'error': f'Invalid timestamp format: {str(e)}. Use ISO 8601, e.g., 2025-06-22T07:25:00'}), 400
            used_default = False

        # Extract time features
        hour = dt.hour
        day_of_week = dt.weekday()  # Correctly extract day of week (0=Monday, 6=Sunday)

        # Prepare input data for all payment methods
        payment_methods = ['debit_card', 'credit_card', 'bank', 'upi_id']
        input_df = pd.DataFrame({
            'hour': [hour] * 4,
            'day_of_week': [day_of_week] * 4,
            'payment_method': payment_methods
        })
        input_df = pd.get_dummies(input_df, columns=['payment_method'])

        # Ensure input_df has all expected columns in the correct order
        for col in feature_columns:
            if col not in input_df.columns:
                input_df[col] = 0
        input_df = input_df[feature_columns]

        # Verify feature names match
        if list(input_df.columns) != feature_columns:
            return jsonify({'error': f'Feature names mismatch: expected {feature_columns}, got {list(input_df.columns)}'}), 500

        # Predict probabilities
        probs = model.predict_proba(input_df)[:, 1]

        # Find best payment method
        best_idx = probs.argmax()
        best_payment_method = payment_methods[best_idx]
        best_score = round(float(probs[best_idx]), 2)

        # Prepare response with all probabilities
        response = {
            'timestamp': timestamp_str,
            'best_payment_method': best_payment_method,
            'score': best_score,
            'probs': {method: round(float(prob), 2) for method, prob in zip(payment_methods, probs)}
        }
        if used_default:
            response['note'] = 'No timestamp provided; used current server time'

        return jsonify(response)

    except Exception as e:
        app.logger.error(f"Error processing request: {str(e)}")
        return jsonify({'error': f'Internal error: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)