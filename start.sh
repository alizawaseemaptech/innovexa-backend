set -e
cd "$(dirname "$0")"

echo "=== Innovexa Booking Backend Setup ==="

if ! command -v node &> /dev/null; then
  echo "❌ Node.js is not installed. Download it from https://nodejs.org and try again."
  exit 1
fi
echo "✔ Node.js found: $(node -v)"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "✔ Created .env from .env.example — open it and set your ADMIN_KEY before going live."
else
  echo "✔ .env already exists, leaving it as is."
fi

if [ ! -d node_modules ]; then
  echo "Installing dependencies... (this may take a minute)"
  npm install
else
  echo "✔ Dependencies already installed."
fi

echo ""
echo "Starting server..."
echo ""
npm start
