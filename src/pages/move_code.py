import os

filepath = r"d:\FoodDepartment\frontend\src\pages\ManagementLanding.jsx"
with open(filepath, "r", encoding="utf-8") as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1
insert_idx = -1

for i, line in enumerate(lines):
    if "{/* NEW: MONTHLY EXPENDITURE SUMMARY TABLE CARD */}" in line:
        start_idx = i
    if "{/* CENTER: WASTAGE SUMMARY */}" in line:
        end_idx = i
    if "{/* LEFT: TOP ITEMS TABLE */}" in line:
        insert_idx = i

if start_idx != -1 and end_idx != -1 and insert_idx != -1:
    block = lines[start_idx:end_idx]
    
    # We want to remove lines[start_idx:end_idx] and insert it at insert_idx
    # However, since start_idx > insert_idx, we can remove it first, then insert
    
    del lines[start_idx:end_idx]
    
    for i, line in enumerate(reversed(block)):
        lines.insert(insert_idx, line)
        
    with open(filepath, "w", encoding="utf-8") as f:
        f.writelines(lines)
    print("Successfully moved the block!")
else:
    print("Could not find the indices:", start_idx, end_idx, insert_idx)
