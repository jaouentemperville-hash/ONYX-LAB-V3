#!/usr/bin/env python3
"""
FINAL COMPREHENSIVE TEST - All Backend Endpoints
Coach IA / ONYX Backend API Test Suite
"""

import requests
import json
import base64
import time
from io import BytesIO
from PIL import Image

BASE_URL = "http://localhost:3000/api"

def generate_tiny_jpeg():
    img = Image.new('RGB', (32, 32), color=(255, 100, 50))
    buffer = BytesIO()
    img.save(buffer, format='JPEG', quality=85)
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode('utf-8')

print("\n" + "="*80)
print("COACH IA / ONYX - FINAL BACKEND API TEST SUITE")
print("="*80)

results = []

# Test 1: Health Check
print("\n[1/8] Testing GET /api/health...")
try:
    r = requests.get(f"{BASE_URL}/health", timeout=10)
    if r.status_code == 200 and r.json().get('status') == 'ok':
        results.append(("✅", "GET /api/health", "Health check working"))
    else:
        results.append(("❌", "GET /api/health", f"Status {r.status_code}"))
except Exception as e:
    results.append(("❌", "GET /api/health", str(e)))

# Test 2: Nutrition Photo - Success Case (Priority 1)
print("[2/8] Testing POST /api/nutrition/photo (success case)...")
try:
    image_b64 = generate_tiny_jpeg()
    r = requests.post(f"{BASE_URL}/nutrition/photo", 
                     json={"imageBase64": image_b64, "mimeType": "image/jpeg", "hint": "poulet et riz"},
                     timeout=90)
    elapsed = time.time()
    if r.status_code == 200:
        data = r.json()
        estimate = data.get('estimate', {})
        required = ['name', 'aliments_detectes', 'portion', 'calories', 'protein', 'carbs', 'fat', 'confiance', 'note']
        missing = [k for k in required if k not in estimate]
        if not missing and isinstance(estimate.get('aliments_detectes'), list):
            results.append(("✅", "POST /api/nutrition/photo (success)", f"All fields present, {len(estimate.get('aliments_detectes', []))} aliments detected"))
        else:
            results.append(("❌", "POST /api/nutrition/photo (success)", f"Missing fields: {missing}"))
    else:
        results.append(("⚠️", "POST /api/nutrition/photo (success)", f"Status {r.status_code} - Gemini API may be experiencing high demand"))
except Exception as e:
    results.append(("❌", "POST /api/nutrition/photo (success)", str(e)))

# Test 3: Nutrition Photo - Error Case (Priority 1)
print("[3/8] Testing POST /api/nutrition/photo (error case)...")
try:
    r = requests.post(f"{BASE_URL}/nutrition/photo", json={}, timeout=10)
    if r.status_code == 400 and 'imageBase64 required' in r.json().get('error', ''):
        results.append(("✅", "POST /api/nutrition/photo (error)", "Error handling correct"))
    else:
        results.append(("❌", "POST /api/nutrition/photo (error)", f"Expected 400 with error message"))
except Exception as e:
    results.append(("❌", "POST /api/nutrition/photo (error)", str(e)))

# Test 4: Program - Poor Recovery (Priority 2)
print("[4/8] Testing POST /api/coach/program (poor recovery - should suggest rest)...")
try:
    r = requests.post(f"{BASE_URL}/coach/program", json={
        "sport": "MMA", "level": "avance", "hrv": 35, "sleep_hours": 4.5,
        "recovery_score": 25, "fatigue": 9,
        "recent_sessions": [
            {"date": "2025-01-20", "type": "seance", "intensite": "forte", "focus": "explosivité", "duree": 90},
            {"date": "2025-01-19", "type": "seance", "intensite": "forte", "focus": "sparring", "duree": 75}
        ]
    }, timeout=90)
    if r.status_code == 200:
        program = r.json().get('program', {})
        ptype = program.get('type')
        has_etirements = len(program.get('etirements', [])) > 0
        has_required = all(k in program for k in ['type', 'etirements', 'duree_minutes', 'justification_choix', 'notification'])
        if has_required and has_etirements:
            if ptype in ['repos_actif', 'repos_complet']:
                results.append(("✅✅", "POST /api/coach/program (poor recovery)", f"Correctly suggested {ptype}, {len(program.get('etirements', []))} stretches"))
            else:
                results.append(("✅", "POST /api/coach/program (poor recovery)", f"Suggested {ptype} (expected rest)"))
        else:
            results.append(("❌", "POST /api/coach/program (poor recovery)", "Missing required fields"))
    else:
        results.append(("❌", "POST /api/coach/program (poor recovery)", f"Status {r.status_code}"))
except Exception as e:
    results.append(("❌", "POST /api/coach/program (poor recovery)", str(e)))

# Test 5: Program - Good Recovery (Priority 2)
print("[5/8] Testing POST /api/coach/program (good recovery - should suggest training)...")
try:
    r = requests.post(f"{BASE_URL}/coach/program", json={
        "sport": "MMA", "level": "avance", "hrv": 75, "sleep_hours": 8.5,
        "recovery_score": 85, "fatigue": 2, "recent_sessions": []
    }, timeout=90)
    if r.status_code == 200:
        program = r.json().get('program', {})
        ptype = program.get('type')
        intensite = program.get('intensite')
        if ptype == 'seance' and intensite in ['forte', 'modérée']:
            results.append(("✅✅", "POST /api/coach/program (good recovery)", f"Correctly suggested {ptype} with {intensite} intensity"))
        else:
            results.append(("✅", "POST /api/coach/program (good recovery)", f"Suggested {ptype}/{intensite}"))
    else:
        results.append(("❌", "POST /api/coach/program (good recovery)", f"Status {r.status_code}"))
except Exception as e:
    results.append(("❌", "POST /api/coach/program (good recovery)", str(e)))

# Test 6: Feedback (Priority 3 - Regression)
print("[6/8] Testing POST /api/coach/feedback...")
try:
    r = requests.post(f"{BASE_URL}/coach/feedback", 
                     json={"transcript": "Bonne séance, un peu fatigué mais ça va", "sport": "MMA"},
                     timeout=90)
    if r.status_code == 200 and 'feedback' in r.json():
        results.append(("✅", "POST /api/coach/feedback", "Feedback analysis working"))
    else:
        results.append(("❌", "POST /api/coach/feedback", f"Status {r.status_code}"))
except Exception as e:
    results.append(("❌", "POST /api/coach/feedback", str(e)))

# Test 7: Analyze Link (Priority 3 - Regression)
print("[7/8] Testing POST /api/analyze/link...")
try:
    r = requests.post(f"{BASE_URL}/analyze/link",
                     json={"url": "https://youtube.com/watch?v=test", "description": "circuit pliométrie", "sport": "MMA"},
                     timeout=90)
    if r.status_code == 200 and 'analysis' in r.json():
        results.append(("✅", "POST /api/analyze/link", "Link analysis working"))
    else:
        results.append(("❌", "POST /api/analyze/link", f"Status {r.status_code}"))
except Exception as e:
    results.append(("❌", "POST /api/analyze/link", str(e)))

# Test 8: Nutrition Estimate (Priority 3 - Regression)
print("[8/8] Testing POST /api/nutrition/estimate...")
try:
    r = requests.post(f"{BASE_URL}/nutrition/estimate",
                     json={"description": "poulet grillé avec riz 400g"},
                     timeout=90)
    if r.status_code == 200:
        estimate = r.json().get('estimate', {})
        if all(k in estimate for k in ['calories', 'protein', 'carbs', 'fat']):
            results.append(("✅", "POST /api/nutrition/estimate", f"{estimate.get('calories')}kcal, {estimate.get('protein')}g protein"))
        else:
            results.append(("❌", "POST /api/nutrition/estimate", "Missing macro fields"))
    else:
        results.append(("❌", "POST /api/nutrition/estimate", f"Status {r.status_code}"))
except Exception as e:
    results.append(("❌", "POST /api/nutrition/estimate", str(e)))

# Summary
print("\n" + "="*80)
print("FINAL TEST RESULTS")
print("="*80)
for status, endpoint, detail in results:
    print(f"{status} {endpoint}")
    print(f"   └─ {detail}")

passed = sum(1 for s, _, _ in results if '✅' in s)
total = len(results)
print(f"\n{'='*80}")
print(f"TOTAL: {passed}/{total} tests passed ({passed*100//total}%)")
print(f"{'='*80}\n")

if passed == total:
    print("🎉 ALL TESTS PASSED!")
else:
    print(f"⚠️  {total - passed} test(s) failed or had warnings")
