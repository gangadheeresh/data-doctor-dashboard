import re
import sys

path = 'frontend/src/pages/ChartBuilderPage.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

def replacer(match):
    full = match.group(0)
    dark_part = match.group(1)
    light_part = match.group(2)
    
    # Replace slate and white colors in the light part with indigo/violet
    
    # Text
    light_part = light_part.replace('text-slate-500', 'text-indigo-700')
    light_part = light_part.replace('text-slate-600', 'text-indigo-800')
    light_part = light_part.replace('text-slate-700', 'text-indigo-900')
    light_part = light_part.replace('text-slate-800', 'text-indigo-950')
    
    # Borders
    light_part = light_part.replace('border-slate-200', 'border-indigo-300')
    light_part = light_part.replace('border-slate-300', 'border-indigo-400')
    
    # Backgrounds
    light_part = light_part.replace('bg-white', 'bg-indigo-50/80')
    light_part = light_part.replace('bg-slate-50', 'bg-indigo-50/80')
    light_part = light_part.replace('bg-slate-100', 'bg-indigo-100/60')
    light_part = light_part.replace('bg-slate-200', 'bg-indigo-200')
    
    return f'${{isDark?"{dark_part}":"{light_part}"}}'

# We look for ${isDark?"...":"..."}
# regex pattern: \$\{isDark\s*\?\s*"([^"]*)"\s*:\s*"([^"]*)"\}
pattern = re.compile(r'\$\{isDark\s*\?\s*"([^"]*)"\s*:\s*"([^"]*)"\}')
new_content = pattern.sub(replacer, content)

# Also fix standalone isDark ? "text-slate-400" : "text-slate-600" without template literal braces sometimes
# if there are any.

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)
print('Replaced ternary operators!')
