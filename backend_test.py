#!/usr/bin/env python3
"""
Backend API Test Suite for Coach IA / ONYX
Tests all API endpoints at http://localhost:3000/api/*
"""

import requests
import json
import base64
import time
from io import BytesIO
from PIL import Image

BASE_URL = "http://localhost:3000/api"

def generate_tiny_jpeg():
    """Generate a 32x32 solid color JPEG image and return base64 string (without data:image prefix)"""
    img = Image.new('RGB', (32, 32), color=(255, 100, 50))  # Orange color
    buffer = BytesIO()
    img.save(buffer, format='JPEG', quality=85)
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode('utf-8')

def test_health():
    """Test GET /api/health"""
    print("\n" + "="*80)
    print("TEST: GET /api/health")
    print("="*80)
    try:
        start = time.time()
        response = requests.get(f"{BASE_URL}/health", timeout=10)
        elapsed = time.time() - start
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Time: {elapsed:.2f}s")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'ok':
                print("✅ PASS: Health check successful")
                return True
            else:
                print("❌ FAIL: Unexpected response structure")
                return False
        else:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAIL: Exception occurred: {str(e)}")
        return False

def test_nutrition_photo_success():
    """Test POST /api/nutrition/photo with valid image (Priority 1)"""
    print("\n" + "="*80)
    print("TEST: POST /api/nutrition/photo (SUCCESS CASE)")
    print("="*80)
    try:
        image_base64 = generate_tiny_jpeg()
        payload = {
            "imageBase64": image_base64,
            "mimeType": "image/jpeg",
            "hint": "poulet et riz"
        }
        
        print(f"Payload: imageBase64 length={len(image_base64)}, mimeType=image/jpeg, hint=poulet et riz")
        
        start = time.time()
        response = requests.post(f"{BASE_URL}/nutrition/photo", json=payload, timeout=90)
        elapsed = time.time() - start
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Time: {elapsed:.2f}s (Gemini calls take 5-30s, this is expected)")
        print(f"Response: {response.text[:500]}...")
        
        if response.status_code == 200:
            data = response.json()
            if 'estimate' in data and 'raw' in data:
                estimate = data['estimate']
                required_keys = ['name', 'aliments_detectes', 'portion', 'calories', 'protein', 'carbs', 'fat', 'confiance', 'note']
                missing_keys = [k for k in required_keys if k not in estimate]
                
                if missing_keys:
                    print(f"❌ FAIL: Missing keys in estimate: {missing_keys}")
                    return False
                
                # Validate aliments_detectes is an array
                if not isinstance(estimate.get('aliments_detectes'), list):
                    print(f"❌ FAIL: aliments_detectes should be an array, got {type(estimate.get('aliments_detectes'))}")
                    return False
                
                print(f"✅ PASS: Response structure valid")
                print(f"  - name: {estimate.get('name')}")
                print(f"  - aliments_detectes: {estimate.get('aliments_detectes')}")
                print(f"  - calories: {estimate.get('calories')}")
                print(f"  - protein: {estimate.get('protein')}g")
                print(f"  - carbs: {estimate.get('carbs')}g")
                print(f"  - fat: {estimate.get('fat')}g")
                print(f"  - confiance: {estimate.get('confiance')}")
                return True
            else:
                print(f"❌ FAIL: Missing 'estimate' or 'raw' in response")
                return False
        else:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAIL: Exception occurred: {str(e)}")
        return False

def test_nutrition_photo_error():
    """Test POST /api/nutrition/photo with empty payload (error path)"""
    print("\n" + "="*80)
    print("TEST: POST /api/nutrition/photo (ERROR CASE - empty payload)")
    print("="*80)
    try:
        payload = {}
        
        start = time.time()
        response = requests.post(f"{BASE_URL}/nutrition/photo", json=payload, timeout=10)
        elapsed = time.time() - start
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Time: {elapsed:.2f}s")
        print(f"Response: {response.text}")
        
        if response.status_code == 400:
            data = response.json()
            if 'error' in data and 'imageBase64 required' in data['error']:
                print("✅ PASS: Error handling works correctly")
                return True
            else:
                print(f"❌ FAIL: Expected error message 'imageBase64 required', got {data}")
                return False
        else:
            print(f"❌ FAIL: Expected 400, got {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAIL: Exception occurred: {str(e)}")
        return False

def test_coach_program_rest_logic():
    """Test POST /api/coach/program with poor recovery (should suggest rest) (Priority 2)"""
    print("\n" + "="*80)
    print("TEST: POST /api/coach/program (POOR RECOVERY - should suggest rest)")
    print("="*80)
    try:
        payload = {
            "sport": "MMA",
            "level": "avance",
            "goals": "combat",
            "envies": "aucune",
            "joints": "aucune",
            "hrv": 35,
            "sleep_hours": 4.5,
            "recovery_score": 25,
            "fatigue": 9,
            "recent_sessions": [
                {"date": "2025-01-20", "type": "seance", "intensite": "forte", "focus": "explosivité", "duree": 90},
                {"date": "2025-01-19", "type": "seance", "intensite": "forte", "focus": "sparring", "duree": 75}
            ]
        }
        
        print(f"Payload: HRV=35 (low), sleep=4.5h (poor), fatigue=9 (high), recovery=25 (low), 2 consecutive strong sessions")
        
        start = time.time()
        response = requests.post(f"{BASE_URL}/coach/program", json=payload, timeout=90)
        elapsed = time.time() - start
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Time: {elapsed:.2f}s (Gemini calls take 5-30s, this is expected)")
        print(f"Response: {response.text[:800]}...")
        
        if response.status_code == 200:
            data = response.json()
            if 'program' in data and 'raw' in data:
                program = data['program']
                required_keys = ['type', 'etirements', 'duree_minutes', 'justification_choix', 'notification']
                missing_keys = [k for k in required_keys if k not in program]
                
                if missing_keys:
                    print(f"❌ FAIL: Missing keys in program: {missing_keys}")
                    return False
                
                # Validate type is likely repos_actif or repos_complet
                program_type = program.get('type')
                print(f"  - type: {program_type}")
                
                if program_type not in ['repos_actif', 'repos_complet', 'seance']:
                    print(f"⚠️  WARNING: Unexpected type '{program_type}', expected repos_actif/repos_complet/seance")
                
                # Check if etirements is non-empty array
                etirements = program.get('etirements')
                if not isinstance(etirements, list):
                    print(f"❌ FAIL: etirements should be an array, got {type(etirements)}")
                    return False
                
                if len(etirements) == 0:
                    print(f"⚠️  WARNING: etirements array is empty")
                
                # Check duree_minutes is a number
                duree = program.get('duree_minutes')
                if not isinstance(duree, (int, float)):
                    print(f"❌ FAIL: duree_minutes should be a number, got {type(duree)}")
                    return False
                
                # Check justification mentions recovery indicators
                justification = program.get('justification_choix', '').lower()
                has_recovery_mention = any(word in justification for word in ['hrv', 'fatigue', 'récup', 'recup', 'sommeil', 'repos'])
                
                print(f"✅ PASS: Response structure valid")
                print(f"  - type: {program_type}")
                print(f"  - etirements count: {len(etirements)}")
                print(f"  - duree_minutes: {duree}")
                print(f"  - justification mentions recovery: {has_recovery_mention}")
                print(f"  - notification: {program.get('notification')}")
                
                if program_type in ['repos_actif', 'repos_complet']:
                    print(f"✅ EXCELLENT: AI correctly suggested rest given poor recovery indicators")
                else:
                    print(f"⚠️  NOTE: AI suggested seance despite poor recovery (HRV=35, fatigue=9, sleep=4.5h)")
                
                return True
            else:
                print(f"❌ FAIL: Missing 'program' or 'raw' in response")
                return False
        else:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAIL: Exception occurred: {str(e)}")
        return False

def test_coach_program_good_recovery():
    """Test POST /api/coach/program with good recovery (should suggest seance) (Priority 2)"""
    print("\n" + "="*80)
    print("TEST: POST /api/coach/program (GOOD RECOVERY - should suggest seance)")
    print("="*80)
    try:
        payload = {
            "sport": "MMA",
            "level": "avance",
            "goals": "combat",
            "envies": "aucune",
            "joints": "aucune",
            "hrv": 75,
            "sleep_hours": 8.5,
            "recovery_score": 85,
            "fatigue": 2,
            "recent_sessions": []
        }
        
        print(f"Payload: HRV=75 (good), sleep=8.5h (good), fatigue=2 (low), recovery=85 (high), no recent sessions")
        
        start = time.time()
        response = requests.post(f"{BASE_URL}/coach/program", json=payload, timeout=90)
        elapsed = time.time() - start
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Time: {elapsed:.2f}s (Gemini calls take 5-30s, this is expected)")
        print(f"Response: {response.text[:800]}...")
        
        if response.status_code == 200:
            data = response.json()
            if 'program' in data:
                program = data['program']
                program_type = program.get('type')
                intensite = program.get('intensite')
                
                print(f"✅ PASS: Response received")
                print(f"  - type: {program_type}")
                print(f"  - intensite: {intensite}")
                
                if program_type == 'seance' and intensite in ['forte', 'modérée']:
                    print(f"✅ EXCELLENT: AI correctly suggested training session given good recovery")
                else:
                    print(f"⚠️  NOTE: AI suggested {program_type} with intensite {intensite} despite good recovery")
                
                return True
            else:
                print(f"❌ FAIL: Missing 'program' in response")
                return False
        else:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAIL: Exception occurred: {str(e)}")
        return False

def test_coach_feedback():
    """Test POST /api/coach/feedback (Priority 3 - regression)"""
    print("\n" + "="*80)
    print("TEST: POST /api/coach/feedback (REGRESSION)")
    print("="*80)
    try:
        payload = {
            "transcript": "Bonne séance aujourd'hui, j'ai bien ressenti le travail sur les frappes. Un peu de fatigue dans les jambes mais rien de grave.",
            "sport": "MMA"
        }
        
        print(f"Payload: transcript='Bonne séance...', sport=MMA")
        
        start = time.time()
        response = requests.post(f"{BASE_URL}/coach/feedback", json=payload, timeout=90)
        elapsed = time.time() - start
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Time: {elapsed:.2f}s")
        print(f"Response: {response.text[:500]}...")
        
        if response.status_code == 200:
            data = response.json()
            if 'feedback' in data:
                print("✅ PASS: Feedback endpoint working")
                return True
            else:
                print(f"❌ FAIL: Missing 'feedback' in response")
                return False
        else:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAIL: Exception occurred: {str(e)}")
        return False

def test_analyze_link():
    """Test POST /api/analyze/link (Priority 3 - regression)"""
    print("\n" + "="*80)
    print("TEST: POST /api/analyze/link (REGRESSION)")
    print("="*80)
    try:
        payload = {
            "url": "https://youtube.com/watch?v=example",
            "description": "circuit pliométrie avec box jumps et burpees",
            "sport": "MMA"
        }
        
        print(f"Payload: url=youtube.com/..., description='circuit pliométrie...', sport=MMA")
        
        start = time.time()
        response = requests.post(f"{BASE_URL}/analyze/link", json=payload, timeout=90)
        elapsed = time.time() - start
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Time: {elapsed:.2f}s")
        print(f"Response: {response.text[:500]}...")
        
        if response.status_code == 200:
            data = response.json()
            if 'analysis' in data:
                print("✅ PASS: Link analysis endpoint working")
                return True
            else:
                print(f"❌ FAIL: Missing 'analysis' in response")
                return False
        else:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAIL: Exception occurred: {str(e)}")
        return False

def test_nutrition_estimate():
    """Test POST /api/nutrition/estimate (Priority 3 - regression)"""
    print("\n" + "="*80)
    print("TEST: POST /api/nutrition/estimate (REGRESSION)")
    print("="*80)
    try:
        payload = {
            "description": "poulet grillé avec riz basmati 400g et légumes verts"
        }
        
        print(f"Payload: description='poulet grillé avec riz...'")
        
        start = time.time()
        response = requests.post(f"{BASE_URL}/nutrition/estimate", json=payload, timeout=90)
        elapsed = time.time() - start
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Time: {elapsed:.2f}s")
        print(f"Response: {response.text[:500]}...")
        
        if response.status_code == 200:
            data = response.json()
            if 'estimate' in data:
                estimate = data['estimate']
                required_keys = ['calories', 'protein', 'carbs', 'fat']
                missing_keys = [k for k in required_keys if k not in estimate]
                
                if missing_keys:
                    print(f"❌ FAIL: Missing keys in estimate: {missing_keys}")
                    return False
                
                print(f"✅ PASS: Nutrition estimate endpoint working")
                print(f"  - calories: {estimate.get('calories')}")
                print(f"  - protein: {estimate.get('protein')}g")
                print(f"  - carbs: {estimate.get('carbs')}g")
                print(f"  - fat: {estimate.get('fat')}g")
                return True
            else:
                print(f"❌ FAIL: Missing 'estimate' in response")
                return False
        else:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAIL: Exception occurred: {str(e)}")
        return False

def main():
    print("\n" + "="*80)
    print("COACH IA / ONYX - BACKEND API TEST SUITE")
    print("Testing against: http://localhost:3000/api")
    print("="*80)
    
    results = {}
    
    # Priority 3: Health check first
    results['health'] = test_health()
    
    # Priority 1: Meal photo endpoint (NEW BUG FIX)
    results['nutrition_photo_success'] = test_nutrition_photo_success()
    results['nutrition_photo_error'] = test_nutrition_photo_error()
    
    # Priority 2: Program endpoint with rest logic
    results['coach_program_rest'] = test_coach_program_rest_logic()
    results['coach_program_good'] = test_coach_program_good_recovery()
    
    # Priority 3: Regression tests
    results['coach_feedback'] = test_coach_feedback()
    results['analyze_link'] = test_analyze_link()
    results['nutrition_estimate'] = test_nutrition_estimate()
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed ({passed*100//total}%)")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        return 1

if __name__ == "__main__":
    exit(main())
