from flask import Flask
from flask_cors import CORS
import requests
import geojson
import pandas as pd
import json

app = Flask(__name__)
CORS(app)

def request_process_geojson(url, object_ids):
    features = []

    for i in object_ids:
        response = requests.get(f'{url}{str(i)}?f=pjson')

        feature = response.json()['feature']
        geojson_feature = geojson.Feature(
            geometry=geojson.Polygon(feature['geometry']['rings']), 
            properties=feature['attributes']
            )
        features.append(geojson_feature)
    feature_collection = geojson.FeatureCollection(features)

    return feature_collection

def process_local_geojson(directory, object_ids):
    features = []

    for i in object_ids:
        file_path = f'{directory}/{i}.json'
        with open(file=file_path) as f:
            data = json.load(f)

        feature = data.get('feature', {})
        geojson_feature = geojson.Feature(
            geometry=geojson.Polygon(feature['geometry']['rings']), 
            properties=feature['attributes']
            )
        features.append(geojson_feature)
    feature_collection = geojson.FeatureCollection(features)

    return feature_collection

@app.route('/api/negeri/', methods=['GET'])
def get_negeri():
    try:
        # url = 'https://maps.dosm.gov.my/dosm/rest/services/StatsGeo_asal/MapServer/1/'
        # num_list = [i for i in range(1, 17)]
        # return request_process_geojson(url=url, object_ids=num_list)
        directory = 'data/plan_malaysia_data/processed_data/negeri'
        num_list = [i for i in range(1, 15)]
        return process_local_geojson(directory=directory, object_ids=num_list)
    except Exception as e:
        print(e)
        return {"type": "FeatureCollection", "features": []}

@app.route('/api/daerah-<negeri>', methods=['GET'])
def get_daerah(negeri):
    try:
        df = pd.read_csv('data/plan_malaysia_data/daerah_data_directory.csv')
        object_ids = df['OBJECTID'][df['NEGERI']==negeri].to_list()

        # url = 'https://maps.dosm.gov.my/dosm/rest/services/StatsGeo_asal/MapServer/2/'
        # return request_process_geojson(url=url, object_ids=object_ids)
        directory = 'data/plan_malaysia_data/processed_data/daerah'
        return process_local_geojson(directory=directory, object_ids=object_ids)
    except Exception as e:
        print(e)
        return {"type": "FeatureCollection", "features": []}

@app.route('/api/<mukim>-<negeri>-<daerah>', methods=['GET'])
def get_mukim(mukim, negeri, daerah):
    try:
        df = pd.read_csv('data/plan_malaysia_data/mukim_data_directory.csv')

        if mukim=='mukim':
            object_ids = df['OBJECTID'][(df['NEGERI']==negeri) & (df['DAERAH']==daerah)].to_list()
        else:
            object_ids = df['OBJECTID'][(df['NEGERI']==negeri) & (df['DAERAH']==daerah) & 
                                        (df['MUKIM']==mukim)].to_list()
        directory = 'data/plan_malaysia_data/processed_data/mukim'

        # url = 'https://maps.dosm.gov.my/dosm/rest/services/StatsGeo_asal/MapServer/3/'
        # return request_process_geojson(url=url, object_ids=object_ids)
        return process_local_geojson(directory=directory, object_ids=object_ids)
    except Exception as e:
        print(e)
        return {"type": "FeatureCollection", "features": []}

@app.route('/api/daerah/senarai-negeri', methods=['GET'])
def get_daerah_negeri_list():
    try:
        df = pd.read_csv('data/plan_malaysia_data/daerah_data_directory.csv')
        negeri = df['NEGERI'].unique().tolist()
        return {'result': negeri}
    except Exception as e:
        print(e)
        return {'result': []}

@app.route('/api/mukim/senarai-daerah-<negeri>', methods=['GET'])
def get_mukim_daerah_list(negeri):
    try:
        df = pd.read_csv('data/plan_malaysia_data/mukim_data_directory.csv')
        df = df[(df['NEGERI']==negeri)]
        daerah = df['DAERAH'].unique().tolist()
        return {'result': daerah}
    except Exception as e:
        print(e)
        return {'result': []}
    
@app.route('/api/mukim/senarai-mukim-<negeri>-<daerah>', methods=['GET'])
def get_mukim_mukim_list(negeri, daerah):
    try:
        df = pd.read_csv('data/plan_malaysia_data/mukim_data_directory.csv')
        df = df[(df['NEGERI']==negeri)&(df['DAERAH']==daerah)]
        daerah = df['MUKIM'].unique().tolist()
        return {'result': daerah}
    except Exception as e:
        print(e)
        return {'result': []}

if __name__ == '__main__':
    app.run(debug=True)
