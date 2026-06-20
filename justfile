# https://just.systems

python:
    curl -fsSL https://github.com/kristoff-it/zine/releases/download/v0.11.3/aarch64-linux-musl.tar.xz -o zine.tar.gz
    tar -xvf zine.tar.gz
    chmod +x zine
    ./zine release -f

npm:
    npm install wrangler
    npx wrangler login
    npx wrangler pages deploy public --project-name pratyay --branch main
