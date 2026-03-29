import re
import os

with open("d:/Microsoft_AI_Unlocked/main.py", "r", encoding="utf-8") as f:
    text = f.read()

# Replace get api_verify_stream
new_function_start = """
@app.get("/api/verify/{query_id}")
async def api_verify_stream(request: Request, query_id: str):
    \"\"\"SSE endpoint for streaming verification results.\"\"\"
    last_event_id = request.headers.get("Last-Event-ID")
    last_id = int(last_event_id) if last_event_id and last_event_id.isdigit() else 0

    async def event_generator():
        current_event_id = [0]
        
        async def _sleep(seconds):
            if current_event_id[0] < last_id:
                return
            import asyncio
            await asyncio.sleep(seconds)

        def make_event(event_name, data):
            current_event_id[0] += 1
            return {"event": event_name, "data": json.dumps(data), "id": str(current_event_id[0])}

        def should_skip():
            return current_event_id[0] <= last_id

        # Look up from Cosmos DB query_log collection
"""

text = re.sub(
    r'async def api_verify_stream\(request: Request, query_id: str\):(.*?)# Look up from Cosmos DB query_log collection',
    new_function_start.strip('\n') + '\n        # Look up from Cosmos DB query_log collection',
    text,
    flags=re.DOTALL
)

# Now, replace `yield {"event": "X", "data": json.dumps(Y)}` with `if not should_skip(): yield make_event("X", Y)`
# Wait, this is tricky to do via regex precisely because Y could be a multiline expression
# I'll just rely on replacing `{"event": "X", "data": json.dumps(Y)}` with `make_event("X", Y)` but wait, some are not json.dumps inside the yield
# Best way: write a wrapper for yield

wrapper_setup = """
        async def _internal_generator():
"""

text = text.replace('    async def event_generator():\n        current_event_id = [0]', 
                    '    async def event_generator():\n        current_event_id = [0]\n\n        async def _generate_raw():')

# Indent everything under _generate_raw
lines = text.split('\n')
in_generator = False
for i, line in enumerate(lines):
    if line.strip() == 'async def _generate_raw():':
        in_generator = True
        continue
    if in_generator and line.strip() == 'return EventSourceResponse(event_generator())':
        in_generator = False
        # Insert the yield loop before this line
        yield_loop = """
        async for r_event in _generate_raw():
            current_event_id[0] += 1
            if current_event_id[0] <= last_id:
                continue
            r_event["id"] = str(current_event_id[0])
            yield r_event
"""
        lines.insert(i, yield_loop)
        continue
        
    if in_generator and line.startswith('        '):
        lines[i] = '    ' + line

text = '\n'.join(lines)

# Replace `await asyncio.sleep` with `await _sleep` inside the `_generate_raw` block
# but only the ones introduced there? 
# Easy:
text = text.replace('await asyncio.sleep', 'await _sleep')

with open("d:/Microsoft_AI_Unlocked/main.py", "w", encoding="utf-8") as f:
    f.write(text)
print("done")
