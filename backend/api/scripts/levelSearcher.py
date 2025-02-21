"""
This script is used to identify the uuid of all levels that satisfy the given conditions.
"""

import json
import os

path = "/mnt/c/Users/Rayzh/Downloads"

# Change the constraint in this function
def satisfy(map):
    return (
        map["meta"]["name"].lower().find("wheel") != -1
    )

levels = os.listdir(path)
levels = [level for level in levels if level.endswith(".json")]

answer = []

for level in levels:
    with open(path + "/" + level, "r") as f:
        map = json.load(f)
        if satisfy(map):
            answer.append(map["meta"]["levelId"])

print(answer)