from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import requests

app = Flask(__name__)
CORS(app, origins="http://localhost:5173")
load_dotenv()

@app.route('/', methods=['GET'])
def getAirport():
    url = 'https://aeroapi.flightaware.com/aeroapi/airports/DNMM'
    headers = {
        'x-apikey': os.getenv('API_KEY'),
        'Content-Type': 'application/json'
    }
    response = requests.get(url, headers=headers)
    airport_data = response.json()
    return airport_data

@app.route('/departures', methods=['GET'])
def getDepartures():
    url = 'https://aeroapi.flightaware.com/aeroapi/airports/DNMM/flights/departures'
    headers = {
        'x-apikey': os.getenv('API_KEY'),
        'Content-Type': 'application/json'
    }
    response = requests.get(url, headers=headers)
    airport_data = response.json()
    return airport_data

@app.route('/arrivals', methods=['GET'])
def getArrivals():
    url = 'https://aeroapi.flightaware.com/aeroapi/airports/DNMM/flights/arrivals'
    headers = {
        'x-apikey': os.getenv('API_KEY'),
        'Content-Type': 'application/json'
    }
    response = requests.get(url, headers=headers)
    airport_data = response.json()
    return airport_data

@app.route('/airline/<id>', methods=['GET'])
def getAirline(id):
    url = f'https://aeroapi.flightaware.com/aeroapi/operators/{id}'
    headers = {
    'x-apikey': os.getenv('API_KEY'),
    'Content-Type': 'application/json'
    }
    response = requests.get(url, headers=headers)
    airport_data = response.json()
    return airport_data

if __name__ == '__main__':
    app.run(debug=True)
