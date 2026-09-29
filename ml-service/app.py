from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'service': 'ml-service running'
    })

@app.route('/predict', methods=['POST'])
def predict():
    # Dummy response for now — real Random Forest model comes later
    # at the Risk Predictor slice
    data = request.get_json(silent=True) or {}
    return jsonify({
        'status': 'ok',
        'received': data,
        'riskPercentage': 42,
        'riskTier': 'Medium',
        'note': 'This is a placeholder response — real model not wired yet'
    })

if __name__ == '__main__':
    app.run(port=8000, debug=True)