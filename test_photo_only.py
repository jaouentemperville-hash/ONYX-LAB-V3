#!/usr/bin/env python3
"""Test only the nutrition photo endpoint"""

import requests
import json
import base64
import time
from io import BytesIO
from PIL import Image

BASE_URL = "http://localhost:3000/api"

def generate_tiny_jpeg():
    """Generate a 32x32 solid color JPEG image"""
    img = Image.new('RGB', (32, 32), color=(255, 100, 50))
    buffer = BytesIO()
    img.save(buffer, format='JPEG', quality=85)
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode('utf-8')

print("Generating tiny JPEG image...")
image_base64 = generate_tiny_jpeg()
print(f"Image base64 length: {len(image_base64)} characters")

payload = {
    "imageBase64": image_base64,
    "mimeType": "image/jpeg",
    "hint": "poulet et riz"
}

print("\nSending POST request to /api/nutrition/photo...")
print("This may take 5-90 seconds (Gemini Vision API call)...")

try:
    start = time.time()
    response = requests.post(f"{BASE_URL}/nutrition/photo", json=payload, timeout=120)
    elapsed = time.time() - start
    
    print(f"\nStatus Code: {response.status_code}")
    print(f"Response Time: {elapsed:.2f}s")
    print(f"\nFull Response:")
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))
    
    if response.status_code == 200:
        data = response.json()
        if 'estimate' in data:
            estimate = data['estimate']
            print("\n✅ Response structure check:")
            for key in ['name', 'aliments_detectes', 'portion', 'calories', 'protein', 'carbs', 'fat', 'confiance', 'note']:
                present = key in estimate
                print(f"  {key}: {'✅' if present else '❌'} {estimate.get(key) if present else 'MISSING'}")
        else:
            print("\n❌ Missing 'estimate' key in response")
    else:
        print(f"\n❌ Unexpected status code: {response.status_code}")
        
except requests.exceptions.Timeout:
    print("\n❌ Request timed out after 120 seconds")
except Exception as e:
    print(f"\n❌ Exception: {str(e)}")
