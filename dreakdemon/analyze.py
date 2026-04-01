import json
from collections import Counter

d = json.load(open('frontend/public/questions.json'))
p = d['problems']

# Company coverage
companies = Counter()
for prob in p:
    for c in prob['companies']:
        companies[c] += 1

print('=== COMPANY COVERAGE ===')
for c, n in companies.most_common(15):
    print(f'  {c}: {n} questions')

# Topic coverage
topics = Counter()
for prob in p:
    for t in prob['tags']:
        topics[t] += 1

print('\n=== TOPIC COVERAGE ===')
for t, n in topics.most_common(15):
    print(f'  {t}: {n} questions')

# Sample authentic problems
print('\n=== SAMPLE AUTHENTIC PROBLEMS (First 20) ===')
for prob in p[:20]:
    print(f"  [{prob['difficulty']}] {prob['title']}")
    print(f"    Companies: {', '.join(prob['companies'][:5])}")
    print(f"    Topics: {', '.join(prob['tags'])}")
