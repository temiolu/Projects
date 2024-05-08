from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import requests

app = Flask(__name__)
CORS(app)
load_dotenv()

@app.route('/', methods=['GET'])
def getAirport():
    url = 'https://aeroapi.flightaware.com/aeroapi/airports/KIAH'
    headers = {
        'x-apikey': os.getenv('API_KEY'),
        'Content-Type': 'application/json'
    }
    response = requests.get(url, headers=headers)
    airport_data = response.json()
    return airport_data

@app.route('/', methods=['GET'])
def getFlights():
    url = 'https://aeroapi.flightaware.com/aeroapi/airports/KIAH'
    headers = {
        'x-apikey': os.getenv('API_KEY'),
        'Content-Type': 'application/json'
    }
    response = requests.get(url, headers=headers)
    airport_data = response.json()
    return airport_data

if __name__ == '__main__':
    app.run(debug=True)
