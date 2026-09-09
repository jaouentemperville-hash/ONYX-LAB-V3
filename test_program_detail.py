#!/usr/bin/env python3
"""Verify program endpoint rest logic in detail"""

import requests
import json
import time

BASE_URL = "http://localhost:3000/api"

print("="*80)
print("TEST: Program endpoint with POOR recovery (should suggest rest)")
print("="*80)

payload_poor = {
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

try:
    response = requests.post(f"{BASE_URL}/coach/program", json=payload_poor, timeout=90)
    if response.status_code == 200:
        data = response.json()
        program = data.get('program', {})
        
        print(f"\n✅ Status: {response.status_code}")
        print(f"\nProgram type: {program.get('type')}")
        print(f"Intensite: {program.get('intensite')}")
        print(f"Focus: {program.get('focus')}")
        print(f"Duree: {program.get('duree_minutes')} minutes")
        print(f"\nJustification: {program.get('justification_choix')}")
        print(f"\nNotification: {program.get('notification')}")
        print(f"\nEtirements count: {len(program.get('etirements', []))}")
        if program.get('etirements'):
            print("First 2 etirements:")
            for e in program.get('etirements', [])[:2]:
                print(f"  - {e}")
        
        # Check if rest logic is working
        if program.get('type') in ['repos_actif', 'repos_complet']:
            print("\n✅✅ EXCELLENT: AI correctly suggested REST given poor recovery!")
        else:
            print("\n⚠️  AI suggested SEANCE despite poor recovery indicators")
            
except Exception as e:
    print(f"❌ Error: {e}")

print("\n" + "="*80)
print("TEST: Program endpoint with GOOD recovery (should suggest seance)")
print("="*80)

payload_good = {
    "sport": "MMA",
    "level": "avance",
    "goals": "combat",
    "hrv": 75,
    "sleep_hours": 8.5,
    "recovery_score": 85,
    "fatigue": 2,
    "recent_sessions": []
}

try:
    response = requests.post(f"{BASE_URL}/coach/program", json=payload_good, timeout=90)
    if response.status_code == 200:
        data = response.json()
        program = data.get('program', {})
        
        print(f"\n✅ Status: {response.status_code}")
        print(f"\nProgram type: {program.get('type')}")
        print(f"Intensite: {program.get('intensite')}")
        print(f"Focus: {program.get('focus')}")
        print(f"Duree: {program.get('duree_minutes')} minutes")
        print(f"\nJustification: {program.get('justification_choix')}")
        
        # Check if training logic is working
        if program.get('type') == 'seance' and program.get('intensite') in ['forte', 'modérée']:
            print("\n✅✅ EXCELLENT: AI correctly suggested TRAINING SESSION given good recovery!")
        else:
            print(f"\n⚠️  AI suggested {program.get('type')} despite good recovery")
            
except Exception as e:
    print(f"❌ Error: {e}")
