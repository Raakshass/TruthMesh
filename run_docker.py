import subprocess

res = subprocess.run([
    'docker', 'run', '--rm', 
    '-e', 'JWT_SECRET_KEY=e6e02defccba4324f9f743ba20d0e515bb528d22f8de38aada0bf8314e1dca92',
    '-e', 'OPENAI_API_KEY=dummy',
    'ghcr.io/raakshass/truthmesh:latest'
], capture_output=True, text=True)

with open('docker_crash_clean.log', 'w', encoding='utf-8') as f:
    f.write("STDOUT:\n")
    f.write(res.stdout)
    f.write("\nSTDERR:\n")
    f.write(res.stderr)
