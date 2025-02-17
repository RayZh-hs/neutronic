"""
This script is used to load the premade maps into the database, by registering them in the premade.json file.
"""

import json
import os

currentPath = os.path.dirname(__file__)
targetPath = currentPath + "/../data/maps/base"
savePath = currentPath + "/../data/premade.json"
files = os.listdir(targetPath)

registry = []
for file in files:
    with open(targetPath + "/" + file, "r") as f:
        map = json.load(f)
        registry.append({
            "levelId": map["meta"]["levelId"],
            "levelName": map["meta"]["name"],
            "author": map["meta"]["author"],
        })

print(registry)

with open(savePath, 'w') as f:
    json.dump(registry, f)