import unittest
import json
import os
from app import app

class OrbitWatchTestCase(unittest.TestCase):
    def setUp(self):
        os.environ['TESTING'] = 'True'
        self.app = app.test_client()
        self.app.testing = True

    def test_health(self):
        response = self.app.get('/health')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'healthy')

    def test_login(self):
        response = self.app.post('/api/login',
                                 data=json.dumps({'username': 'testuser'}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('session_id', data)

    def test_store_and_get_tle(self):
        # 1. Store TLE
        tle_data = {
            "OBJECT_NAME": "ISS (ZARYA)",
            "NORAD_CAT_ID": 25544,
            "TLE_LINE1": "1 25544U 98067A   21155.50000000  .00001234  00000-0  12345-4 0  9999",
            "TLE_LINE2": "2 25544  51.6416   0.0000 0000000   0.0000   0.0000 15.4888888812345",
            "OWNER": "ISS",
            "OBJECT_TYPE": "PAYLOAD",
            "LAUNCH_DATE": "1998-01-01"
        }
        response = self.app.post('/api/tle',
                                 data=json.dumps(tle_data),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 201)

        # 2. Get TLE
        response = self.app.get('/api/tle?norad_id=25544')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['NORAD_CAT_ID'], 25544)
        self.assertIn('_id', data[0])
        self.assertIn('stored_at', data[0])

if __name__ == '__main__':
    unittest.main()
